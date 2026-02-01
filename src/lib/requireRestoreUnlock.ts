import { cookies } from "next/headers";
import { verifyRestoreUnlockToken } from "@/lib/restoreUnlockToken";

export async function requireRestoreUnlock() {
  const cookieStore = await cookies();
  const token = cookieStore.get("tf_restore_unlock")?.value;
  if (!token) return null;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  return verifyRestoreUnlockToken(secret, token);
}
