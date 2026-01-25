import { cp, mkdir, mkdtemp, readdir, rename, rm, stat, writeFile } from "fs/promises";
import { realpath } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import os from "os";
import prisma from "@/lib/prisma";

function resolveProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require("node:fs") as typeof import("node:fs");
      if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    } catch {
      // ignore
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

async function resolveUploadsDir(projectRoot: string) {
  const uploadsDir = path.join(projectRoot, "public", "uploads");
  try {
    return await realpath(uploadsDir);
  } catch {
    return uploadsDir;
  }
}

function runCommand(cmd: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || `${cmd} exited with code ${code}`));
    });
  });
}

function parseSqlitePathFromDatabaseUrl(databaseUrl: string, projectRoot: string): string {
  const trimmed = databaseUrl.trim();
  if (!trimmed.startsWith("file:")) {
    throw new Error("DATABASE_URL ist kein SQLite file:-Pfad");
  }
  const withoutScheme = trimmed.replace(/^file:/, "");
  const cleaned = withoutScheme.replace(/^\/\//, "");
  return path.isAbsolute(cleaned) ? cleaned : path.join(projectRoot, cleaned);
}

function runTar(args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("tar", args, { cwd });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `tar exited with code ${code}`));
    });
  });
}

export async function createBackup() {
  const projectRoot = resolveProjectRoot();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL fehlt");

  const dbPath = parseSqlitePathFromDatabaseUrl(databaseUrl, projectRoot);
  const uploadsDir = await resolveUploadsDir(projectRoot);

  const backupDir = path.join(projectRoot, "backups");
  await mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `tribefinder-backup-${timestamp}.tar.gz`;
  const outPath = path.join(backupDir, filename);

  await stat(dbPath).catch(() => {
    throw new Error(`DB nicht gefunden: ${dbPath}`);
  });

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "tribefinder-backup-"));
  try {
    const tmpDb = path.join(tmpRoot, "db.sqlite");
    const tmpUploads = path.join(tmpRoot, "uploads");
    const tmpSettings = path.join(tmpRoot, "settings.json");

    await cp(dbPath, tmpDb);

    const settings = await prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
    const payload = settings.reduce((acc: Record<string, string>, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);
    await writeFile(tmpSettings, JSON.stringify(payload, null, 2), "utf8");

    const uploadsExists = await stat(uploadsDir)
      .then(() => true)
      .catch(() => false);
    if (uploadsExists) {
      // dereference symlink so we copy actual image files (public/uploads is often a symlink to /var/www/...)
      await cp(uploadsDir, tmpUploads, { recursive: true, dereference: true });
    } else {
      await mkdir(tmpUploads, { recursive: true });
    }

    await runTar(["-czf", outPath, "db.sqlite", "uploads", "settings.json"], tmpRoot);
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }

  const s = await stat(outPath);

  return {
    filename,
    size: s.size,
    createdAt: s.mtimeMs,
  };
}

function isSafeBackupFilename(filename: string) {
  if (!filename.endsWith(".tar.gz")) return false;
  if (filename.includes("/") || filename.includes("..")) return false;

  // Backups created by this server start with tribefinder-backup-.
  // Uploaded backups are stored with an upload- prefix.
  if (filename.startsWith("tribefinder-backup-") || filename.startsWith("upload-")) return true;

  return false;
}

export async function inspectBackup(filename: string) {
  const projectRoot = resolveProjectRoot();
  if (!isSafeBackupFilename(filename)) {
    throw new Error("Ungültiger Backup-Dateiname");
  }

  const backupDir = path.join(projectRoot, "backups");
  const archivePath = path.join(backupDir, filename);
  await stat(archivePath).catch(() => {
    throw new Error("Backup nicht gefunden");
  });

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "tribefinder-inspect-"));
  try {
    // Try to extract db.sqlite (new format). Legacy archives might not have it.
    try {
      await runTar(["-xzf", archivePath, "-C", tmpRoot, "db.sqlite"], projectRoot);
    } catch {
      // ignore
    }

    const dbPath = path.join(tmpRoot, "db.sqlite");
    const hasDb = await stat(dbPath).then(() => true).catch(() => false);

    const uploadsList = await runCommand("tar", ["-tzf", archivePath], projectRoot);
    const uploadFiles = uploadsList.stdout
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((p) => p.startsWith("uploads/") && !p.endsWith("/"))
      .filter((p) => p !== "uploads/.gitkeep");

    const counts: Record<string, number> = {};

    if (hasDb) {
      const q = [
        "select 'User' as t, count(*) as c from User",
        "select 'Group' as t, count(*) as c from 'Group'",
        "select 'Event' as t, count(*) as c from Event",
        "select 'DanceStyle' as t, count(*) as c from DanceStyle",
        "select 'UserDanceStyle' as t, count(*) as c from UserDanceStyle",
        "select 'GalleryImage' as t, count(*) as c from GalleryImage",
        "select 'SystemSetting' as t, count(*) as c from SystemSetting",
        "select 'Feedback' as t, count(*) as c from Feedback",
      ].join(" union all ") + ";";

      const res = await runCommand("sqlite3", [dbPath, q], projectRoot);
      res.stdout
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .forEach((line) => {
          const [t, c] = line.split("|");
          if (!t) return;
          const n = Number(c);
          counts[t] = Number.isFinite(n) ? n : 0;
        });
    }

    return {
      filename,
      hasDb,
      uploadsFileCount: uploadFiles.length,
      counts,
      warnings: {
        hasVeryFewData:
          (counts.Group ?? 0) === 0 &&
          (counts.Event ?? 0) === 0 &&
          (counts.GalleryImage ?? 0) === 0 &&
          uploadFiles.length === 0,
      },
    };
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

async function pathExists(p: string) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function replaceDirectory(srcDir: string, destDir: string) {
  const parent = path.dirname(destDir);
  await mkdir(parent, { recursive: true });

  const backupDir = `${destDir}.previous-${Date.now()}`;
  const hasCurrent = await pathExists(destDir);
  if (hasCurrent) {
    await rename(destDir, backupDir);
  }

  try {
    await rename(srcDir, destDir);
  } catch {
    await mkdir(destDir, { recursive: true });
    await cp(srcDir, destDir, { recursive: true });
    await rm(srcDir, { recursive: true, force: true });
  }

  if (hasCurrent) {
    await rm(backupDir, { recursive: true, force: true });
  }
}

async function replaceFile(srcFile: string, destFile: string) {
  await mkdir(path.dirname(destFile), { recursive: true });
  const backupFile = `${destFile}.previous-${Date.now()}`;
  const hasCurrent = await pathExists(destFile);
  if (hasCurrent) {
    await rename(destFile, backupFile);
  }

  try {
    await rename(srcFile, destFile);
  } catch {
    await cp(srcFile, destFile);
    await rm(srcFile, { force: true });
  }

  if (hasCurrent) {
    await rm(backupFile, { force: true });
  }
}

export async function restoreBackup(filename: string) {
  const projectRoot = resolveProjectRoot();
  if (!isSafeBackupFilename(filename)) {
    throw new Error("Ungültiger Backup-Dateiname");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL fehlt");

  const dbPath = parseSqlitePathFromDatabaseUrl(databaseUrl, projectRoot);
  const uploadsDir = await resolveUploadsDir(projectRoot);
  const relDb = path.relative(projectRoot, dbPath);
  const relUploads = path.relative(projectRoot, uploadsDir);

  const backupDir = path.join(projectRoot, "backups");
  const archivePath = path.join(backupDir, filename);
  await stat(archivePath).catch(() => {
    throw new Error("Backup nicht gefunden");
  });

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "tribefinder-restore-"));
  try {
    await runTar(["-xzf", archivePath, "-C", tmpRoot], projectRoot);

    // Preferred (new) layout: db.sqlite + uploads/
    const extractedDbNew = path.join(tmpRoot, "db.sqlite");
    const extractedUploadsNew = path.join(tmpRoot, "uploads");

    const safeResolve = (base: string, rel: string) => {
      const resolved = path.resolve(base, rel);
      if (!resolved.startsWith(path.resolve(base) + path.sep)) return null;
      return resolved;
    };

    let extractedDb: string | null = null;
    let extractedUploads: string | null = null;

    if (await pathExists(extractedDbNew)) extractedDb = extractedDbNew;
    if (await pathExists(extractedUploadsNew)) extractedUploads = extractedUploadsNew;

    // Fallback (legacy) layout: relative DB path + public/uploads
    if (!extractedDb || !extractedUploads) {
      const extractedDbLegacy = safeResolve(tmpRoot, relDb);
      const extractedUploadsLegacy = safeResolve(tmpRoot, relUploads);
      extractedDb = extractedDb ?? extractedDbLegacy;
      extractedUploads = extractedUploads ?? extractedUploadsLegacy;
    }

    // Additional fallback for older backups where DB path resolution changed
    if (!extractedDb || !(await pathExists(extractedDb))) {
      const candidates = [
        path.join(tmpRoot, path.basename(dbPath)),
        path.join(tmpRoot, "dev.db"),
        path.join(tmpRoot, "prisma", "dev.db"),
      ];
      for (const c of candidates) {
        if (await pathExists(c)) {
          extractedDb = c;
          break;
        }
      }
    }

    if (!extractedUploads || !(await pathExists(extractedUploads))) {
      const candidates = [
        path.join(tmpRoot, "public", "uploads"),
        path.join(tmpRoot, "uploads"),
      ];
      for (const c of candidates) {
        if (await pathExists(c)) {
          extractedUploads = c;
          break;
        }
      }
    }

    const missing: string[] = [];
    if (!extractedDb || !(await pathExists(extractedDb))) missing.push("db.sqlite");
    if (!extractedUploads || !(await pathExists(extractedUploads))) missing.push("uploads");
    if (missing.length > 0) {
      const available = await readdir(tmpRoot).catch(() => []);
      throw new Error(
        `Backup-Inhalt passt nicht zur aktuellen Installation. Fehlt: ${missing.join(", ")}. Root enthält: ${available.join(", ")}`
      );
    }

    await replaceFile(extractedDb!, dbPath);
    // Restore uploads into the resolved uploads directory (symlink target), not into the symlink itself.
    await replaceDirectory(extractedUploads!, uploadsDir);

    return {
      restored: true,
      message:
        "Restore abgeschlossen. Wichtig: App/Service neu starten, damit alle Prozesse die neue DB sehen.",
    };
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}
