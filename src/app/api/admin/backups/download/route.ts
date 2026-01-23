import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { requireAdminSession } from "@/lib/requireAdmin";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("file") || "";

  if (!filename || !filename.endsWith(".tar.gz") || filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ message: "Ungültiger Dateiname" }, { status: 400 });
  }

  const fullPath = path.join(process.cwd(), "backups", filename);
  const data = await readFile(fullPath).catch(() => null);
  if (!data) return NextResponse.json({ message: "Nicht gefunden" }, { status: 404 });

  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
    },
  });
}
