import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Endpoint is disabled - no cleanup needed

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  return NextResponse.json({ message: "Endpoint deaktiviert" }, { status: 410 });
}

export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  return NextResponse.json({ message: "Endpoint deaktiviert" }, { status: 410 });
}
