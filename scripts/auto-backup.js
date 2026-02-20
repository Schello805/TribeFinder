#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

function resolveProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    try {
      const hasPackageJson = require("fs").existsSync(path.join(dir, "package.json"));
      const hasPrismaSchema = require("fs").existsSync(path.join(dir, "prisma", "schema.prisma"));
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

async function resolveBackupDir(projectRoot) {
  const envDir = (process.env.BACKUP_DIR || "").trim();
  const candidates = [
    ...(envDir ? [envDir] : []),
    path.join(projectRoot, "backups"),
    "/var/www/tribefinder/backups",
  ];

  let lastError = null;
  for (const dir of candidates) {
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.access(dir, require("fs").constants.W_OK | require("fs").constants.X_OK);
      return dir;
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(
    `Konnte kein Backup-Verzeichnis anlegen. Kandidaten: ${candidates.join(", ")}. ` +
      (lastError && lastError.message ? lastError.message : String(lastError))
  );
}

async function resolveUploadsDir(projectRoot) {
  const envDir = (process.env.UPLOADS_DIR || "").trim();
  const candidates = [
    ...(envDir ? [envDir] : []),
    path.join(projectRoot, "public", "uploads"),
    "/var/www/tribefinder/uploads",
  ];

  for (const dir of candidates) {
    try {
      const resolved = await require("fs/promises").realpath(dir).catch(() => dir);
      await fs.mkdir(resolved, { recursive: true });
      await fs.access(resolved, require("fs").constants.W_OK | require("fs").constants.X_OK);
      return resolved;
    } catch {
      // try next
    }
  }

  return path.join(projectRoot, "public", "uploads");
}

function runCommand(cmd, args, cwd) {
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

async function createTarGz(outPath, cwd, files) {
  await new Promise((resolve, reject) => {
    const proc = spawn("tar", ["-czf", outPath, ...files], { cwd });
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

async function createServerBackup(settingsPayload) {
  const projectRoot = resolveProjectRoot();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL fehlt");

  let databaseUrlCli = databaseUrl;
  try {
    const u = new URL(databaseUrl);
    u.searchParams.delete("schema");
    databaseUrlCli = u.toString();
  } catch {
    databaseUrlCli = databaseUrl;
  }

  const uploadsDir = await resolveUploadsDir(projectRoot);
  const backupDir = await resolveBackupDir(projectRoot);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `tribefinder-backup-${timestamp}.tar.gz`;
  const outPath = path.join(backupDir, filename);

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tribefinder-backup-"));
  try {
    const tmpDb = path.join(tmpRoot, "db.sql");
    const tmpUploads = path.join(tmpRoot, "uploads");
    const tmpSettings = path.join(tmpRoot, "settings.json");

    await new Promise((resolve, reject) => {
      const proc = spawn(
        "pg_dump",
        ["--no-owner", "--no-privileges", "--format=p", "-f", tmpDb, "-d", databaseUrlCli],
        { cwd: process.cwd(), env: process.env }
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

    const uploadsExists = await fs
      .stat(uploadsDir)
      .then(() => true)
      .catch(() => false);

    if (uploadsExists) {
      await fs.cp(uploadsDir, tmpUploads, { recursive: true, dereference: true });
    } else {
      await fs.mkdir(tmpUploads, { recursive: true });
    }

    if (settingsPayload && typeof settingsPayload === "object") {
      await fs.writeFile(tmpSettings, JSON.stringify(settingsPayload, null, 2), "utf8");
    } else {
      await fs.writeFile(tmpSettings, "{}\n", "utf8");
    }

    await createTarGz(outPath, tmpRoot, ["db.sql", "uploads", "settings.json"]);
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }

  const s = await fs.stat(outPath);
  return { filename, size: s.size, createdAt: s.mtimeMs };
}

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const intervalSetting = await prisma.systemSetting
      .findUnique({ where: { key: "BACKUP_INTERVAL_HOURS" } })
      .catch(() => null);

    const intervalHours = Number(intervalSetting?.value);
    const effectiveIntervalHours = Number.isFinite(intervalHours) ? intervalHours : 24;

    if (effectiveIntervalHours <= 0) {
      return;
    }

    const lastSetting = await prisma.systemSetting
      .findUnique({ where: { key: "LAST_AUTO_BACKUP_AT" } })
      .catch(() => null);

    const lastMs = Number(lastSetting?.value);
    const lastAt = Number.isFinite(lastMs) ? lastMs : 0;

    const now = Date.now();
    const dueMs = effectiveIntervalHours * 60 * 60 * 1000;

    if (lastAt > 0 && now - lastAt < dueMs) {
      return;
    }

    const allSettings = await prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
    const settingsPayload = allSettings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    const result = await createServerBackup(settingsPayload);

    await prisma.systemSetting.upsert({
      where: { key: "LAST_AUTO_BACKUP_AT" },
      update: { value: String(now) },
      create: { key: "LAST_AUTO_BACKUP_AT", value: String(now) },
    });

    const projectRoot = resolveProjectRoot();
    const backupDir = await resolveBackupDir(projectRoot);
    const entries = await fs.readdir(backupDir).catch(() => []);
    const backups = await Promise.all(
      entries
        .filter((f) => f.endsWith(".tar.gz") && f.startsWith("tribefinder-backup-"))
        .map(async (filename) => {
          const full = path.join(backupDir, filename);
          const s = await fs.stat(full);
          return { filename, mtimeMs: s.mtimeMs, full };
        })
    );

    backups.sort((a, b) => b.mtimeMs - a.mtimeMs);

    const retentionSetting = await prisma.systemSetting
      .findUnique({ where: { key: "BACKUP_RETENTION_COUNT" } })
      .catch(() => null);
    const retentionRaw = Number(retentionSetting?.value);
    const retention = Number.isFinite(retentionRaw) ? Math.floor(retentionRaw) : 30;
    const effectiveRetention = Math.min(365, Math.max(1, retention));

    const toDelete = backups.slice(effectiveRetention);
    for (const b of toDelete) {
      await fs.rm(b.full, { force: true });
    }

    process.stdout.write(
      JSON.stringify({ ok: true, created: result, deletedOld: toDelete.length }) + "\n"
    );
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(1);
});
