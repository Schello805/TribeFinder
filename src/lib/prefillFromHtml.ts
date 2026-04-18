type MetaKey = { attr: "name" | "property"; value: string };

export type PrefillFromHtmlResult = {
  website: string;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  contactEmail: string | null;
};

function pickFirst(...values: Array<string | null | undefined>) {
  for (const v of values) {
    const s = (v || "").trim();
    if (s) return s;
  }
  return "";
}

function escapeRegExp(v: string) {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractTitle(html: string): string {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? normalizeText(m[1]) : "";
}

function extractMeta(html: string, key: MetaKey): string {
  const re = new RegExp(
    `<meta[^>]*\\b${key.attr}\\s*=\\s*["']${escapeRegExp(key.value)}["'][^>]*>`,
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

function extractFirstTagText(html: string, tagName: string): string {
  const re = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const m = re.exec(html);
  return m ? htmlToText(m[1]) : "";
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

function normalizeText(text: string) {
  return htmlDecode(text).replace(/\s+/g, " ").trim();
}

function htmlDecode(text: string) {
  const input = (text || "").replace(/&nbsp;/gi, " ");
  return input
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(String(n), 16)))
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function removeTagWithContent(html: string, tagNames: string[]) {
  let out = html;
  for (const tag of tagNames) {
    out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  }
  return out;
}

function removeTag(html: string, tagNames: string[]) {
  let out = html;
  for (const tag of tagNames) {
    out = out.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi"), " ");
  }
  return out;
}

function htmlToText(html: string) {
  let out = html || "";
  out = removeTagWithContent(out, ["script", "style", "noscript", "svg", "canvas"]);
  out = out.replace(/<!--([\s\S]*?)-->/g, " ");

  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<\/(p|div|li|h[1-6]|section|article|main|header|footer|nav|aside|blockquote|pre|tr)>/gi, "\n\n");
  out = out.replace(/<\/(td|th)>/gi, "\n");
  out = out.replace(/<hr\b[^>]*>/gi, "\n\n");

  out = out.replace(/<[^>]+>/g, " ");
  out = htmlDecode(out);
  out = out.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n");
  out = out.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ");
  return out.trim();
}

function extractReadableDescriptionFromHtml(html: string) {
  const body = (() => {
    const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
    if (main?.[1]) return main[1];
    const article = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html);
    if (article?.[1]) return article[1];
    const bodyMatch = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
    return bodyMatch?.[1] || html;
  })();

  let cleaned = body;
  cleaned = removeTagWithContent(cleaned, ["script", "style", "noscript", "svg", "canvas", "head"]);
  cleaned = removeTagWithContent(cleaned, ["nav", "header", "footer", "aside", "form"]);
  cleaned = removeTag(cleaned, ["button"]);

  const text = htmlToText(cleaned);
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((p) => p.length >= 40)
    .filter((p) => !/^(impressum|datenschutz|kontakt|links?)$/i.test(p));

  if (!paragraphs.length) return "";

  const picked: string[] = [];
  let total = 0;
  for (const p of paragraphs) {
    picked.push(p);
    total += p.length;
    if (picked.length >= 3 || total >= 700) break;
  }

  return picked.join("\n\n").trim();
}

function hostnameBrandLabel(url: URL) {
  const host = (url.hostname || "").toLowerCase().replace(/^www\./, "");
  const first = host.split(".").filter(Boolean)[0] || "";
  return first.replace(/[^a-z0-9-]/g, "");
}

function normalizeBrand(value: string) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function brandDisplayFromLabel(label: string) {
  const raw = (label || "").trim();
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function isAllCaps(value: string) {
  const s = (value || "").trim();
  const letters = s.replace(/[^a-z]/gi, "");
  if (!letters) return false;
  return letters === letters.toUpperCase();
}

function splitTitleIntoSegments(title: string) {
  return (title || "")
    .split(/\s*[|•·»«]\s*|\s+[-–—:]\s+/g)
    .map((s) => normalizeText(s))
    .filter(Boolean);
}

function extractBrandTokenFromText(text: string, brandLabel: string) {
  const label = (brandLabel || "").trim();
  if (!label) return "";
  const re = new RegExp(escapeRegExp(label), "ig");
  const m = re.exec(text);
  return m ? m[0] : "";
}

function pickNameFromSignals(signals: { ogSiteName: string; ogTitle: string; title: string; h1: string; brandLabel: string }) {
  const { ogSiteName, ogTitle, title, h1, brandLabel } = signals;
  const brandNorm = normalizeBrand(brandLabel);

  const candidateBrand = pickFirst(ogSiteName, brandDisplayFromLabel(brandLabel));
  if (candidateBrand && normalizeBrand(candidateBrand) === brandNorm) {
    return isAllCaps(candidateBrand) ? brandDisplayFromLabel(brandLabel) : candidateBrand;
  }

  const titleSegments = [...splitTitleIntoSegments(ogTitle), ...splitTitleIntoSegments(title)];
  for (const seg of titleSegments) {
    if (!seg) continue;
    if (brandNorm && normalizeBrand(seg).includes(brandNorm)) {
      const token = extractBrandTokenFromText(seg, brandLabel);
      if (token) return isAllCaps(token) ? brandDisplayFromLabel(brandLabel) : token;
      return brandDisplayFromLabel(brandLabel) || seg;
    }
  }

  if (brandNorm && normalizeBrand(h1).includes(brandNorm)) {
    const token = extractBrandTokenFromText(h1, brandLabel);
    if (token) return isAllCaps(token) ? brandDisplayFromLabel(brandLabel) : token;
    return brandDisplayFromLabel(brandLabel) || h1;
  }

  const shortSegment = titleSegments
    .filter((s) => s.length >= 3 && s.length <= 60)
    .sort((a, b) => a.length - b.length)[0];
  if (shortSegment) return shortSegment;

  if (ogSiteName) return ogSiteName;
  if (h1 && h1.length <= 60) return h1;
  return brandDisplayFromLabel(brandLabel);
}

export function extractPrefillFromHtml(html: string, baseUrl: URL): PrefillFromHtmlResult {
  const ogTitle = extractMeta(html, { attr: "property", value: "og:title" });
  const ogDescription = extractMeta(html, { attr: "property", value: "og:description" });
  const ogImage = extractMeta(html, { attr: "property", value: "og:image" });
  const ogSiteName = extractMeta(html, { attr: "property", value: "og:site_name" });
  const metaDescription = extractMeta(html, { attr: "name", value: "description" });
  const title = extractTitle(html);
  const h1 = extractFirstTagText(html, "h1");
  const canonical = extractCanonicalUrl(html);
  const email = extractFirstMailto(html);

  const website = safeResolveUrl(baseUrl, canonical) || baseUrl.toString();
  const brandLabel = hostnameBrandLabel(baseUrl);

  const nameRaw = pickNameFromSignals({ ogSiteName, ogTitle, title, h1, brandLabel }).slice(0, 120).trim();

  const bodyDescription = extractReadableDescriptionFromHtml(html);
  const descriptionRaw = pickFirst(bodyDescription, ogDescription, metaDescription).slice(0, 2_000).trim();
  const imageUrl = safeResolveUrl(baseUrl, ogImage);

  return {
    website,
    name: nameRaw || null,
    description: descriptionRaw || null,
    imageUrl: imageUrl || null,
    contactEmail: email || null,
  };
}

