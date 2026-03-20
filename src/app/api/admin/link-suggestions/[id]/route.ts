import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonUnauthorized } from "@/lib/apiResponse";
import { z } from "zod";
import { geocodeByCountry } from "@/lib/geocode";

type RouteParams = { params: Promise<{ id: string }> };

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
});

function getSuggestionDelegate(p: typeof prisma) {
  return (p as unknown as { externalLinkSuggestion?: unknown }).externalLinkSuggestion as
    | undefined
    | {
        findUnique: (args: unknown) => Promise<{
          id: string;
          status: string;
          linkId: string;
          url: string;
          title: string;
          category: string | null;
          postalCode: string | null;
          city: string | null;
          country: string | null;
        } | null>;
        update: (args: unknown) => Promise<unknown>;
      };
}

function getLinkDelegate(p: typeof prisma) {
  return (p as unknown as { externalLink?: unknown }).externalLink as
    | undefined
    | {
        update: (args: unknown) => Promise<unknown>;
      };
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonBadRequest("Validierungsfehler", { errors: parsed.error.flatten() });
  }

  const suggestionDelegate = getSuggestionDelegate(prisma);
  const linkDelegate = getLinkDelegate(prisma);

  if (!suggestionDelegate || !linkDelegate) {
    return NextResponse.json(
      {
        message:
          "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.",
      },
      { status: 500 }
    );
  }

  try {
    const suggestion = await suggestionDelegate.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        linkId: true,
        url: true,
        title: true,
        category: true,
        postalCode: true,
        city: true,
        country: true,
      },
    });

    if (!suggestion) return jsonBadRequest("Nicht gefunden");

    const now = new Date();

    if (parsed.data.action === "REJECT") {
      const updated = (await suggestionDelegate.update({
        where: { id },
        data: {
          status: "REJECTED",
          decidedAt: now,
          decidedByAdminId: session.user.id,
        },
        select: { id: true, status: true, decidedAt: true },
      })) as unknown as { id: string; status: string; decidedAt: Date | null };

      return NextResponse.json({
        ...updated,
        decidedAt: updated.decidedAt ? updated.decidedAt.toISOString() : null,
      });
    }

    let lat: number | null = null;
    let lng: number | null = null;
    let locationSource: "GEOCODE" | null = null;

    const nextCountry = (suggestion.country || "Deutschland").trim() || "Deutschland";

    if (suggestion.postalCode || suggestion.city) {
      try {
        const r = await geocodeByCountry(`${suggestion.postalCode ?? ""} ${suggestion.city ?? ""}`.trim(), nextCountry);
        if (r) {
          lat = r.lat;
          lng = r.lng;
          locationSource = "GEOCODE";
        }
      } catch {
        // ignore (best-effort)
      }
    }

    await linkDelegate.update({
      where: { id: suggestion.linkId },
      data: {
        url: suggestion.url,
        title: suggestion.title,
        category: suggestion.category,
        postalCode: suggestion.postalCode,
        city: suggestion.city,
        country: suggestion.country,
        lat,
        lng,
        locationSource,
        status: "APPROVED",
        approvedById: session.user.id,
        archivedAt: null,
        consecutiveFailures: 0,
      },
    });

    const updated = (await suggestionDelegate.update({
      where: { id },
      data: {
        status: "APPROVED",
        decidedAt: now,
        decidedByAdminId: session.user.id,
      },
      select: { id: true, status: true, decidedAt: true },
    })) as unknown as { id: string; status: string; decidedAt: Date | null };

    return NextResponse.json({
      ...updated,
      decidedAt: updated.decidedAt ? updated.decidedAt.toISOString() : null,
    });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "P2021" || err?.code === "P2022") {
      return NextResponse.json(
        {
          message:
            "Server-Datenbank ist noch nicht auf dem neuesten Stand (Migration fehlt). Bitte Migrationen ausführen und erneut versuchen.",
        },
        { status: 503 }
      );
    }
    return jsonBadRequest(err?.message || "Fehler");
  }
}
