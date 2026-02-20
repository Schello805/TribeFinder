import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdmin";
import { getTransferArchiveBuffer } from "@/lib/serverTransfer";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("file") || "";
  if (!filename) return NextResponse.json({ message: "file fehlt" }, { status: 400 });

  try {
    const data = await getTransferArchiveBuffer(filename);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const status = details.includes("Ungültiger") || details.includes("Nicht gefunden") ? 400 : 500;
    return NextResponse.json({ message: "Download fehlgeschlagen", details }, { status });
  }
}
