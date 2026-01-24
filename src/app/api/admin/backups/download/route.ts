import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import fs from "node:fs";
import { requireAdminSession } from "@/lib/requireAdmin";

function resolveProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("file") || "";

  if (!filename || !filename.endsWith(".tar.gz") || filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ message: "Ungültiger Dateiname" }, { status: 400 });
  }

  const fullPath = path.join(resolveProjectRoot(), "backups", filename);
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
