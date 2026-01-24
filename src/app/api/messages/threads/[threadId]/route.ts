import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function canAccessThread(userId: string, threadId: string) {
  const thread = await prisma.groupThread.findUnique({
    where: { id: threadId },
    select: { id: true, groupId: true, createdByUserId: true },
  });

  if (!thread) return { ok: false as const, thread: null };

  if (thread.createdByUserId === userId) return { ok: true as const, thread };

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: thread.groupId } },
    select: { status: true },
  });

  if (member?.status === "APPROVED") return { ok: true as const, thread };

  return { ok: false as const, thread };
}

export async function GET(req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await getServerSession(authOptions);
  const threadId = (await params).threadId;

  if (!session?.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  const access = await canAccessThread(session.user.id, threadId);
  if (!access.thread) {
    return NextResponse.json({ message: "Thread nicht gefunden" }, { status: 404 });
  }
  if (!access.ok) {
    return NextResponse.json({ message: "Kein Zugriff" }, { status: 403 });
  }

  const thread = await prisma.groupThread.findUnique({
    where: { id: threadId },
    include: {
      group: { select: { id: true, name: true, image: true } },
      createdBy: { select: { id: true, name: true, image: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  return NextResponse.json({ thread });
}
