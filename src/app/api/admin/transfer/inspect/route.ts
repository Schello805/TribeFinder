import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { inspectTransfer } from "@/lib/serverTransfer";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("file") || "";
  if (!filename) return NextResponse.json({ message: "file fehlt" }, { status: 400 });

  try {
    const result = await inspectTransfer(filename);
    return NextResponse.json(result);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const status = details.includes("Ungültiger") || details.includes("nicht gefunden") ? 400 : 500;
    return NextResponse.json({ message: "Inspect fehlgeschlagen", details }, { status });
  }
}
