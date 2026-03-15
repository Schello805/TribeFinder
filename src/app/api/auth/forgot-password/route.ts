import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail, emailTemplate, emailHeading, emailText, emailButton, emailHighlight, getEmailBaseUrl, toAbsoluteUrl } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { hashToken } from "@/lib/tokenHash";
import { recordAdminAudit } from "@/lib/adminAudit";

export async function POST(req: Request) {
  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(`auth:forgot-password:${clientId}`, RATE_LIMITS.auth);
  if (!rateCheck.success) {
    try {
      await recordAdminAudit({
        action: "AUTH_FORGOT_PASSWORD_RATE_LIMITED",
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
    const { email } = await req.json();
    const emailAttempt = String(email || "").toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: 'Email ist erforderlich' }, { status: 400 });
    }

    await recordAdminAudit({
      action: "AUTH_PASSWORD_RESET_REQUESTED",
      targetUserId: null,
      metadata: { ip: clientId, emailAttempt, result: "REQUESTED" },
    });

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await recordAdminAudit({
        action: "AUTH_PASSWORD_RESET_REQUESTED_UNKNOWN_EMAIL",
        targetUserId: null,
        metadata: { ip: clientId, emailAttempt, result: "USER_NOT_FOUND" },
      });
      // Aus Sicherheitsgründen geben wir nicht preis, ob der User existiert oder nicht
      return NextResponse.json({ message: 'Falls ein Account mit dieser Email existiert, wurde eine Email zum Zurücksetzen gesendet.' });
    }

    const resetToken = uuidv4();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 Stunde gültig
    const resetTokenHash = hashToken(resetToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry,
      },
    });

    const baseUrl = getEmailBaseUrl(req);
    const resetUrl = toAbsoluteUrl(`/auth/reset-password?token=${resetToken}`, baseUrl);

    const emailContent = `
      ${emailHeading('Passwort zurücksetzen 🔐')}
      ${emailText('Du hast angefordert, dein Passwort zurückzusetzen. Kein Problem – das passiert den Besten!')}
      ${emailText('Klicke auf den Button unten, um ein neues Passwort festzulegen:')}
      ${emailButton('Neues Passwort festlegen', resetUrl)}
      ${emailHighlight('⏰ Dieser Link ist aus Sicherheitsgründen nur <strong>1 Stunde</strong> gültig.')}
      ${emailText('Falls du dies nicht angefordert hast, kannst du diese E-Mail einfach ignorieren. Dein Passwort bleibt unverändert.')}
    `;

    const html = await emailTemplate(emailContent, 'Setze dein Passwort zurück');
    const mailResult = await sendEmail(email, 'Passwort zurücksetzen - TribeFinder', html);

    await recordAdminAudit({
      action: "AUTH_PASSWORD_RESET_EMAIL_SENT",
      targetUserId: user.id,
      metadata: {
        ip: clientId,
        emailAttempt,
        emailed: Boolean(mailResult?.success),
        resetTokenExpiry: resetTokenExpiry.toISOString(),
      },
    });

    return NextResponse.json({ message: 'Falls ein Account mit dieser Email existiert, wurde eine Email zum Zurücksetzen gesendet.' });

  } catch (error) {
    console.error('Password reset request error:', error);
    try {
      const clientId = getClientIdentifier(req);
      await recordAdminAudit({
        action: "AUTH_PASSWORD_RESET_REQUEST_FAILED",
        targetUserId: null,
        metadata: { ip: clientId, result: "ERROR" },
      });
    } catch {
      // best-effort only
    }
    return NextResponse.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 });
  }
}
