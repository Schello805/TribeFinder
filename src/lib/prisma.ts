import { PrismaClient } from "@prisma/client";


const normalizedDatabaseUrl = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/\r?\n/g, "").trim()
  : null;

const stripWrappingQuotes = (v: string) => {
  const s = String(v ?? "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).trim();
  }
  return s;
};

const cleanedDatabaseUrl = normalizedDatabaseUrl ? stripWrappingQuotes(normalizedDatabaseUrl) : null;

if (!cleanedDatabaseUrl) {
  throw new Error("DATABASE_URL is required (PostgreSQL-only setup)");
}

process.env.DATABASE_URL = cleanedDatabaseUrl;

const prismaClientSingleton = () => {
  const client = new PrismaClient();
  return client;
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
