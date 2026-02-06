import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ otherUserId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const userId = session.user.id;
  const otherUserId = (await params).otherUserId;

  if (!otherUserId || otherUserId === userId) {
    return NextResponse.json({ message: "Ungültiger Thread" }, { status: 400 });
  }

  const other = await prisma.user.findUnique({ where: { id: otherUserId }, select: { id: true, name: true, image: true, isBlocked: true } });
  if (!other || other.isBlocked) return NextResponse.json({ message: "User nicht gefunden" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      content: true,
      createdAt: true,
    },
  });

  await prisma.message.updateMany({
    where: { senderId: otherUserId, receiverId: userId, read: false },
    data: { read: true },
  });

  return NextResponse.json({ otherUser: { id: other.id, name: other.name, image: other.image }, messages });
}
