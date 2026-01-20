import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import logger from "@/lib/logger";
import { parseUserAgent } from "@/lib/userAgent";
import { emailHeading, emailHighlight, emailText, emailTemplate, sendEmail } from "@/lib/email";

const createFeedbackSchema = z.object({
  message: z.string().trim().min(3).max(5000),
  reporterName: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  reporterEmail: z
    .string()
    .trim()
    .email()
    .max(320)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  pageUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const parsed = createFeedbackSchema.parse(body);

    const userAgent = req.headers.get("user-agent") ?? undefined;
    const uaInfo = parseUserAgent(userAgent);

    const created = await prisma.feedback.create({
      data: {
        message: parsed.message,
        reporterName: parsed.reporterName,
        reporterEmail: parsed.reporterEmail,
        pageUrl: parsed.pageUrl,
        userAgent,
        browser: uaInfo.browser,
        os: uaInfo.os,
        userId: session?.user?.id ?? null,
      },
      select: { id: true },
    });

    try {
      const notifySetting = await prisma.systemSetting
        .findUnique({ where: { key: "FEEDBACK_NOTIFY_EMAIL" } })
        .catch(() => null);
      const notifyEmail = (notifySetting?.value || process.env.FEEDBACK_NOTIFY_EMAIL || "").trim();

      if (notifyEmail) {
        const subject = "Neues Feedback (TribeFinder)";
        const content =
          (await emailHeading("Neues Feedback")) +
          (await emailText(`Seite: ${parsed.pageUrl || "(unbekannt)"}`)) +
          (await emailHighlight(parsed.message));

        const html = await emailTemplate(content, "Neues Feedback eingegangen");
        const result = await sendEmail(notifyEmail, subject, html);
        if (!result.success) {
          logger.warn({ notifyEmail, error: result.error }, "Feedback email notification failed");
        }
      }
    } catch (mailError) {
      logger.warn({ mailError }, "Feedback email notification threw");
    }

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues[0];
      const details = first
        ? `${first.path.join(".") || "field"}: ${first.message}`
        : undefined;

      logger.warn(
        { issues: error.issues, details },
        "POST /api/feedback validation failed"
      );

      return NextResponse.json(
        { message: "Ungültige Daten", details, errors: error.issues },
        { status: 400 }
      );
    }

    const errorDetails =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { value: error };

    logger.error({ error: errorDetails }, "Error saving feedback");

    return NextResponse.json(
      {
        message: "Feedback konnte nicht gespeichert werden",
        details: process.env.NODE_ENV !== "production" ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}
