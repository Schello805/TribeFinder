import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { inspectBackup } from "@/lib/serverBackups";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("file") || "";

  if (!filename || !filename.endsWith(".tar.gz") || filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ message: "Ungültiger Dateiname" }, { status: 400 });
  }

  try {
    const result = await inspectBackup(filename);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: "Backup konnte nicht geprüft werden", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
