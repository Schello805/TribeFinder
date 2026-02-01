import { access, cp, mkdir, mkdtemp, readdir, rename, rm, stat, writeFile } from "fs/promises";
import { realpath } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import os from "os";
import fs from "node:fs";
import prisma from "@/lib/prisma";

function sanitizeDatabaseUrlForCli(databaseUrl: string) {
  try {
    const u = new URL(databaseUrl);
    // Prisma supports ?schema=... but Postgres CLI tools reject it.
    u.searchParams.delete("schema");
    return u.toString();
  } catch {
    // Fallback for non-standard URLs: remove `schema=...` from query if present.
    return databaseUrl
      .replace(/([?&])schema=[^&]+(&?)/i, (_m, p1, p2) => (p2 ? p1 : ""))
      .replace(/\?$/, "");
  }
}

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
      const hasPackageJson = fs.existsSync(path.join(dir, "package.json"));
      const hasPrismaSchema = fs.existsSync(path.join(dir, "prisma", "schema.prisma"));
      if (hasPackageJson && hasPrismaSchema) return dir;
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

async function resolveUploadsDir(projectRoot: string) {
  const envDir = (process.env.UPLOADS_DIR || "").trim();
  const candidates = [
    ...(envDir ? [envDir] : []),
    path.join(projectRoot, "public", "uploads"),
    "/var/www/tribefinder/uploads",
  ];

  for (const dir of candidates) {
    try {
      const resolved = await realpath(dir).catch(() => dir);
      await mkdir(resolved, { recursive: true });
      await access(resolved, fs.constants.W_OK | fs.constants.X_OK);
      return resolved;
    } catch {
      // try next
    }
  }

  return path.join(projectRoot, "public", "uploads");
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
  const databaseUrlForCli = sanitizeDatabaseUrlForCli(databaseUrl);
  const uploadsDir = await resolveUploadsDir(projectRoot);

  const backupDir = await resolveBackupDir(projectRoot);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `tribefinder-backup-${timestamp}.tar.gz`;
  const outPath = path.join(backupDir, filename);

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "tribefinder-backup-"));
  try {
    const tmpDb = path.join(tmpRoot, "db.sql");
    const tmpUploads = path.join(tmpRoot, "uploads");
    const tmpSettings = path.join(tmpRoot, "settings.json");

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        "pg_dump",
        ["--no-owner", "--no-privileges", "--format=p", "-f", tmpDb, "-d", databaseUrlForCli],
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
    // Extract db.sql (PostgreSQL backups)
    try {
      await runTar(["-xzf", archivePath, "-C", tmpRoot, "db.sql"], projectRoot);
    } catch {
      // ignore
    }
    const sqlDbPath = path.join(tmpRoot, "db.sql");
    const hasSqlDump = await stat(sqlDbPath).then(() => true).catch(() => false);
    const hasDb = hasSqlDump;

    const uploadsList = await runCommand("tar", ["-tzf", archivePath], projectRoot);
    const uploadFiles = uploadsList.stdout
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((p) => p.startsWith("uploads/") && !p.endsWith("/"))
      .filter((p) => p !== "uploads/.gitkeep");

    const counts: Record<string, number> = {};

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
    try {
      await rename(destDir, backupDir);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("EACCES") || msg.includes("EPERM")) {
        throw new Error(
          `Restore fehlgeschlagen: Keine Rechte um '${destDir}' umzubenennen. ` +
            `Für das Umbenennen muss der Service-User im Parent-Verzeichnis '${parent}' schreiben dürfen. ` +
            `Fix (als root): sudo mkdir -p '${parent}' && sudo chown -R tribefinder:tribefinder '${parent}' && sudo chmod 755 '${parent}'. ` +
            `Original: ${msg}`
        );
      }
      throw e;
    }
  }

  try {
    await rename(srcDir, destDir);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("EACCES") || msg.includes("EPERM")) {
      throw new Error(
        `Restore fehlgeschlagen: Keine Rechte um '${destDir}' zu überschreiben. ` +
          `Fix (als root): sudo mkdir -p '${parent}' && sudo chown -R tribefinder:tribefinder '${parent}' && sudo chmod 755 '${parent}'. ` +
          `Original: ${msg}`
      );
    }
    await mkdir(destDir, { recursive: true });
    await cp(srcDir, destDir, { recursive: true });
    await rm(srcDir, { recursive: true, force: true });
  }

  if (hasCurrent) {
    await rm(backupDir, { recursive: true, force: true });
  }
}

export async function restoreBackup(filename: string) {
  const projectRoot = resolveProjectRoot();
  if (!isSafeBackupFilename(filename)) {
    throw new Error("Ungültiger Backup-Dateiname");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL fehlt");
  const databaseUrlForCli = sanitizeDatabaseUrlForCli(databaseUrl);
  const uploadsDir = await resolveUploadsDir(projectRoot);
  const relUploads = path.relative(projectRoot, uploadsDir);

  const backupDir = await resolveBackupDir(projectRoot);
  const archivePath = path.join(backupDir, filename);
  await stat(archivePath).catch(() => {
    throw new Error("Backup nicht gefunden");
  });

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "tribefinder-restore-"));
  try {
    await runTar(["-xzf", archivePath, "-C", tmpRoot], projectRoot);

    // Preferred layout: db.sql + uploads/
    const extractedDbNewPostgres = path.join(tmpRoot, "db.sql");
    const extractedUploadsNew = path.join(tmpRoot, "uploads");

    const safeResolve = (base: string, rel: string) => {
      const resolved = path.resolve(base, rel);
      if (!resolved.startsWith(path.resolve(base) + path.sep)) return null;
      return resolved;
    };

    let extractedDb: string | null = null;
    let extractedUploads: string | null = null;

    if (await pathExists(extractedDbNewPostgres)) extractedDb = extractedDbNewPostgres;
    if (await pathExists(extractedUploadsNew)) extractedUploads = extractedUploadsNew;

    // Fallback (legacy) layout: relative DB path + public/uploads
    if (!extractedDb || !extractedUploads) {
      const extractedUploadsLegacy = safeResolve(tmpRoot, relUploads);
      extractedUploads = extractedUploads ?? extractedUploadsLegacy;
    }

    // Additional fallback for older backups
    if (!extractedDb || !(await pathExists(extractedDb))) {
      const candidates = [path.join(tmpRoot, "db.sql")];
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
    if (!extractedDb || !(await pathExists(extractedDb))) missing.push("db.sql");
    if (!extractedUploads || !(await pathExists(extractedUploads))) missing.push("uploads");
    if (missing.length > 0) {
      const available = await readdir(tmpRoot).catch(() => []);
      throw new Error(
        `Backup-Inhalt passt nicht zur aktuellen Installation. Fehlt: ${missing.join(", ")}. Root enthält: ${available.join(", ")}`
      );
    }

    const sqlPath = extractedDb!;
    await runPsql(["-c", "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"], projectRoot, databaseUrlForCli);
    await runPsql(["-f", sqlPath], projectRoot, databaseUrlForCli);
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
