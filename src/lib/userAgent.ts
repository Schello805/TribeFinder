export function parseUserAgent(uaRaw: string | undefined | null): {
  browser?: string;
  os?: string;
} {
  const ua = (uaRaw ?? "").toLowerCase();

  let os: string | undefined;
  if (ua.includes("windows nt")) os = "Windows";
  else if (ua.includes("mac os x") && !ua.includes("iphone") && !ua.includes("ipad")) os = "macOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) os = "iOS";
  else if (ua.includes("linux")) os = "Linux";

  let browser: string | undefined;
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("opr/") || ua.includes("opera")) browser = "Opera";
  else if (ua.includes("chrome/") && !ua.includes("chromium") && !ua.includes("edg/") && !ua.includes("opr/")) browser = "Chrome";
  else if (ua.includes("safari/") && !ua.includes("chrome/") && !ua.includes("chromium")) browser = "Safari";
  else if (ua.includes("firefox/")) browser = "Firefox";

  return { browser, os };
}
