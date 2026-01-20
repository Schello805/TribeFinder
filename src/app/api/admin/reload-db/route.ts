import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import prisma from "@/lib/prisma";

export async function POST() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  try {
    await prisma.$disconnect();
    return NextResponse.json({ ok: true, message: "DB-Verbindung neu geladen" });
  } catch (error) {
    return NextResponse.json(
      { message: "DB konnte nicht neu geladen werden", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
