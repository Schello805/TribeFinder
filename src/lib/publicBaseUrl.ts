import { headers } from "next/headers";

export async function getPublicBaseUrl(): Promise<string> {
  // Prefer request headers (works behind reverse proxies) to ensure canonicals, sitemap and robots
  // point to the currently accessed host.
  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") || h.get("host") || "").trim();
    const proto = (h.get("x-forwarded-proto") || "").trim();
    if (host) {
      const scheme =
        proto === "http" || proto === "https" ? proto : process.env.NODE_ENV === "development" ? "http" : "https";
      return `${scheme}://${host}`.replace(/\/+$/, "");
    }
  } catch {
    // ignore (e.g. headers() not available in some build contexts)
  }

  const rawBase = (process.env.SITE_URL || process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
  const fallbackProtocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const fallbackBase = `${fallbackProtocol}://localhost:3000`;
  const baseUrl = (rawBase || fallbackBase).replace(
    /^http:\/\//i,
    process.env.NODE_ENV === "development" ? "http://" : "https://"
  );

  return baseUrl.replace(/\/+$/, "");
}
