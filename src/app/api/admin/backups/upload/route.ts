import { NextResponse } from "next/server";
import path from "path";
import fs from "node:fs";
import { access, mkdir, writeFile, stat } from "fs/promises";
import { requireAdminSession } from "@/lib/requireAdmin";
import { recordAdminAudit } from "@/lib/adminAudit";

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

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      {
        message: "Ungültiger Content-Type",
        details: `Erwartet multipart/form-data, bekommen: ${contentType || "(leer)"}`,
      },
      { status: 415 }
    );
  }

  let form: FormData | null = null;
  try {
    form = await req.formData();
  } catch (e) {
    return NextResponse.json(
      {
        message: "Ungültige Formdaten",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 400 }
    );
  }
  if (!form) return NextResponse.json({ message: "Ungültige Formdaten" }, { status: 400 });

  const fileEntry = form.get("file");
  const file = fileEntry instanceof File ? fileEntry : null;
  if (!file) return NextResponse.json({ message: "Datei fehlt" }, { status: 400 });

  const originalName = typeof file.name === "string" ? file.name : "backup.tar.gz";
  if (!originalName.endsWith(".tar.gz")) {
    return NextResponse.json({ message: "Nur .tar.gz Backups sind erlaubt" }, { status: 400 });
  }

  // basic size limit (500 MB)
  const MAX_BYTES = 500 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ message: "Backup ist zu groß" }, { status: 400 });
  }

  const backupDir = await resolveBackupDir();

  const safeName = `upload-${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const targetPath = path.join(backupDir, safeName);

  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, buf, { mode: 0o600 });

  const s = await stat(targetPath).catch(() => null);
  if (!s) return NextResponse.json({ message: "Konnte Backup nicht speichern" }, { status: 500 });

  await recordAdminAudit({
    action: "BACKUP_UPLOAD",
    actorAdminId: session.user.id,
    targetBackupFilename: safeName,
    metadata: { originalName, size: s.size, createdAt: s.mtimeMs },
  });

  return NextResponse.json({ filename: safeName, size: s.size, createdAt: s.mtimeMs }, { status: 201 });
}
