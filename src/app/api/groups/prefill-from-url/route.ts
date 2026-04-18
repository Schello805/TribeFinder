import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "@/lib/rateLimit";
import { isProbablyPrivateIp } from "@/lib/urlSafety";

const bodySchema = z.object({
  url: z.string().trim().url(),
});

function pickFirst(...values: Array<string | null | undefined>) {
  for (const v of values) {
    const s = (v || "").trim();
    if (s) return s;
  }
  return "";
}

function extractTitle(html: string): string {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function extractMeta(html: string, key: { attr: "name" | "property"; value: string }): string {
  // Looks for: <meta name="description" content="...">
  const re = new RegExp(
    `<meta[^>]*\\b${key.attr}\\s*=\\s*["']${key.value.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}["'][^>]*>`,
    "ig"
  );
  let match: RegExpExecArray | null = null;
  while ((match = re.exec(html))) {
    const tag = match[0] || "";
    const cm = /\bcontent\s*=\s*["']([^"']+)["']/i.exec(tag);
    const content = cm ? cm[1].trim() : "";
    if (content) return content;
  }
  return "";
}

function extractCanonicalUrl(html: string): string {
  const m = /<link[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i.exec(html);
  if (!m) return "";
  const tag = m[0] || "";
  const hm = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
  return hm ? hm[1].trim() : "";
}

function extractFirstMailto(html: string): string {
  const m = /\bmailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/i.exec(html);
  return m ? m[1].trim() : "";
}

function safeResolveUrl(base: URL, maybeUrl: string): string {
  const raw = (maybeUrl || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw, base).toString();
  } catch {
    return "";
  }
}

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

    const ogTitle = extractMeta(html, { attr: "property", value: "og:title" });
    const ogDescription = extractMeta(html, { attr: "property", value: "og:description" });
    const ogImage = extractMeta(html, { attr: "property", value: "og:image" });
    const metaDescription = extractMeta(html, { attr: "name", value: "description" });
    const title = extractTitle(html);
    const canonical = extractCanonicalUrl(html);
    const email = extractFirstMailto(html);

    const website = safeResolveUrl(baseUrl, canonical) || baseUrl.toString();
    const name = pickFirst(ogTitle, title).slice(0, 120);
    const description = pickFirst(ogDescription, metaDescription).slice(0, 2_000);
    const imageUrl = safeResolveUrl(baseUrl, ogImage);

    return NextResponse.json(
      {
        website,
        name: name || null,
        description: description || null,
        imageUrl: imageUrl || null,
        contactEmail: email || null,
      },
      { status: 200 }
    );
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return NextResponse.json({ message: "Timeout beim Laden der Seite" }, { status: 408 });
    }
    return NextResponse.json({ message: "Fehler beim Laden der Seite" }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}

