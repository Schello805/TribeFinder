import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonBadRequest, jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { sendEmail, emailTemplate, emailHeading, emailText, emailButton, emailHighlight, getEmailBaseUrl, toAbsoluteUrl } from "@/lib/email";

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

  const rateKey = `admin:password-reset:${session.user.id}:${targetUserId}`;
  const rateCheck = checkRateLimit(rateKey, { limit: 5, windowSeconds: 60 * 60 });
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true },
    });

    if (!user) return jsonBadRequest("Benutzer nicht gefunden");

    const resetToken = uuidv4();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        resetToken,
        resetTokenExpiry,
      },
      select: { id: true },
    });

    const baseUrl = getEmailBaseUrl(req);
    const resetUrl = toAbsoluteUrl(`/auth/reset-password?token=${resetToken}`, baseUrl);

    let emailed = false;
    if (parsed.data.sendEmail) {
      const displayName = user.name || "";
      const emailContent = `
        ${emailHeading("Passwort zurücksetzen 🔐")}
        ${emailText(
          displayName
            ? `Ein Administrator hat für deinen Account (<strong>${displayName}</strong>) einen Passwort-Reset angestoßen.`
            : "Ein Administrator hat für deinen Account einen Passwort-Reset angestoßen."
        )}
        ${emailText("Klicke auf den Button unten, um ein neues Passwort festzulegen:")}
        ${emailButton("Neues Passwort festlegen", resetUrl)}
        ${emailHighlight("⏰ Dieser Link ist aus Sicherheitsgründen nur <strong>1 Stunde</strong> gültig.")}
        ${emailText("Wenn du das nicht erwartest, ignoriere diese E-Mail. Dein Passwort bleibt unverändert.")}
      `;

      const html = await emailTemplate(emailContent, "Passwort zurücksetzen");
      const result = await sendEmail(user.email, "Passwort zurücksetzen - TribeFinder", html);
      emailed = Boolean(result?.success);
    }

    return NextResponse.json({
      ok: true,
      resetUrl,
      resetTokenExpiry: resetTokenExpiry.toISOString(),
      emailed,
    });
  } catch (error) {
    return jsonServerError("Passwort-Reset konnte nicht erstellt werden", error);
  }
}
