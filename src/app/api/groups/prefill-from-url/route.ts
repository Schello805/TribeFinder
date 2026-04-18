import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "@/lib/rateLimit";
import { isProbablyPrivateIp } from "@/lib/urlSafety";
import { extractPrefillFromHtml } from "@/lib/prefillFromHtml";

const bodySchema = z.object({
  url: z.string().trim().url(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const clientId = getClientIdentifier(req);
  const rate = checkRateLimit(`groups:prefill:${clientId}:${session.user.id}`, { limit: 10, windowSeconds: 60 });
  if (!rate.success) return rateLimitResponse(rate);

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Ungültige URL" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(parsed.data.url);
  } catch {
    return NextResponse.json({ message: "Ungültige URL" }, { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ message: "Nur http(s) URLs sind erlaubt" }, { status: 400 });
  }

  if (isProbablyPrivateIp(target.hostname)) {
    return NextResponse.json({ message: "Diese URL ist nicht erlaubt" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    const res = await fetch(target.toString(), {
      method: "GET",
      headers: {
        "Accept": "text/html,application/xhtml+xml",
        "User-Agent": process.env.PREFILL_USER_AGENT?.trim() || "TribeFinder/1.0",
      },
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      return NextResponse.json({ message: `Seite konnte nicht geladen werden (HTTP ${res.status})` }, { status: 400 });
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return NextResponse.json({ message: "Die URL ist keine HTML-Seite" }, { status: 400 });
    }

    const contentLength = Number(res.headers.get("content-length") || "");
    const MAX_BYTES = 1_000_000;
    if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
      return NextResponse.json({ message: "Seite ist zu groß" }, { status: 413 });
    }

    const htmlRaw = await res.text();
    const html = htmlRaw.length > MAX_BYTES ? htmlRaw.slice(0, MAX_BYTES) : htmlRaw;
    const baseUrl = new URL(res.url || target.toString());
    const result = extractPrefillFromHtml(html, baseUrl);
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return NextResponse.json({ message: "Timeout beim Laden der Seite" }, { status: 408 });
    }
    return NextResponse.json({ message: "Fehler beim Laden der Seite" }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
