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
  const existing = await prisma.danceStyle.count();
  if (existing > 0) return;

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
        "Tribal Fusion",
        "ATS / FCBD Style",
        "Tribal",
        "Folklore (Orient)",
        "Drum Solo",
        "Fusion",
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
}

export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  await ensureDanceStylesSeeded();

  const [available, selected] = await Promise.all([
    prisma.danceStyle.findMany({ orderBy: { name: "asc" } }),
    prisma.userDanceStyle.findMany({
      where: { userId: session.user.id },
      include: { style: true },
      orderBy: { style: { name: "asc" } },
    }),
  ]);

  return NextResponse.json({ available, selected });
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

  const existing = await prisma.userDanceStyle.findFirst({
    where: { id: userStyleId, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ message: "Nicht gefunden" }, { status: 404 });
  }

  const updated = await prisma.userDanceStyle.update({
    where: { id: userStyleId },
    data: { level },
    include: { style: true },
  });

  return NextResponse.json(updated);
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

  const existing = await prisma.userDanceStyle.findFirst({
    where: { id: userStyleId, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ message: "Nicht gefunden" }, { status: 404 });
  }

  await prisma.userDanceStyle.delete({
    where: { id: userStyleId },
  });

  return NextResponse.json({ ok: true });
}
