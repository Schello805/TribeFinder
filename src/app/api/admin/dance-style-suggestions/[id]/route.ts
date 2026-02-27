import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { z } from "zod";
import { jsonBadRequest, jsonUnauthorized } from "@/lib/apiResponse";

type RouteParams = { params: Promise<{ id: string }> };

const schema = z
  .object({
    action: z.enum(["APPROVE", "REJECT"]),
  })
  .strict();

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonBadRequest("Validierungsfehler", { errors: parsed.error.flatten() });
  }

  try {
    const suggestionDelegate = (prisma as unknown as { danceStyleSuggestion?: unknown }).danceStyleSuggestion as
      | undefined
      | {
          findUnique: (args: unknown) => Promise<
            | {
                id: string;
                name: string;
                status: string;
                category: string | null;
                formerName: string | null;
                websiteUrl: string | null;
                videoUrl: string | null;
                description: string | null;
                styleId: string | null;
              }
            | null
          >;
          update: (args: unknown) => Promise<unknown>;
        };

    if (!suggestionDelegate) {
      return NextResponse.json(
        {
          message:
            "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.",
        },
        { status: 500 }
      );
    }

    const suggestion = await suggestionDelegate.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        category: true,
        formerName: true,
        websiteUrl: true,
        videoUrl: true,
        description: true,
        styleId: true,
      },
    });

    if (!suggestion) {
      return jsonBadRequest("Nicht gefunden");
    }

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

    const asNullableString = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      const s = v.trim();
      return s.length ? s : null;
    };

    const nextCategory = asNullableString(suggestion.category);
    const nextFormerName = asNullableString(suggestion.formerName);
    const nextWebsiteUrl = asNullableString(suggestion.websiteUrl);
    const nextVideoUrl = asNullableString(suggestion.videoUrl);
    const nextDescription = asNullableString(suggestion.description);

    const danceStyleDelegate = (prisma as unknown as { danceStyle?: unknown }).danceStyle as
      | undefined
      | {
          upsert: (args: unknown) => Promise<{ id: string; name: string }>;
          update: (args: unknown) => Promise<{ id: string; name: string }>;
        };

    if (!danceStyleDelegate) {
      return NextResponse.json(
        {
          message:
            "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.",
        },
        { status: 500 }
      );
    }

    const style = suggestion.styleId
      ? await danceStyleDelegate.update({
          where: { id: suggestion.styleId },
          data: {
            category: nextCategory,
            formerName: nextFormerName,
            websiteUrl: nextWebsiteUrl,
            videoUrl: nextVideoUrl,
            description: nextDescription,
          },
          select: { id: true, name: true },
        })
      : await danceStyleDelegate.upsert({
          where: { name: suggestion.name },
          update: {
            category: nextCategory,
            formerName: nextFormerName,
            websiteUrl: nextWebsiteUrl,
            videoUrl: nextVideoUrl,
            description: nextDescription,
          },
          create: {
            name: suggestion.name,
            category: nextCategory,
            formerName: nextFormerName,
            websiteUrl: nextWebsiteUrl,
            videoUrl: nextVideoUrl,
            description: nextDescription,
          },
          select: { id: true, name: true },
        });

    const updated = (await suggestionDelegate.update({
      where: { id },
      data: {
        status: "APPROVED",
        decidedAt: now,
        decidedByAdminId: session.user.id,
        approvedStyleId: style.id,
      },
      select: {
        id: true,
        status: true,
        decidedAt: true,
        approvedStyle: { select: { id: true, name: true } },
      },
    })) as unknown as { id: string; status: string; decidedAt: Date | null; approvedStyle: { id: string; name: string } | null };

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
