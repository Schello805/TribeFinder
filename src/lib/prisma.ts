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

const normalizedSqliteUrl = normalizedDatabaseUrl
  ? normalizedDatabaseUrl
      .replace(/^file:\.\.\/dev\.db$/, "file:./dev.db")
      .replace(/^file:\.\.\/\.\.\/dev\.db$/, "file:./dev.db")
      .replace(/^file:prisma\/dev\.db$/, "file:./dev.db")
      .replace(/^file:\.\/prisma\/dev\.db$/, "file:./dev.db")
      .replace(/^file:\.\.\/prisma\/dev\.db$/, "file:./dev.db")
      .replace(/^file:\.\/dev\.db$/, "file:./prisma/dev.db")
  : null;

if (!normalizedSqliteUrl || !normalizedSqliteUrl.startsWith("file:")) {
  process.env.DATABASE_URL = defaultSqliteUrl;
} else {
  const sqlitePath = normalizedSqliteUrl.replace(/^file:/, "");
  if (!path.isAbsolute(sqlitePath)) {
    process.env.DATABASE_URL = `file:${path.resolve(projectRoot, sqlitePath)}`;
  } else {
    process.env.DATABASE_URL = normalizedSqliteUrl;
  }
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
