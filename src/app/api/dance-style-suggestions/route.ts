import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { notifyAdminsAboutNewDanceStyleSuggestion } from "@/lib/notifications";

const schema = z.object({
  name: z.string().trim().min(2).max(200),
  category: z.string().trim().min(2).max(200).nullable().optional(),
  formerName: z.string().trim().min(2).max(200).nullable().optional(),
  websiteUrl: z.string().trim().url().nullable().optional(),
  videoUrl: z.string().trim().url().nullable().optional(),
  description: z.string().trim().min(2).max(2000).nullable().optional(),
  styleId: z.string().trim().min(1).max(200).nullable().optional(),
});

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
    return NextResponse.json(
      { message: "Validierungsfehler", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, category, formerName, websiteUrl, videoUrl, description, styleId } = parsed.data;

  try {
    const suggestionDelegate = (prisma as unknown as { danceStyleSuggestion?: unknown }).danceStyleSuggestion as
      | undefined
      | {
          create: (args: unknown) => Promise<{
            id: string;
            name: string;
            status: string;
            createdAt: Date;
          }>;
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

    const created = await suggestionDelegate.create({
      data: {
        name,
        category: category ?? null,
        formerName: formerName ?? null,
        websiteUrl: websiteUrl ?? null,
        videoUrl: videoUrl ?? null,
        description: description ?? null,
        styleId: styleId ?? null,
        createdById: session.user.id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });

    await notifyAdminsAboutNewDanceStyleSuggestion(name, session.user.name || session.user.email || "Unbekannt");

    return NextResponse.json(
      {
        ...created,
        createdAt: created.createdAt.toISOString(),
      },
      { status: 201 }
    );
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
    return NextResponse.json({ message: "Fehler beim Speichern" }, { status: 500 });
  }
}
