import { cp, mkdir, mkdtemp, readdir, rename, rm, stat, writeFile } from "fs/promises";
import { realpath } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import os from "os";
import fs from "node:fs";
import prisma from "@/lib/prisma";

 async function getBackupRetentionCount(): Promise<number> {
   try {
     const row = await prisma.systemSetting.findUnique({ where: { key: "BACKUP_RETENTION_COUNT" } });
     const n = Number(row?.value);
     if (!Number.isFinite(n)) return 30;
     if (n < 1) return 1;
     if (n > 365) return 365;
     return Math.floor(n);
   } catch {
     return 30;
   }
 }

function resolveProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    try {
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

async function resolveBackupDir(projectRoot: string) {
  const envDir = (process.env.BACKUP_DIR || "").trim();
  const candidates = [
    ...(envDir ? [envDir] : []),
    "/var/www/tribefinder/backups",
    path.join(projectRoot, "backups"),
  ];

  let lastError: unknown = null;
  for (const dir of candidates) {
    try {
      await mkdir(dir, { recursive: true });
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
    throw new Error(
      "DATABASE_URL ist kein SQLite file:-Pfad. Der integrierte Restore überschreibt nur eine SQLite-Datei (file:...). Für PostgreSQL musst du das Backup (db.sqlite) extrahieren und per pgloader in Postgres importieren."
    );
  }
  const withoutScheme = trimmed.replace(/^file:/, "");
  const cleaned = withoutScheme.replace(/^\/\//, "");
  return path.isAbsolute(cleaned) ? cleaned : path.join(projectRoot, cleaned);
}

function isSqliteDatabaseUrl(databaseUrl: string) {
  return databaseUrl.trim().startsWith("file:");
}

function runPsql(args: string[], cwd: string, databaseUrl: string): Promise<{ stdout: string; stderr: string }> {
  return runCommand("psql", ["-v", "ON_ERROR_STOP=1", "-d", databaseUrl, ...args], cwd);
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

  const isSqlite = isSqliteDatabaseUrl(databaseUrl);
  const dbPath = isSqlite ? parseSqlitePathFromDatabaseUrl(databaseUrl, projectRoot) : null;
  const uploadsDir = await resolveUploadsDir(projectRoot);

  const backupDir = await resolveBackupDir(projectRoot);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `tribefinder-backup-${timestamp}.tar.gz`;
  const outPath = path.join(backupDir, filename);

  if (dbPath) {
    await stat(dbPath).catch(() => {
      throw new Error(`DB nicht gefunden: ${dbPath}`);
    });
  }

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "tribefinder-backup-"));
  try {
    const tmpDb = path.join(tmpRoot, isSqlite ? "db.sqlite" : "db.sql");
    const tmpUploads = path.join(tmpRoot, "uploads");
    const tmpSettings = path.join(tmpRoot, "settings.json");

    if (isSqlite) {
      await cp(dbPath!, tmpDb);
    } else {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(
          "pg_dump",
          ["--no-owner", "--no-privileges", "--format=p", "-f", tmpDb, "-d", databaseUrl],
          { cwd: projectRoot, env: process.env }
        );
        let stderr = "";
        proc.stderr.on("data", (d) => {
          stderr += d.toString();
        });
        proc.on("error", reject);
        proc.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(stderr || `pg_dump exited with code ${code}`));
        });
      });
    }

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

    await runTar(["-czf", outPath, path.basename(tmpDb), "uploads", "settings.json"], tmpRoot);
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

 export async function purgeOldBackups() {
  const projectRoot = resolveProjectRoot();
  const backupDir = await resolveBackupDir(projectRoot);

  const effectiveKeepLast = await getBackupRetentionCount();

  if (effectiveKeepLast <= 0) {
    return { deleted: 0, kept: 0, keepLast: effectiveKeepLast };
  }

  const entries = await readdir(backupDir).catch(() => []);
  const backups = await Promise.all(
    entries
      .filter((f) => f.endsWith(".tar.gz"))
      .map(async (filename) => {
        const full = path.join(backupDir, filename);
        const s = await stat(full);
        return { filename, full, mtimeMs: s.mtimeMs };
      })
  );

  // Purge only backups created by this server (keep uploaded archives intact)
  const candidates = backups.filter((b) => b.filename.startsWith("tribefinder-backup-"));

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const toDelete = candidates.slice(effectiveKeepLast);
  for (const b of toDelete) {
    await rm(b.full, { force: true });
  }

  return {
    deleted: toDelete.length,
    kept: Math.min(candidates.length, effectiveKeepLast),
    keepLast: effectiveKeepLast,
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

  const backupDir = await resolveBackupDir(projectRoot);
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

    // Try to extract db.sql (PostgreSQL backups)
    try {
      await runTar(["-xzf", archivePath, "-C", tmpRoot, "db.sql"], projectRoot);
    } catch {
      // ignore
    }

    const sqliteDbPath = path.join(tmpRoot, "db.sqlite");
    const sqlDbPath = path.join(tmpRoot, "db.sql");
    const hasSqliteDb = await stat(sqliteDbPath).then(() => true).catch(() => false);
    const hasSqlDump = await stat(sqlDbPath).then(() => true).catch(() => false);
    const hasDb = hasSqliteDb || hasSqlDump;

    const uploadsList = await runCommand("tar", ["-tzf", archivePath], projectRoot);
    const uploadFiles = uploadsList.stdout
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((p) => p.startsWith("uploads/") && !p.endsWith("/"))
      .filter((p) => p !== "uploads/.gitkeep");

    const counts: Record<string, number> = {};

    if (hasSqliteDb) {
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

      const res = await runCommand("sqlite3", [sqliteDbPath, q], projectRoot);
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

  const isSqlite = isSqliteDatabaseUrl(databaseUrl);
  const dbPath = isSqlite ? parseSqlitePathFromDatabaseUrl(databaseUrl, projectRoot) : null;
  const uploadsDir = await resolveUploadsDir(projectRoot);
  const relDb = dbPath ? path.relative(projectRoot, dbPath) : null;
  const relUploads = path.relative(projectRoot, uploadsDir);

  const backupDir = await resolveBackupDir(projectRoot);
  const archivePath = path.join(backupDir, filename);
  await stat(archivePath).catch(() => {
    throw new Error("Backup nicht gefunden");
  });

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "tribefinder-restore-"));
  try {
    await runTar(["-xzf", archivePath, "-C", tmpRoot], projectRoot);

    // Preferred (new) layouts: db.sqlite (sqlite) or db.sql (postgres) + uploads/
    const extractedDbNewSqlite = path.join(tmpRoot, "db.sqlite");
    const extractedDbNewPostgres = path.join(tmpRoot, "db.sql");
    const extractedUploadsNew = path.join(tmpRoot, "uploads");

    const safeResolve = (base: string, rel: string) => {
      const resolved = path.resolve(base, rel);
      if (!resolved.startsWith(path.resolve(base) + path.sep)) return null;
      return resolved;
    };

    let extractedDb: string | null = null;
    let extractedUploads: string | null = null;

    if (await pathExists(extractedDbNewSqlite)) extractedDb = extractedDbNewSqlite;
    if (!extractedDb && (await pathExists(extractedDbNewPostgres))) extractedDb = extractedDbNewPostgres;
    if (await pathExists(extractedUploadsNew)) extractedUploads = extractedUploadsNew;

    // Fallback (legacy) layout: relative DB path + public/uploads
    if (!extractedDb || !extractedUploads) {
      const extractedDbLegacy = relDb ? safeResolve(tmpRoot, relDb) : null;
      const extractedUploadsLegacy = safeResolve(tmpRoot, relUploads);
      extractedDb = extractedDb ?? extractedDbLegacy;
      extractedUploads = extractedUploads ?? extractedUploadsLegacy;
    }

    // Additional fallback for older backups where DB path resolution changed
    if (!extractedDb || !(await pathExists(extractedDb))) {
      const candidates = [
        ...(dbPath ? [path.join(tmpRoot, path.basename(dbPath))] : []),
        path.join(tmpRoot, "dev.db"),
        path.join(tmpRoot, "prisma", "dev.db"),
        path.join(tmpRoot, "db.sqlite"),
        path.join(tmpRoot, "db.sql"),
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
    if (!extractedDb || !(await pathExists(extractedDb))) missing.push(isSqlite ? "db.sqlite" : "db.sql");
    if (!extractedUploads || !(await pathExists(extractedUploads))) missing.push("uploads");
    if (missing.length > 0) {
      const available = await readdir(tmpRoot).catch(() => []);
      throw new Error(
        `Backup-Inhalt passt nicht zur aktuellen Installation. Fehlt: ${missing.join(", ")}. Root enthält: ${available.join(", ")}`
      );
    }

    if (isSqlite) {
      await replaceFile(extractedDb!, dbPath!);
    } else {
      const sqlPath = extractedDb!;
      await runPsql(["-c", "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"], projectRoot, databaseUrl);
      await runPsql(["-f", sqlPath], projectRoot, databaseUrl);
    }
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
