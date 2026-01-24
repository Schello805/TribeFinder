import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const resolveProjectRoot = () => {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
};

const projectRoot = resolveProjectRoot();

const normalizedDatabaseUrl = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/\r?\n/g, "").trim()
  : null;

const defaultSqliteUrl = `file:${path.join(projectRoot, "prisma", "dev.db")}`;

const collapseDuplicatePrismaDir = (p: string) => p.replace(/\/(?:prisma\/)+/g, "/prisma/");

if (!normalizedDatabaseUrl || !normalizedDatabaseUrl.startsWith("file:")) {
  process.env.DATABASE_URL = defaultSqliteUrl;
} else {
  const rawSqlitePath = normalizedDatabaseUrl.replace(/^file:/, "");
  const resolved = (() => {
    if (path.isAbsolute(rawSqlitePath)) return rawSqlitePath;

    const asProjectRoot = path.resolve(projectRoot, rawSqlitePath);

    const stripped = rawSqlitePath.replace(/^\.\//, "");
    const asPrismaDir = path.resolve(projectRoot, "prisma", stripped);

    // Prisma CLI resolves relative sqlite paths against the schema directory (./prisma).
    // In runtime we prefer the prisma/ directory if it exists to avoid creating a second dev.db in repo root.
    if (fs.existsSync(asPrismaDir)) return asPrismaDir;
    if (stripped === "dev.db" && fs.existsSync(path.join(projectRoot, "prisma"))) return asPrismaDir;

    return asProjectRoot;
  })();
  const normalized = collapseDuplicatePrismaDir(resolved);
  process.env.DATABASE_URL = `file:${normalized}`;
}

const prismaClientSingleton = () => {
  const client = new PrismaClient();

  if (process.env.DATABASE_URL?.startsWith("file:")) {
    const globalForSqlitePragmas = globalThis as unknown as {
      __tf_sqlite_pragmas_applied?: boolean;
    };

    if (!globalForSqlitePragmas.__tf_sqlite_pragmas_applied) {
      globalForSqlitePragmas.__tf_sqlite_pragmas_applied = true;
      void (async () => {
        try {
          await client.$executeRawUnsafe("PRAGMA foreign_keys = ON;");
          await client.$executeRawUnsafe("PRAGMA journal_mode = WAL;");
          await client.$executeRawUnsafe("PRAGMA busy_timeout = 5000;");
        } catch {
          // best-effort only
        }
      })();
    }
  }

  return client;
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
