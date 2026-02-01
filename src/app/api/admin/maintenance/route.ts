import { NextResponse } from "next/server";
import path from "path";
import { readFile, writeFile } from "fs/promises";
import { requireAdminSession } from "@/lib/requireAdmin";

function parseEnvValue(raw: string) {
  const s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function isEnabled(value: string | undefined) {
  const v = (value || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

async function readEnvFile(projectRoot: string) {
  const envPath = path.join(projectRoot, ".env");
  const content = await readFile(envPath, "utf8").catch(() => "");
  return { envPath, content };
}

function upsertEnvVar(envContent: string, key: string, value: string) {
  const lines = envContent.split(/\r?\n/);
  const kv = `${key}="${value}"`;
  let found = false;
  const out = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return kv;
    }
    return line;
  });
  if (!found) out.push(kv);
  return out.join("\n").replace(/\n+$/, "\n");
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const projectRoot = process.cwd();
  const { envPath, content } = await readEnvFile(projectRoot);

  const match = content
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("MAINTENANCE_MODE="));

  const fileValue = match ? parseEnvValue(match.split("=").slice(1).join("=")) : undefined;

  return NextResponse.json({
    enabled: isEnabled(process.env.MAINTENANCE_MODE),
    envFileEnabled: isEnabled(fileValue),
    envPath,
    restartRequired: true,
  });
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { enabled?: boolean } | null;
  const enabled = Boolean(body?.enabled);

  const projectRoot = process.cwd();
  const { envPath, content } = await readEnvFile(projectRoot);
  const updated = upsertEnvVar(content, "MAINTENANCE_MODE", enabled ? "true" : "false");

  await writeFile(envPath, updated, "utf8");

  return NextResponse.json({
    ok: true,
    enabled,
    envPath,
    restartRequired: true,
    message: "Gespeichert. Bitte Service neu starten, damit der Wartungsmodus aktiv wird.",
  });
}
