import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail, emailTemplate, emailHeading, emailText, emailButton, emailHighlight } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

export async function POST(req: Request) {
  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(`auth:forgot-password:${clientId}`, RATE_LIMITS.auth);
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email ist erforderlich' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Aus Sicherheitsgründen geben wir nicht preis, ob der User existiert oder nicht
      return NextResponse.json({ message: 'Falls ein Account mit dieser Email existiert, wurde eine Email zum Zurücksetzen gesendet.' });
    }

    const resetToken = uuidv4();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 Stunde gültig

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

    const emailContent = `
      ${emailHeading('Passwort zurücksetzen 🔐')}
      ${emailText('Du hast angefordert, dein Passwort zurückzusetzen. Kein Problem – das passiert den Besten!')}
      ${emailText('Klicke auf den Button unten, um ein neues Passwort festzulegen:')}
      ${emailButton('Neues Passwort festlegen', resetUrl)}
      ${emailHighlight('⏰ Dieser Link ist aus Sicherheitsgründen nur <strong>1 Stunde</strong> gültig.')}
      ${emailText('Falls du dies nicht angefordert hast, kannst du diese E-Mail einfach ignorieren. Dein Passwort bleibt unverändert.')}
    `;

    const html = await emailTemplate(emailContent, 'Setze dein Passwort zurück');
    await sendEmail(email, 'Passwort zurücksetzen - TribeFinder', html);

    return NextResponse.json({ message: 'Falls ein Account mit dieser Email existiert, wurde eine Email zum Zurücksetzen gesendet.' });

  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 });
  }
}
