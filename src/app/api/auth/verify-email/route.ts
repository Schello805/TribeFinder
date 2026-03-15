import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashToken } from "@/lib/tokenHash";
import { getClientIdentifier } from "@/lib/rateLimit";
import { recordAdminAudit } from "@/lib/adminAudit";

export async function POST(req: Request) {
  try {
    const clientId = getClientIdentifier(req);
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
      await recordAdminAudit({
        action: "AUTH_VERIFY_EMAIL_FAILED_INVALID_TOKEN",
        targetUserId: null,
        metadata: { ip: clientId, result: "INVALID_TOKEN" },
      });
      return NextResponse.json({ message: "Ungültiger oder abgelaufener Link" }, { status: 400 });
    }

    if (user.emailVerified) {
      await recordAdminAudit({
        action: "AUTH_VERIFY_EMAIL_ALREADY_VERIFIED",
        targetUserId: user.id,
        metadata: { ip: clientId, result: "ALREADY_VERIFIED" },
      });
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

    await recordAdminAudit({
      action: "AUTH_VERIFY_EMAIL_SUCCESS",
      targetUserId: user.id,
      metadata: { ip: clientId, result: "SUCCESS" },
    });

    return NextResponse.json({ ok: true, message: "E-Mail-Adresse erfolgreich bestätigt" });
  } catch (error) {
    return NextResponse.json(
      { message: "Bestätigung fehlgeschlagen", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
