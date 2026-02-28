import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const schema = z
  .object({
    aliasName: z.string().trim().min(2).max(80),
    styleId: z.string().trim().min(1),
    sourceUrl: z.string().trim().url().optional().or(z.literal("")),
    comment: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .strict();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  const user = await prisma.user
    .findUnique({ where: { id: session.user.id }, select: { emailVerified: true } })
    .catch(() => null);
  if (!user?.emailVerified) {
    return NextResponse.json({ message: "Bitte bestätige zuerst deine E-Mail-Adresse." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validierungsfehler", errors: parsed.error.flatten() }, { status: 400 });
  }

  const aliasName = parsed.data.aliasName.trim();

  try {
    const aliasDelegate = (prisma as unknown as { danceStyleAlias?: unknown }).danceStyleAlias as
      | undefined
      | {
          findUnique: (args: unknown) => Promise<{ name: string; styleId: string } | null>;
        };

    const suggestionDelegate = (prisma as unknown as { danceStyleAliasSuggestion?: unknown }).danceStyleAliasSuggestion as
      | undefined
      | {
          create: (args: unknown) => Promise<{ id: string; status: string; createdAt: Date }>;
        };

    if (!aliasDelegate || !suggestionDelegate) {
      return NextResponse.json(
        {
          message:
            "Server ist nicht aktuell (Prisma Client). Bitte `npm run db:generate` ausführen und den Server neu starten.",
        },
        { status: 500 }
      );
    }

    const existingAlias = await aliasDelegate.findUnique({
      where: { name: aliasName },
      select: { name: true, styleId: true },
    });

    if (existingAlias?.styleId === parsed.data.styleId) {
      return NextResponse.json({ message: "Alias ist bereits vorhanden." }, { status: 200 });
    }

    const created = await suggestionDelegate.create({
      data: {
        aliasName,
        styleId: parsed.data.styleId,
        sourceUrl: parsed.data.sourceUrl ? parsed.data.sourceUrl : null,
        comment: parsed.data.comment ? parsed.data.comment : null,
        createdById: session.user.id,
      },
      select: { id: true, status: true, createdAt: true },
    });

    return NextResponse.json(
      { ...created, createdAt: created.createdAt.toISOString() },
      { status: 201 }
    );
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "P2002") {
      return NextResponse.json({ message: "Dieser Alias-Vorschlag existiert bereits." }, { status: 409 });
    }
    if (err?.code === "P2021" || err?.code === "P2022") {
      return NextResponse.json(
        {
          message:
            "Server-Datenbank ist noch nicht auf dem neuesten Stand (Migration fehlt). Bitte Migrationen ausführen und erneut versuchen.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ message: err?.message || "Fehler beim Speichern" }, { status: 500 });
  }
}
