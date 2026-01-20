import { PrismaClient } from "@prisma/client";
import path from "node:path";

const normalizedDatabaseUrl = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/\r?\n/g, "").trim()
  : null;

const defaultSqliteUrl = `file:${path.join(process.cwd(), "dev.db")}`;

const normalizedSqliteUrl = normalizedDatabaseUrl
  ? normalizedDatabaseUrl
      .replace(/^file:\.\.\/dev\.db$/, "file:./dev.db")
      .replace(/^file:\.\.\/\.\.\/dev\.db$/, "file:./dev.db")
      .replace(/^file:prisma\/dev\.db$/, "file:./dev.db")
      .replace(/^file:\.\/prisma\/dev\.db$/, "file:./dev.db")
      .replace(/^file:\.\.\/prisma\/dev\.db$/, "file:./dev.db")
  : null;

if (!normalizedSqliteUrl || !normalizedSqliteUrl.startsWith("file:")) {
  process.env.DATABASE_URL = defaultSqliteUrl;
} else {
  // If the URL is relative (file:./..., file:../...), resolve it to an absolute path
  // so Prisma always points to the same sqlite file across build/runtime contexts.
  if (/^file:\.\.?:\//.test(normalizedSqliteUrl)) {
    const relPath = normalizedSqliteUrl.replace(/^file:/, "");
    process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), relPath)}`;
  } else {
    process.env.DATABASE_URL = normalizedSqliteUrl;
  }
}

const prismaClientSingleton = () => {
  return new PrismaClient()
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
