import { cookies } from "next/headers";
import crypto from "crypto";

const CSRF_TOKEN_NAME = "csrf_token";

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Set CSRF token in cookie (server-side)
 */
export async function setCsrfToken(): Promise<string> {
  const token = generateCsrfToken();
  const cookieStore = await cookies();
  
  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
  });
  
  return token;
}

/**
 * Get CSRF token from cookie (server-side)
 */
export async function getCsrfToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_TOKEN_NAME)?.value;
}

/**
 * Verify CSRF token
 */
export async function verifyCsrfToken(token: string): Promise<boolean> {
  const storedToken = await getCsrfToken();
  return storedToken === token && token.length > 0;
}
