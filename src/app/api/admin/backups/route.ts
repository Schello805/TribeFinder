import { NextResponse } from "next/server";
import { mkdir, readdir, rm, stat } from "fs/promises";
import path from "path";
import fs from "node:fs";
import { requireAdminSession } from "@/lib/requireAdmin";
import { createBackup } from "@/lib/serverBackups";

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

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const backupDir = path.join(resolveProjectRoot(), "backups");
  await mkdir(backupDir, { recursive: true });

  const entries = await readdir(backupDir).catch(() => []);
  const backups = await Promise.all(
    entries
      .filter((f) => f.endsWith(".tar.gz"))
      .map(async (filename) => {
        const full = path.join(backupDir, filename);
        const s = await stat(full);
        return {
          filename,
          size: s.size,
          createdAt: s.mtimeMs,
        };
      })
  );

  backups.sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ backups });
}

export async function POST() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  try {
    const result = await createBackup();
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Backup fehlgeschlagen", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("file") || "";

  if (!filename || !filename.endsWith(".tar.gz") || filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ message: "Ungültiger Dateiname" }, { status: 400 });
  }

  const fullPath = path.join(resolveProjectRoot(), "backups", filename);
  const exists = await stat(fullPath).then(() => true).catch(() => false);
  if (!exists) return NextResponse.json({ message: "Nicht gefunden" }, { status: 404 });

  await rm(fullPath, { force: true });
  return NextResponse.json({ ok: true });
}
