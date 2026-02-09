import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashToken } from "@/lib/tokenHash";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ message: "Token fehlt" }, { status: 400 });
    }

    const tokenHash = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: tokenHash,
        verificationTokenExpiry: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Ungültiger oder abgelaufener Link" }, { status: 400 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: "E-Mail-Adresse wurde bereits bestätigt" }, { status: 200 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    return NextResponse.json({ ok: true, message: "E-Mail-Adresse erfolgreich bestätigt" });
  } catch (error) {
    return NextResponse.json(
      { message: "Bestätigung fehlgeschlagen", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
