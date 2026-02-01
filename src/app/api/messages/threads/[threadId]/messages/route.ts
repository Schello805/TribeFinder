import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { notifyGroupAboutInboxMessage } from "@/lib/notifications";

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

export async function POST(req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await getServerSession(authOptions);
  const threadId = (await params).threadId;

  if (!session?.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(`groupThreads:reply:${clientId}:${session.user.id}:${threadId}`, RATE_LIMITS.create);
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const body = await req.json().catch(() => ({}));
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ message: "Nachricht fehlt" }, { status: 400 });
  }

  const access = await canAccessThread(session.user.id, threadId);
  if (!access.thread) {
    return NextResponse.json({ message: "Thread nicht gefunden" }, { status: 404 });
  }
  if (!access.ok) {
    return NextResponse.json({ message: "Kein Zugriff" }, { status: 403 });
  }

  const message = await prisma.groupThreadMessage.create({
    data: {
      threadId,
      authorId: session.user.id,
      content,
    },
    select: { id: true },
  });

  await prisma.groupThreadReadState.upsert({
    where: { threadId_userId: { threadId, userId: session.user.id } },
    update: { lastReadAt: new Date() },
    create: { threadId, userId: session.user.id, lastReadAt: new Date() },
  });

  await prisma.groupThread.update({
    where: { id: threadId },
    data: { lastMessageAt: new Date() },
  });

  notifyGroupAboutInboxMessage({
    groupId: access.thread.groupId,
    threadId,
    authorId: session.user.id,
    authorName: session.user.name || session.user.email || "Unbekannt",
    preview: content.slice(0, 120),
  }).catch(() => undefined);

  return NextResponse.json({ messageId: message.id }, { status: 201 });
}
