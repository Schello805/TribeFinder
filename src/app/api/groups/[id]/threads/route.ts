import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { notifyGroupAboutInboxMessage } from "@/lib/notifications";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const id = (await params).id;

  if (!session?.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(`groupThreads:create:${clientId}:${session.user.id}:${id}`, RATE_LIMITS.create);
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const body = await req.json().catch(() => ({}));
  const subject = typeof body?.subject === "string" ? body.subject.slice(0, 200) : null;
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ message: "Nachricht fehlt" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });

  if (!group) {
    return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && group.ownerId !== session.user.id) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: session.user.id, groupId: id } },
      select: { status: true },
    });

    if (!membership || membership.status !== "APPROVED") {
      return NextResponse.json(
        { message: "Nur bestätigte Gruppenmitglieder können Nachrichten schreiben" },
        { status: 403 }
      );
    }
  }

  const thread = await prisma.groupThread.create({
    data: {
      groupId: id,
      createdByUserId: session.user.id,
      subject,
      lastMessageAt: new Date(),
      messages: {
        create: {
          authorId: session.user.id,
          content,
        },
      },
    },
    select: { id: true },
  });

  await prisma.groupThreadReadState.upsert({
    where: { threadId_userId: { threadId: thread.id, userId: session.user.id } },
    update: { lastReadAt: new Date() },
    create: { threadId: thread.id, userId: session.user.id, lastReadAt: new Date() },
  });

  notifyGroupAboutInboxMessage({
    groupId: id,
    threadId: thread.id,
    authorId: session.user.id,
    authorName: session.user.name || session.user.email || "Unbekannt",
    preview: content.slice(0, 120),
    subject,
  }).catch(() => undefined);

  return NextResponse.json({ threadId: thread.id }, { status: 201 });
}
