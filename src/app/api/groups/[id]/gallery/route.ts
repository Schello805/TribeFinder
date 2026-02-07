import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

async function canEditGroup(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { ownerId: true } });
  if (!group) return { ok: false, status: 404 as const, message: "Gruppe nicht gefunden" };
  if (group.ownerId === userId) return { ok: true, status: 200 as const, message: "" };

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { role: true, status: true },
  });

  if (!membership || membership.role !== "ADMIN" || membership.status !== "APPROVED") {
    return { ok: false, status: 403 as const, message: "Nur Administratoren können die Galerie bearbeiten" };
  }

  return { ok: true, status: 200 as const, message: "" };
}

const addSchema = z.object({
  url: z.string().min(1),
  caption: z.string().optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const groupId = (await params).id;

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { id: true } });
  if (!group) return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });

  const images = await prisma.galleryImage.findMany({
    where: { groupId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, url: true, caption: true, order: true },
  });

  return NextResponse.json({ images });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  const groupId = (await params).id;
  if (session.user.role !== "ADMIN") {
    const permission = await canEditGroup(groupId, session.user.id);
    if (!permission.ok) return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { id: true } });
  if (!group) return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validierungsfehler", errors: parsed.error.flatten() }, { status: 400 });
  }

  const count = await prisma.galleryImage.count({ where: { groupId } });
  if (count >= 5) {
    return NextResponse.json({ message: "Maximal 5 Bilder erlaubt" }, { status: 400 });
  }

  const created = await prisma.galleryImage.create({
    data: {
      groupId,
      url: parsed.data.url,
      caption: parsed.data.caption ?? null,
      order: count,
    },
    select: { id: true, url: true, caption: true, order: true },
  });

  return NextResponse.json(created, { status: 201 });
}
