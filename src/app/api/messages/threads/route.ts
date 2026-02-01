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
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      group: { select: { id: true, name: true, image: true } },
      createdBy: { select: { id: true, name: true, image: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true, authorId: true },
      },
    },
  });

  return NextResponse.json({ threads });
}
