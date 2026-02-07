import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  const userId = session.user.id;

  const unreadCount = await prisma.message.count({
    where: {
      receiverId: userId,
      read: false,
    },
  });

  return NextResponse.json({ unreadCount });
}
