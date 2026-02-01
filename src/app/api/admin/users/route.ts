import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonUnauthorized } from "@/lib/apiResponse";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      role: true,
      isBlocked: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    users.map((u) => ({
      ...u,
      emailVerified: u.emailVerified ? u.emailVerified.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
    }))
  );
}
