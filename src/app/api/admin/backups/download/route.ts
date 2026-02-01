import { NextResponse } from "next/server";
import path from "path";
import { access, mkdir, readFile } from "fs/promises";
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

async function resolveBackupDir() {
  const envDir = (process.env.BACKUP_DIR || "").trim();
  const projectRoot = resolveProjectRoot();
  const candidates = [
    ...(envDir ? [envDir] : []),
    path.join(projectRoot, "backups"),
    "/var/www/tribefinder/backups",
  ];

  let lastError: unknown = null;
  for (const dir of candidates) {
    try {
      await mkdir(dir, { recursive: true });
      await access(dir, fs.constants.W_OK | fs.constants.X_OK);
      return dir;
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(
    `Konnte kein Backup-Verzeichnis anlegen. Kandidaten: ${candidates.join(", ")}. ` +
      (lastError instanceof Error ? lastError.message : String(lastError))
  );
}

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("file") || "";

  if (!filename || !filename.endsWith(".tar.gz") || filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ message: "Ungültiger Dateiname" }, { status: 400 });
  }

  const backupDir = await resolveBackupDir();
  const fullPath = path.join(backupDir, filename);
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
