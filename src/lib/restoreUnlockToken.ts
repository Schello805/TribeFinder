import crypto from "crypto";

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64");
}

function hmacSha256(secret: string, data: string): string {
  return base64UrlEncode(crypto.createHmac("sha256", secret).update(data).digest());
}

export type RestoreUnlockPayload = {
  userId: string;
  role: string;
  exp: number;
};

export function createRestoreUnlockToken(secret: string, payload: RestoreUnlockPayload): string {
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = hmacSha256(secret, body);
  return `${body}.${sig}`;
}

export function verifyRestoreUnlockToken(secret: string, token: string): RestoreUnlockPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = hmacSha256(secret, body);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  let payload: RestoreUnlockPayload;
  try {
    payload = JSON.parse(base64UrlDecode(body).toString("utf8")) as RestoreUnlockPayload;
  } catch {
    return null;
  }

  if (!payload?.userId || !payload?.role || typeof payload.exp !== "number") return null;
  if (Date.now() > payload.exp) return null;

  return payload;
}
