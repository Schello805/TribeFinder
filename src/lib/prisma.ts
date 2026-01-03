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
  // If the URL is relative (file:./..., file:../...), force it to the absolute root dev.db.
  process.env.DATABASE_URL = /^file:\.\.?\//.test(normalizedSqliteUrl)
    ? defaultSqliteUrl
    : normalizedSqliteUrl;
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
