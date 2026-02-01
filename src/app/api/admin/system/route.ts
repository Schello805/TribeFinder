import { NextResponse } from "next/server";
import os from "node:os";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonUnauthorized } from "@/lib/apiResponse";

function maskDatabaseUrl(url: string | undefined) {
  if (!url) return null;
  const trimmed = url.replace(/\r?\n/g, "").trim();

  try {
    const u = new URL(trimmed);
    const provider = u.protocol.replace(/:$/, "");

    // Mask password (keep user but remove password)
    const username = u.username || "";
    const host = u.host;
    const database = u.pathname?.replace(/^\//, "") || "";

    const safeAuth = username ? `${username}:***@` : "";
    const safeUrl = `${provider}://${safeAuth}${host}${u.pathname}${u.search}`;

    return {
      provider,
      maskedUrl: safeUrl,
      host,
      database,
      schema: u.searchParams.get("schema"),
    };
  } catch {
    // Fallback: very defensive masking for weird formats
    return {
      provider: "unknown",
      maskedUrl: trimmed.replace(/:\/\/([^:]+):([^@]+)@/g, "://$1:***@"),
    };
  }
}

async function readPackageVersions() {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const raw = await readFile(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

    return {
      next: deps.next ?? null,
      react: deps.react ?? null,
      prisma: deps.prisma ?? null,
      prismaClient: deps["@prisma/client"] ?? null,
      nextAuth: deps["next-auth"] ?? null,
      tailwindcss: deps.tailwindcss ?? null,
    };
  } catch {
    return {
      next: null,
      react: null,
      prisma: null,
      prismaClient: null,
      nextAuth: null,
      tailwindcss: null,
    };
  }
}

function getUploadsInfo() {
  const dir = path.join(process.cwd(), "public", "uploads");
  const exists = fs.existsSync(dir);
  return { path: dir, exists };
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const dbUrl = process.env.DATABASE_URL;

  const checks: { dbPingOk: boolean; dbPingError?: string } = { dbPingOk: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.dbPingOk = true;
  } catch (e) {
    checks.dbPingOk = false;
    checks.dbPingError = e instanceof Error ? e.message : String(e);
  }

  const uploads = getUploadsInfo();

  const info = {
    time: new Date().toISOString(),
    app: {
      nodeEnv: process.env.NODE_ENV ?? null,
      nextauthUrl: process.env.NEXTAUTH_URL ?? null,
      cwd: process.cwd(),
    },
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptimeSec: Math.round(process.uptime()),
      memory: {
        rss: process.memoryUsage().rss,
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
      },
      os: {
        hostname: os.hostname(),
        type: os.type(),
        release: os.release(),
        loadavg: os.loadavg(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
      },
      npmUserAgent: process.env.npm_config_user_agent ?? null,
    },
    packages: await readPackageVersions(),
    database: {
      url: maskDatabaseUrl(dbUrl),
      checks,
    },
    uploads,
  };

  return NextResponse.json(info);
}
