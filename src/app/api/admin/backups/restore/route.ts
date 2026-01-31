import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { restoreBackup } from "@/lib/serverBackups";

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const filename = typeof body?.filename === "string" ? body.filename : "";
  if (!filename) return NextResponse.json({ message: "filename fehlt" }, { status: 400 });

  try {
    const result = await restoreBackup(filename);
    return NextResponse.json(result);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const status = details.includes("kein SQLite file:-Pfad") ? 400 : 500;
    return NextResponse.json(
      { message: "Restore fehlgeschlagen", details },
      { status }
    );
  }
}
