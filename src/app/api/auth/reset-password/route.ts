import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { hashToken } from "@/lib/tokenHash";
import { recordAdminAudit } from "@/lib/adminAudit";

export async function POST(req: Request) {
  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(`auth:reset-password:${clientId}`, RATE_LIMITS.auth);
  if (!rateCheck.success) {
    try {
      await recordAdminAudit({
        action: "AUTH_RESET_PASSWORD_RATE_LIMITED",
        targetUserId: null,
        metadata: {
          ip: clientId,
          result: "RATE_LIMITED",
          retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000),
        },
      });
    } catch {
      // best-effort only
    }
    return rateLimitResponse(rateCheck);
  }

  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token und neues Passwort sind erforderlich' }, { status: 400 });
    }

    const tokenHash = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      await recordAdminAudit({
        action: "AUTH_PASSWORD_RESET_FAILED_INVALID_TOKEN",
        targetUserId: null,
        metadata: { ip: clientId, result: "INVALID_TOKEN" },
      });
      return NextResponse.json({ error: 'Ungültiges oder abgelaufenes Token' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    await recordAdminAudit({
      action: "AUTH_PASSWORD_RESET_COMPLETED",
      targetUserId: user.id,
      metadata: { ip: clientId, result: "SUCCESS" },
    });

    return NextResponse.json({ message: 'Passwort erfolgreich geändert' });

  } catch (error) {
    console.error('Password reset error:', error);
    try {
      const clientId = getClientIdentifier(req);
      await recordAdminAudit({
        action: "AUTH_PASSWORD_RESET_FAILED_ERROR",
        targetUserId: null,
        metadata: { ip: clientId, result: "ERROR" },
      });
    } catch {
      // best-effort only
    }
    return NextResponse.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 });
  }
}
