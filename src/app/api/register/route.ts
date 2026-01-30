import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { v4 as uuidv4 } from "uuid";
import { sendEmail, emailTemplate, emailHeading, emailText, emailButton, emailHighlight } from "@/lib/email";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
  name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein"),
});

export async function POST(req: Request) {
  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(`register:${clientId}`, RATE_LIMITS.register);
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  try {
    const body = await req.json();
    const { email, password, name } = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = uuidv4();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "ADMIN" : "USER";

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        dancerName: name, // Use name as default dancer name
        role,
        notifyInboxMessages: true,
        emailVerified: null,
        verificationToken,
        verificationTokenExpiry,
      },
    });

    const verifyUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`;
    const emailContent = `
      ${emailHeading('E-Mail-Adresse bestätigen ✅')}
      ${emailText('Willkommen bei TribeFinder! Bitte bestätige deine E-Mail-Adresse, damit du dich anmelden kannst.')}
      ${emailText('Klicke auf den Button unten, um deine E-Mail-Adresse zu bestätigen:')}
      ${emailButton('E-Mail bestätigen', verifyUrl)}
      ${emailHighlight('⏰ Dieser Link ist aus Sicherheitsgründen nur <strong>24 Stunden</strong> gültig.')}
      ${emailText('Wenn du dich nicht registriert hast, kannst du diese E-Mail ignorieren.')}
    `;

    const html = await emailTemplate(emailContent, 'Bestätige deine E-Mail-Adresse');
    await sendEmail(email, 'E-Mail bestätigen - TribeFinder', html);

    // Entferne das Passwort aus der Antwort
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;

    return NextResponse.json(
      { message: "Registrierung erfolgreich. Bitte bestätige deine E-Mail-Adresse (Link 24h gültig), bevor du dich anmelden kannst.", user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Ungültige Eingabedaten", errors: error.issues },
        { status: 400 }
      );
    }
    
    console.error("Registrierungsfehler:", error);
    return NextResponse.json(
      { message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
