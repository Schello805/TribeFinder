import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { onboardingCompletedAt: true } });
  return NextResponse.json({ completed: Boolean(user?.onboardingCompletedAt) });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  await prisma.user.update({ where: { id: session.user.id }, data: { onboardingCompletedAt: new Date() } });
  return NextResponse.json({ completed: true });
}
