import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const db = prisma;

async function canAccessThread(userId: string, threadId: string) {
  const thread = await db.groupThread.findUnique({
    where: { id: threadId },
    select: { id: true, groupId: true, createdByUserId: true, createdAt: true },
  });

  if (!thread) return { ok: false as const, thread: null };

  if (thread.createdByUserId === userId) return { ok: true as const, thread };

  const member = await db.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: thread.groupId } },
    select: { status: true },
  });

  if (member?.status === "APPROVED") return { ok: true as const, thread };

  return { ok: false as const, thread };
}

async function isMessageLocked(params: { threadId: string; authorId: string; messageCreatedAt: Date }) {
  const states = await db.groupThreadReadState.findMany({
    where: {
      threadId: params.threadId,
      userId: { not: params.authorId },
      lastReadAt: { gt: params.messageCreatedAt },
    },
    select: { id: true },
    take: 1,
  });

  return states.length > 0;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ threadId: string; messageId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  const { threadId, messageId } = await params;

  const access = await canAccessThread(session.user.id, threadId);
  if (!access.thread) {
    return NextResponse.json({ message: "Thread nicht gefunden" }, { status: 404 });
  }
  if (!access.ok) {
    return NextResponse.json({ message: "Kein Zugriff" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ message: "Nachricht fehlt" }, { status: 400 });
  }

  const message = await db.groupThreadMessage.findUnique({
    where: { id: messageId },
    select: { id: true, threadId: true, authorId: true, createdAt: true },
  });

  if (!message || message.threadId !== threadId) {
    return NextResponse.json({ message: "Nachricht nicht gefunden" }, { status: 404 });
  }

  if (message.authorId !== session.user.id) {
    return NextResponse.json({ message: "Nur der Autor kann die Nachricht bearbeiten" }, { status: 403 });
  }

  const locked = await isMessageLocked({
    threadId,
    authorId: session.user.id,
    messageCreatedAt: message.createdAt,
  });

  if (locked) {
    return NextResponse.json(
      { message: "Nachricht wurde bereits gelesen und kann nicht mehr bearbeitet werden" },
      { status: 409 }
    );
  }

  await db.groupThreadMessage.update({
    where: { id: messageId },
    data: { content },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ threadId: string; messageId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  const { threadId, messageId } = await params;

  const access = await canAccessThread(session.user.id, threadId);
  if (!access.thread) {
    return NextResponse.json({ message: "Thread nicht gefunden" }, { status: 404 });
  }
  if (!access.ok) {
    return NextResponse.json({ message: "Kein Zugriff" }, { status: 403 });
  }

  const message = await db.groupThreadMessage.findUnique({
    where: { id: messageId },
    select: { id: true, threadId: true, authorId: true, createdAt: true },
  });

  if (!message || message.threadId !== threadId) {
    return NextResponse.json({ message: "Nachricht nicht gefunden" }, { status: 404 });
  }

  if (message.authorId !== session.user.id) {
    return NextResponse.json({ message: "Nur der Autor kann die Nachricht löschen" }, { status: 403 });
  }

  const locked = await isMessageLocked({
    threadId,
    authorId: session.user.id,
    messageCreatedAt: message.createdAt,
  });

  if (locked) {
    return NextResponse.json(
      { message: "Nachricht wurde bereits gelesen und kann nicht mehr gelöscht werden" },
      { status: 409 }
    );
  }

  await db.groupThreadMessage.delete({ where: { id: messageId } });

  const latest = await db.groupThreadMessage.findFirst({
    where: { threadId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  await db.groupThread.update({
    where: { id: threadId },
    data: { lastMessageAt: latest?.createdAt ?? access.thread.createdAt },
  });

  return NextResponse.json({ ok: true });
}
