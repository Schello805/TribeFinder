import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  const { id } = await params;
  const group = await prisma.group.findUnique({ where: { id }, select: { ownerId: true } });
  if (!group) return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });

  let allowed = session.user.role === "ADMIN" || group.ownerId === session.user.id;
  if (!allowed) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: session.user.id, groupId: id } },
      select: { role: true, status: true },
    });
    allowed = membership?.role === "ADMIN" && membership.status === "APPROVED";
  }
  if (!allowed) return NextResponse.json({ message: "Keine Berechtigung" }, { status: 403 });

  const updated = await prisma.group.update({
    where: { id },
    data: { profileVerifiedAt: new Date() },
    select: { profileVerifiedAt: true },
  });
  return NextResponse.json(updated);
}
