import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { purgeOldBackups } from "@/lib/serverBackups";

export async function POST() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  try {
    const result = await purgeOldBackups(undefined, true);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { message: "Purge fehlgeschlagen", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
