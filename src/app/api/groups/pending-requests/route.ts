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

  const manageableGroups = await prisma.group.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId, status: "APPROVED" } } },
      ],
    },
    select: {
      id: true,
      name: true,
      image: true,
      members: {
        where: { status: "PENDING" },
        select: { id: true },
      },
    },
    take: 250,
  });

  const groups = manageableGroups
    .map((g) => ({
      id: g.id,
      name: g.name,
      image: g.image,
      pendingCount: g.members.length,
    }))
    .filter((g) => g.pendingCount > 0)
    .sort((a, b) => b.pendingCount - a.pendingCount);

  const pendingCount = groups.reduce((sum, g) => sum + g.pendingCount, 0);

  return NextResponse.json({ pendingCount, groups });
}
