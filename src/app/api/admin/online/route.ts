import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getOnlineSnapshot } from "@/lib/presence";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const snap = getOnlineSnapshot();

  const users = await prisma.user.findMany({
    where: { id: { in: snap.onlineUserIds } },
    select: { id: true, email: true, name: true, dancerName: true, image: true },
    take: 200,
  });

  const userById = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    onlineVisitors: snap.onlineVisitors,
    onlineUsers: snap.onlineUserIds
      .map((id) => userById.get(id))
      .filter(Boolean),
    windowMinutes: 5,
  });
}
