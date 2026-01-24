import { NextResponse } from "next/server";
import path from "path";
import fs from "node:fs";
import { mkdir, writeFile, stat } from "fs/promises";
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

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const form = await req.formData().catch(() => null);
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

  const projectRoot = resolveProjectRoot();
  const backupDir = path.join(projectRoot, "backups");
  await mkdir(backupDir, { recursive: true });

  const safeName = `upload-${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const targetPath = path.join(backupDir, safeName);

  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, buf, { mode: 0o600 });

  const s = await stat(targetPath).catch(() => null);
  if (!s) return NextResponse.json({ message: "Konnte Backup nicht speichern" }, { status: 500 });

  return NextResponse.json({ filename: safeName, size: s.size, createdAt: s.mtimeMs }, { status: 201 });
}
