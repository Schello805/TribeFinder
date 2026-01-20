import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireAdminSession } from "@/lib/requireAdmin";

type JsonReport = {
  suites?: unknown[];
  errors?: unknown[];
  stats?: {
    expected?: number;
    unexpected?: number;
    flaky?: number;
    skipped?: number;
    duration?: number;
  };
};

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const reportPath = path.join(process.cwd(), "playwright-report", "results.json");
  const raw = await readFile(reportPath, "utf8").catch(() => null);
  if (!raw) {
    return NextResponse.json({
      exists: false,
      message: "Kein E2E-Report gefunden. Führe zuerst: npm run e2e",
    });
  }

  let parsed: JsonReport | null = null;
  try {
    parsed = JSON.parse(raw) as JsonReport;
  } catch {
    return NextResponse.json({
      exists: true,
      message: "E2E-Report ist nicht lesbar (JSON Parse Error)",
    });
  }

  const stats = parsed?.stats ?? {};
  const unexpected = stats.unexpected ?? 0;
  const expected = stats.expected ?? 0;
  const skipped = stats.skipped ?? 0;
  const flaky = stats.flaky ?? 0;
  const durationMs = stats.duration ?? null;

  return NextResponse.json({
    exists: true,
    ok: unexpected === 0,
    summary: {
      passed: expected,
      failed: unexpected,
      skipped,
      flaky,
      durationMs,
    },
    raw: parsed,
  });
}
