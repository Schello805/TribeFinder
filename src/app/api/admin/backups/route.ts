import { NextResponse } from "next/server";
import { access, mkdir, readdir, rm, stat } from "fs/promises";
import path from "path";
import fs from "node:fs";
import { requireAdminSession } from "@/lib/requireAdmin";
import { createBackup, purgeOldBackups } from "@/lib/serverBackups";

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
    "/var/www/tribefinder/backups",
    path.join(projectRoot, "backups"),
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

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  try {
    const backupDir = await resolveBackupDir();

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
  } catch (error) {
    return NextResponse.json(
      {
        message: "Backups konnten nicht geladen werden",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  try {
    const result = await createBackup();
    const purged = await purgeOldBackups();
    return NextResponse.json({ ...result, purged }, { status: 201 });
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
