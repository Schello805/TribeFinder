import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  const userId = session.user.id;

  const approvedGroupIds = await prisma.groupMember.findMany({
    where: { userId, status: "APPROVED" },
    select: { groupId: true },
  });

  const groupIds = approvedGroupIds.map((g) => g.groupId);

  const threads = await prisma.groupThread.findMany({
    where: {
      OR: [{ createdByUserId: userId }, { groupId: { in: groupIds } }],
    },
    select: {
      id: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, authorId: true },
      },
      readStates: {
        where: { userId },
        select: { lastReadAt: true },
        take: 1,
      },
    },
    take: 250,
  });

  let unreadCount = 0;

  for (const t of threads) {
    const lastMsg = t.messages[0];
    if (!lastMsg) continue;

    if (lastMsg.authorId === userId) continue;

    const lastReadAt = t.readStates[0]?.lastReadAt;
    if (!lastReadAt || lastMsg.createdAt > lastReadAt) {
      unreadCount += 1;
    }
  }

  return NextResponse.json({ unreadCount });
}
