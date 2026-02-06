import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { notifyUserAboutNewMessage } from "@/lib/notifications";

const sendSchema = z.object({
  receiverId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(`directMessages:send:${clientId}:${session.user.id}`, RATE_LIMITS.create);
  if (!rateCheck.success) return rateLimitResponse(rateCheck);

  const body = await req.json().catch(() => ({}));
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validierungsfehler", errors: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.receiverId === session.user.id) {
    return NextResponse.json({ message: "Ungültiger Empfänger" }, { status: 400 });
  }

  const receiver = await prisma.user.findUnique({
    where: { id: parsed.data.receiverId },
    select: { id: true, isBlocked: true },
  });

  if (!receiver || receiver.isBlocked) {
    return NextResponse.json({ message: "Empfänger nicht gefunden" }, { status: 404 });
  }

  const created = await prisma.message.create({
    data: {
      senderId: session.user.id,
      receiverId: receiver.id,
      content: parsed.data.content.trim(),
    },
    select: { id: true, senderId: true, receiverId: true, content: true, createdAt: true },
  });

  notifyUserAboutNewMessage(receiver.id, session.user.id, session.user.name || session.user.email || "Unbekannt").catch(() => undefined);

  return NextResponse.json({ message: created }, { status: 201 });
}
