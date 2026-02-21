import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteUploadByPublicUrl } from "@/lib/uploadFiles";

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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const { id: groupId, imageId } = await params;

  if (session.user.role !== "ADMIN") {
    const permission = await canEditGroup(groupId, session.user.id);
    if (!permission.ok) return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  const existing = await prisma.galleryImage.findFirst({ where: { id: imageId, groupId } });
  if (!existing) return NextResponse.json({ message: "Nicht gefunden" }, { status: 404 });

  await prisma.galleryImage.delete({ where: { id: imageId } });

  await deleteUploadByPublicUrl(existing.url).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
