import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { createRestoreUnlockToken } from "@/lib/restoreUnlockToken";
import logger from "@/lib/logger";

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { message: "Server ist nicht korrekt konfiguriert (NEXTAUTH_SECRET fehlt)" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password.trim() : "";
  if (!password) return NextResponse.json({ message: "Passwort fehlt" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, password: true, role: true },
  });

  if (!user?.password) {
    return NextResponse.json({ message: "Benutzer nicht gefunden" }, { status: 404 });
  }

  const stored = String(user.password);
  const isBcrypt = stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
  const ok = isBcrypt
    ? await bcrypt.compare(password, stored)
    : (() => {
        const a = Buffer.from(password);
        const b = Buffer.from(stored);
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
      })();
  if (!ok) {
    logger.warn(
      { userId: user.id, email: user.email, isBcrypt },
      "Backup restore unlock failed: invalid password"
    );
    return NextResponse.json(
      {
        message: "Passwort ist falsch",
        forUser: user.email,
        hint: "Es muss das Login-Passwort des aktuell eingeloggten Admin-Accounts sein.",
      },
      { status: 403 }
    );
  }

  const exp = Date.now() + 10 * 60 * 1000;
  const token = createRestoreUnlockToken(secret, {
    userId: user.id,
    role: user.role,
    exp,
  });

  const res = NextResponse.json({ unlockedUntil: exp });
  res.cookies.set({
    name: "tf_restore_unlock",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 10 * 60,
  });

  return res;
}
