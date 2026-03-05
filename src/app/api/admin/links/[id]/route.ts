import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonUnauthorized } from "@/lib/apiResponse";
import { z } from "zod";
import { geocodeGermany } from "@/lib/geocode";

type RouteParams = { params: Promise<{ id: string }> };

function getExternalLinkDelegate(p: typeof prisma) {
  return (p as unknown as { externalLink?: unknown }).externalLink as
    | undefined
    | {
        findUnique: (args: unknown) => Promise<{
          id: string;
          postalCode: string | null;
          city: string | null;
          approvedById: string | null;
          submittedById: string;
          status: string;
          archivedAt: Date | null;
        } | null>;
        update: (args: unknown) => Promise<unknown>;
        delete: (args: unknown) => Promise<unknown>;
      };
}

function getCategoryDelegate(p: typeof prisma) {
  return (p as unknown as { externalLinkCategory?: unknown }).externalLinkCategory as
    | undefined
    | {
        findUnique: (args: unknown) => Promise<{ id: string; name: string } | null>;
      };
}

const updateSchema = z.object({
  url: z.string().trim().url().max(500).optional(),
  title: z.string().trim().min(2).max(120).optional(),
  category: z.string().trim().min(2).max(40).nullable().optional(),
  postalCode: z.string().trim().regex(/^\d{5}$/).nullable().optional(),
  city: z.string().trim().min(2).max(80).nullable().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "OFFLINE"]).optional(),
  archivedAt: z.enum(["SET", "CLEAR"]).optional(),
});

export async function PUT(req: Request, { params }: RouteParams) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id } = await params;

  const delegate = getExternalLinkDelegate(prisma);
  const categoryDelegate = getCategoryDelegate(prisma);
  if (!delegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validierungsfehler", errors: parsed.error.flatten() }, { status: 400 });
  }

  const categoryName = typeof parsed.data.category === "string" ? parsed.data.category.trim() : "";
  if (categoryName) {
    if (!categoryDelegate) {
      return NextResponse.json(
        { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
        { status: 500 }
      );
    }
    const cat = await categoryDelegate.findUnique({ where: { name: categoryName }, select: { id: true, name: true } });
    if (!cat) {
      return NextResponse.json({ message: "Unbekannte Kategorie. Bitte zuerst anlegen." }, { status: 400 });
    }
  }

  const existing = await delegate.findUnique({
    where: { id },
    select: { id: true, postalCode: true, city: true, approvedById: true, submittedById: true, status: true, archivedAt: true },
  });

  if (!existing) return NextResponse.json({ message: "Nicht gefunden" }, { status: 404 });

  const nextPostalCode = typeof parsed.data.postalCode !== "undefined" ? parsed.data.postalCode : existing.postalCode;
  const nextCity = typeof parsed.data.city !== "undefined" ? parsed.data.city : existing.city;

  let lat: number | null | undefined = undefined;
  let lng: number | null | undefined = undefined;
  let locationSource: "GEOCODE" | null | undefined = undefined;

  if (typeof parsed.data.postalCode !== "undefined" || typeof parsed.data.city !== "undefined") {
    if (nextPostalCode || nextCity) {
      try {
        const r = await geocodeGermany(`${nextPostalCode ?? ""} ${nextCity ?? ""}`.trim());
        if (r) {
          lat = r.lat;
          lng = r.lng;
          locationSource = "GEOCODE";
        } else {
          lat = null;
          lng = null;
          locationSource = null;
        }
      } catch {
        lat = null;
        lng = null;
        locationSource = null;
      }
    } else {
      lat = null;
      lng = null;
      locationSource = null;
    }
  }

  const now = new Date();

  try {
    await delegate.update({
      where: { id },
      data: {
        url: typeof parsed.data.url === "string" ? parsed.data.url : undefined,
        title: typeof parsed.data.title === "string" ? parsed.data.title : undefined,
        category: typeof parsed.data.category !== "undefined" ? categoryName || null : undefined,
        postalCode: typeof parsed.data.postalCode !== "undefined" ? parsed.data.postalCode : undefined,
        city: typeof parsed.data.city !== "undefined" ? parsed.data.city : undefined,
        lat,
        lng,
        locationSource,
        status: parsed.data.status,
        archivedAt: parsed.data.archivedAt === "SET" ? now : parsed.data.archivedAt === "CLEAR" ? null : undefined,
        approvedById: existing.approvedById || session.user.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const err = error as { code?: string };
    if (err?.code === "P2002") {
      return NextResponse.json(
        {
          message:
            "Dieser Link existiert für diesen Standort bereits. Du kannst dieselbe Website für andere Orte/PLZ erneut anlegen.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: "Konnte nicht gespeichert werden" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id } = await params;

  const delegate = getExternalLinkDelegate(prisma);
  if (!delegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  await delegate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
