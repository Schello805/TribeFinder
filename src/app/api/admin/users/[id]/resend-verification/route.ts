import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { sendEmail, emailTemplate, emailHeading, emailText, emailButton, emailHighlight, getEmailBaseUrl, toAbsoluteUrl } from "@/lib/email";
import { recordAdminAudit } from "@/lib/adminAudit";

type RouteParams = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  sendEmail: z.boolean().optional().default(true),
});

export async function POST(req: Request, { params }: RouteParams) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const { id: targetUserId } = await params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return jsonBadRequest("Validierungsfehler", { errors: parsed.error.flatten() });
  }

  const rateKey = `admin:resend-verification:${session.user.id}:${targetUserId}`;
  const rateCheck = checkRateLimit(rateKey, { limit: 5, windowSeconds: 60 * 60 });
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user) return jsonBadRequest("Benutzer nicht gefunden");

    if (user.emailVerified) {
      await recordAdminAudit({
        action: "USER_RESEND_VERIFICATION",
        actorAdminId: session.user.id,
        targetUserId: user.id,
        metadata: {
          alreadyVerified: true,
          sendEmail: parsed.data.sendEmail,
        },
      });
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const verificationToken = uuidv4();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        verificationToken,
        verificationTokenExpiry,
      },
      select: { id: true },
    });

    const baseUrl = getEmailBaseUrl(req);
    const verifyUrl = toAbsoluteUrl(`/auth/verify-email?token=${verificationToken}`, baseUrl);

    let emailed = false;
    if (parsed.data.sendEmail) {
      const emailContent = `
        ${emailHeading("E-Mail-Adresse bestätigen ✅")}
        ${emailText("Bitte bestätige deine E-Mail-Adresse, damit du dich anmelden kannst:")}
        ${emailButton("E-Mail bestätigen", verifyUrl)}
        ${emailHighlight("⏰ Dieser Link ist aus Sicherheitsgründen nur <strong>24 Stunden</strong> gültig.")}
      `;

      const html = await emailTemplate(emailContent, "E-Mail-Adresse bestätigen");
      const result = await sendEmail(user.email, "E-Mail bestätigen - TribeFinder", html);
      emailed = Boolean(result?.success);
    }

    await recordAdminAudit({
      action: "USER_RESEND_VERIFICATION",
      actorAdminId: session.user.id,
      targetUserId: user.id,
      metadata: {
        alreadyVerified: false,
        emailed,
        sendEmail: parsed.data.sendEmail,
        verificationTokenExpiry: verificationTokenExpiry.toISOString(),
      },
    });

    return NextResponse.json({
      ok: true,
      alreadyVerified: false,
      verifyUrl,
      verificationTokenExpiry: verificationTokenExpiry.toISOString(),
      emailed,
    });
  } catch (error) {
    return jsonServerError("Verifizierungs-Mail konnte nicht gesendet werden", error);
  }
}
