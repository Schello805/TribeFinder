#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

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

function parseSqlitePathFromDatabaseUrl(databaseUrl) {
  const trimmed = String(databaseUrl || "").trim();
  if (!trimmed.startsWith("file:")) {
    throw new Error("DATABASE_URL ist kein SQLite file:-Pfad");
  }
  const withoutScheme = trimmed.replace(/^file:/, "");
  const cleaned = withoutScheme.replace(/^\/\//, "");
  return path.isAbsolute(cleaned) ? cleaned : path.join(process.cwd(), cleaned);
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
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL fehlt");

  const dbPath = parseSqlitePathFromDatabaseUrl(databaseUrl);
  const uploadsDir = path.join(process.cwd(), "public/uploads");

  const backupDir = path.join(process.cwd(), "backups");
  await fs.mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `tribefinder-backup-${timestamp}.tar.gz`;
  const outPath = path.join(backupDir, filename);

  await fs.stat(dbPath).catch(() => {
    throw new Error(`DB nicht gefunden: ${dbPath}`);
  });

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tribefinder-backup-"));
  try {
    const tmpDb = path.join(tmpRoot, "db.sqlite");
    const tmpUploads = path.join(tmpRoot, "uploads");
    const tmpSettings = path.join(tmpRoot, "settings.json");

    await fs.cp(dbPath, tmpDb);

    const uploadsExists = await fs
      .stat(uploadsDir)
      .then(() => true)
      .catch(() => false);

    if (uploadsExists) {
      await fs.cp(uploadsDir, tmpUploads, { recursive: true });
    } else {
      await fs.mkdir(tmpUploads, { recursive: true });
    }

    if (settingsPayload && typeof settingsPayload === "object") {
      await fs.writeFile(tmpSettings, JSON.stringify(settingsPayload, null, 2), "utf8");
    } else {
      await fs.writeFile(tmpSettings, "{}\n", "utf8");
    }

    await createTarGz(outPath, tmpRoot, ["db.sqlite", "uploads", "settings.json"]);
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

    const backupDir = path.join(process.cwd(), "backups");
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
    const MAX_BACKUPS = 30;
    const toDelete = backups.slice(MAX_BACKUPS);
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
