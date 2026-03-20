import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonUnauthorized } from "@/lib/apiResponse";
import { z } from "zod";
import { geocodeByCountry } from "@/lib/geocode";
import { isValidGermanCountryName } from "@/lib/countries";

type ExternalLinkAdminRow = {
  id: string;
  url: string;
  title: string;
  category: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  locationSource: string | null;
  status: string;
  submittedBy: { id: string; email: string; name: string | null };
  approvedBy: { id: string; email: string; name: string | null } | null;
  lastCheckedAt: Date | null;
  lastStatusCode: number | null;
  consecutiveFailures: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function getExternalLinkDelegate(p: typeof prisma) {
  return (p as unknown as { externalLink?: unknown }).externalLink as
    | undefined
    | {
        findMany: (args: unknown) => Promise<ExternalLinkAdminRow[]>;
        count: (args: unknown) => Promise<number>;
        update: (args: unknown) => Promise<unknown>;
      };
}

function getCategoryDelegate(p: typeof prisma) {
  return (p as unknown as { externalLinkCategory?: unknown }).externalLinkCategory as
    | undefined
    | {
        findUnique: (args: unknown) => Promise<{ id: string; name: string } | null>;
      };
}

const createSchema = z.object({
  url: z.string().trim().url().max(500),
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(40).nullable().optional(),
  postalCode: z.string().trim().regex(/^\d{5}$/).nullable().optional(),
  city: z.string().trim().min(2).max(80).nullable().optional(),
  country: z
    .string()
    .trim()
    .min(2)
    .nullable()
    .optional()
    .refine((v) => (v == null ? true : isValidGermanCountryName(v)), "Unbekanntes Land"),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "OFFLINE"]).optional(),
});

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const delegate = getExternalLinkDelegate(prisma);
  const categoryDelegate = getCategoryDelegate(prisma);
  if (!delegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
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

  const postalCode = parsed.data.postalCode ?? null;
  const city = parsed.data.city ?? null;
  const country = (parsed.data.country || "Deutschland").trim() || "Deutschland";

  // If no location is provided, avoid creating duplicate entries for the same website.
  if (!postalCode && !city) {
    const existingNoLocation = await delegate.count({ where: { url: parsed.data.url, postalCode: null, city: null } });
    if (existingNoLocation > 0) {
      return NextResponse.json(
        {
          message:
            "Dieser Link existiert bereits (ohne Standort). Bitte gib PLZ/Ort an, wenn du einen weiteren Standort hinzufügen möchtest.",
        },
        { status: 409 }
      );
    }
  }

  let lat: number | null = null;
  let lng: number | null = null;
  let locationSource: "GEOCODE" | null = null;

  if (postalCode || city) {
    try {
      const r = await geocodeByCountry(`${postalCode ?? ""} ${city ?? ""}`.trim(), country);
      if (r) {
        lat = r.lat;
        lng = r.lng;
        locationSource = "GEOCODE";
      }
    } catch {
      // ignore (best-effort)
    }
  }

  try {
    const createDelegate = delegate as unknown as {
      create: (args: unknown) => Promise<{ id: string }>;
    };

    const created = await createDelegate.create({
      data: {
        url: parsed.data.url,
        title: parsed.data.title,
        category: categoryName || null,
        postalCode,
        city,
        country,
        lat,
        lng,
        locationSource,
        status: parsed.data.status || "APPROVED",
        submittedById: session.user.id,
        approvedById: session.user.id,
        archivedAt: null,
        consecutiveFailures: 0,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
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

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const delegate = getExternalLinkDelegate(prisma);
  if (!delegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "").trim().toUpperCase();

  const where: { status?: string } = {};
  if (status) where.status = status;

  const items = await delegate.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      url: true,
      title: true,
      category: true,
      postalCode: true,
      city: true,
      country: true,
      lat: true,
      lng: true,
      locationSource: true,
      status: true,
      submittedBy: { select: { id: true, email: true, name: true } },
      approvedBy: { select: { id: true, email: true, name: true } },
      lastCheckedAt: true,
      lastStatusCode: true,
      consecutiveFailures: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 500,
  });

  return NextResponse.json(
    items.map((x: ExternalLinkAdminRow) => ({
      ...x,
      lastCheckedAt: x.lastCheckedAt ? x.lastCheckedAt.toISOString() : null,
      archivedAt: x.archivedAt ? x.archivedAt.toISOString() : null,
      createdAt: x.createdAt.toISOString(),
      updatedAt: x.updatedAt.toISOString(),
    }))
  );
}

const patchSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "ARCHIVE", "UNARCHIVE"]),
  id: z.string().min(1),
});

export async function PATCH(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const delegate = getExternalLinkDelegate(prisma);
  if (!delegate) {
    return NextResponse.json(
      { message: "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validierungsfehler", errors: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();

  if (parsed.data.action === "APPROVE") {
    await delegate.update({
      where: { id: parsed.data.id },
      data: { status: "APPROVED", approvedById: session.user.id, archivedAt: null, consecutiveFailures: 0 },
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "REJECT") {
    await delegate.update({
      where: { id: parsed.data.id },
      data: { status: "REJECTED", approvedById: session.user.id },
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "ARCHIVE") {
    await delegate.update({
      where: { id: parsed.data.id },
      data: { status: "OFFLINE", archivedAt: now },
    });
    return NextResponse.json({ ok: true });
  }

  await delegate.update({
    where: { id: parsed.data.id },
    data: { status: "APPROVED", archivedAt: null, consecutiveFailures: 0 },
  });
  return NextResponse.json({ ok: true });
}
