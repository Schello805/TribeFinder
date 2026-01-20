import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";

// Endpoint is disabled - no cleanup needed

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  return NextResponse.json({ message: "Endpoint deaktiviert" }, { status: 410 });
}

export async function POST() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  return NextResponse.json({ message: "Endpoint deaktiviert" }, { status: 410 });
}
