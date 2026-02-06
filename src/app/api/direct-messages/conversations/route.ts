import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const userId = session.user.id;

  const lastMessages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      content: true,
      createdAt: true,
      sender: { select: { id: true, name: true, image: true } },
      receiver: { select: { id: true, name: true, image: true } },
    },
  });

  const seen = new Set<string>();
  const conversations: Array<{
    otherUser: { id: string; name: string | null; image: string | null };
    lastMessage: { id: string; content: string; createdAt: Date; isMe: boolean };
  }> = [];

  for (const m of lastMessages) {
    const other = m.senderId === userId ? m.receiver : m.sender;
    if (!other) continue;
    if (seen.has(other.id)) continue;
    seen.add(other.id);

    conversations.push({
      otherUser: other,
      lastMessage: { id: m.id, content: m.content, createdAt: m.createdAt, isMe: m.senderId === userId },
    });
  }

  return NextResponse.json({ conversations });
}
