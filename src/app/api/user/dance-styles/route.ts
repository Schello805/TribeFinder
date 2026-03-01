import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const LevelSchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"]);

const addSchema = z.object({
  styleId: z.string().min(1),
  level: LevelSchema.default("BEGINNER"),
});

const updateSchema = z.object({
  userStyleId: z.string().min(1),
  level: LevelSchema,
});

const removeSchema = z.object({
  userStyleId: z.string().min(1),
});

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session;
}

async function ensureDanceStylesSeeded() {
  try {
    const seededFlag = await prisma.systemSetting
      .findUnique({ where: { key: "danceStylesSeeded" }, select: { value: true } })
      .catch(() => null);
    if (seededFlag?.value === "true") return;

    const existing = await prisma.danceStyle.count();
    if (existing > 0) {
      await prisma.systemSetting.upsert({
        where: { key: "danceStylesSeeded" },
        update: { value: "true" },
        create: { key: "danceStylesSeeded", value: "true" },
      });
      return;
    }

    const tags = await prisma.tag.findMany({
      where: { isApproved: true },
      select: { name: true },
      orderBy: { name: "asc" },
    });

    const names = tags.length
      ? tags.map((t) => t.name)
      : [
          "Orientalischer Tanz",
          "Bauchtanz",
          "Oriental Fusion",
          "Tribal Fusion",
          "ATS / FCBD Style",
          "Tribal",
          "Folklore (Orient)",
          "Drum Solo",
          "Fusion",
          "Fantasy",
        ];

    await prisma.$transaction(
      names.map((name) =>
        prisma.danceStyle.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    );

    await prisma.systemSetting.upsert({
      where: { key: "danceStylesSeeded" },
      update: { value: "true" },
      create: { key: "danceStylesSeeded", value: "true" },
    });
  } catch {
    // best-effort only (z.B. wenn Tabellen/Migrationen noch fehlen)
  }
}

export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  try {
    await ensureDanceStylesSeeded();

    const danceStyleDelegate = (prisma as unknown as {
      danceStyle: { findMany: (args: unknown) => Promise<unknown> };
    }).danceStyle;

    const userDanceStyleDelegate = (prisma as unknown as {
      userDanceStyle: { findMany: (args: unknown) => Promise<unknown> };
    }).userDanceStyle;

    const [available, selected] = await Promise.all([
      danceStyleDelegate.findMany({
        orderBy: { name: "asc" },
        include: { aliases: { select: { name: true }, orderBy: { name: "asc" } } },
      }) as Promise<unknown>,
      userDanceStyleDelegate.findMany({
        where: { userId: session.user.id },
        include: { style: { include: { aliases: { select: { name: true }, orderBy: { name: "asc" } } } } },
        orderBy: { style: { name: "asc" } },
      }) as Promise<unknown>,
    ]);

    return NextResponse.json({ available, selected });
  } catch (error) {
    const err = error as { code?: string; message?: string };

    // Wenn die DB noch nicht migriert ist: UI soll nicht kaputt gehen.
    if (err?.code === "P2021" || err?.code === "P2022") {
      return NextResponse.json(
        {
          available: [],
          selected: [],
          message: "Tanzstile sind auf dem Server noch nicht verfügbar (Migration fehlt).",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "Fehler beim Laden der Tanzstile" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validierungsfehler", errors: parsed.error.flatten() }, { status: 400 });
  }

  const { styleId, level } = parsed.data;

  try {
    const existing = await prisma.userDanceStyle.findFirst({
      where: { userId: session.user.id, styleId },
      include: { style: true },
    });

    if (existing) {
      const updated = await prisma.userDanceStyle.update({
        where: { id: existing.id },
        data: { level },
        include: { style: true },
      });
      return NextResponse.json(updated, { status: 200 });
    }

    const created = await prisma.userDanceStyle.create({
      data: {
        userId: session.user.id,
        styleId,
        level,
      },
      include: { style: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "P2021" || err?.code === "P2022") {
      return NextResponse.json(
        {
          error:
            "Server-Datenbank ist noch nicht auf dem neuesten Stand (Migration fehlt). Bitte Migrationen ausführen und erneut versuchen.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Konnte Tanzstil nicht hinzufügen", details: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validierungsfehler", errors: parsed.error.flatten() }, { status: 400 });
  }

  const { userStyleId, level } = parsed.data;

  let existing: { id: string } | null = null;
  try {
    existing = await prisma.userDanceStyle.findFirst({
      where: { id: userStyleId, userId: session.user.id },
      select: { id: true },
    });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "P2021" || err?.code === "P2022") {
      return NextResponse.json(
        {
          error:
            "Server-Datenbank ist noch nicht auf dem neuesten Stand (Migration fehlt). Bitte Migrationen ausführen und erneut versuchen.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Fehler beim Speichern" },
      { status: 500 }
    );
  }

  if (!existing) {
    return NextResponse.json({ message: "Nicht gefunden" }, { status: 404 });
  }

  try {
    const updated = await prisma.userDanceStyle.update({
      where: { id: userStyleId },
      data: { level },
      include: { style: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "P2021" || err?.code === "P2022") {
      return NextResponse.json(
        {
          error:
            "Server-Datenbank ist noch nicht auf dem neuesten Stand (Migration fehlt). Bitte Migrationen ausführen und erneut versuchen.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Fehler beim Speichern" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validierungsfehler", errors: parsed.error.flatten() }, { status: 400 });
  }

  const { userStyleId } = parsed.data;

  let existing: { id: string } | null = null;
  try {
    existing = await prisma.userDanceStyle.findFirst({
      where: { id: userStyleId, userId: session.user.id },
      select: { id: true },
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
    return NextResponse.json({ message: "Fehler beim Entfernen" }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ message: "Nicht gefunden" }, { status: 404 });
  }

  try {
    await prisma.userDanceStyle.delete({
      where: { id: userStyleId },
    });

    return NextResponse.json({ ok: true });
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
    return NextResponse.json(
      { message: "Fehler beim Entfernen" },
      { status: 500 }
    );
  }
}
