import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

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
    select: { id: true },
  });

  if (!group) {
    return NextResponse.json({ message: "Gruppe nicht gefunden" }, { status: 404 });
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

  return NextResponse.json({ threadId: thread.id }, { status: 201 });
}
