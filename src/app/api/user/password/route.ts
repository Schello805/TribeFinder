import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

const schema = z.object({
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(`user:password:${session.user.id}:${clientId}`, RATE_LIMITS.auth);
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  try {
    const body = await req.json();
    const { password } = schema.parse(body);

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({ ok: true, message: "Passwort erfolgreich geändert" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Ungültige Eingabedaten", errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Passwort ändern fehlgeschlagen", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
