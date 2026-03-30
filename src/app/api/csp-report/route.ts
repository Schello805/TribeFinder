import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    logger.warn({ report: body }, "CSP report");
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error }, "CSP report error");
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
