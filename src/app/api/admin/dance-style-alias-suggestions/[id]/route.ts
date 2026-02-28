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
    const suggestionDelegate = (prisma as unknown as { danceStyleAliasSuggestion?: unknown }).danceStyleAliasSuggestion as
      | undefined
      | {
          findUnique: (args: unknown) => Promise<
            | {
                id: string;
                aliasName: string;
                styleId: string;
                status: string;
              }
            | null
          >;
          update: (args: unknown) => Promise<unknown>;
        };

    const aliasDelegate = (prisma as unknown as { danceStyleAlias?: unknown }).danceStyleAlias as
      | undefined
      | {
          upsert: (args: unknown) => Promise<{ id: string; name: string; styleId: string }>;
        };

    if (!suggestionDelegate || !aliasDelegate) {
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
      select: { id: true, aliasName: true, styleId: true, status: true },
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

    const aliasName = (suggestion.aliasName || "").trim();
    if (!aliasName) {
      return jsonBadRequest("Alias-Name fehlt");
    }

    await aliasDelegate.upsert({
      where: { name: aliasName },
      update: { styleId: suggestion.styleId },
      create: { name: aliasName, styleId: suggestion.styleId },
      select: { id: true, name: true, styleId: true },
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
