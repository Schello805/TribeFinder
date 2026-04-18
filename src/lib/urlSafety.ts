export function isProbablyPrivateIp(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  if (!h) return true;
  if (h === "localhost") return true;
  if (h.endsWith(".localhost")) return true;
  if (h.endsWith(".local")) return true;

  // IPv6 localhost / link-local / unique local
  if (h === "::1") return true;
  if (h.startsWith("fe80:")) return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // fc00::/7

  // IPv4
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map((x) => Number(x));
  if ([a, b, c, d].some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return true;

  // 127.0.0.0/8
  if (a === 127) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8
  if (a === 0) return true;

  return false;
}

