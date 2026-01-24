import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { emailHeading, emailHighlight, emailText, emailTemplate, sendEmail } from "@/lib/email";

type ErrorReportInput = {
  route?: string | null;
  status?: number | null;
  message: string;
  details?: string | null;
  stack?: string | null;
};

function normalize(s: string) {
  return s.replace(/\r?\n/g, "\n").trim();
}

function fingerprintOf(input: ErrorReportInput) {
  const base = JSON.stringify({
    route: input.route ?? null,
    status: input.status ?? null,
    message: normalize(input.message || ""),
    stack: input.stack ? normalize(input.stack).split("\n").slice(0, 8).join("\n") : null,
  });

  return crypto.createHash("sha256").update(base).digest("hex");
}

function redactPII(s: string) {
  let out = s;

  out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]");
  out = out.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[REDACTED_IP]");
  out = out.replace(/\b(?:[a-f0-9]{1,4}:){2,7}[a-f0-9]{1,4}\b/gi, "[REDACTED_IP]");
  out = out.replace(/\b\+?[0-9][0-9 ()\-]{6,}[0-9]\b/g, "[REDACTED_PHONE]");

  out = out.replace(/\b(Bearer)\s+[A-Za-z0-9._\-+/=]{8,}\b/g, "$1 [REDACTED_TOKEN]");
  out = out.replace(/\b(access_token|refresh_token|id_token|token|apikey|api_key|password)\b\s*[:=]\s*[^\s,;"']+/gi, "$1=[REDACTED]");
  out = out.replace(/\b(Authorization)\b\s*[:=]\s*[^\r\n]+/gi, "$1: [REDACTED]");

  return out;
}

async function getNotifyEmail(): Promise<string> {
  const fromDb = await prisma.systemSetting
    .findUnique({ where: { key: "ERROR_NOTIFY_EMAIL" } })
    .then((s) => (s?.value || "").trim())
    .catch(() => "");

  return fromDb || (process.env.ERROR_NOTIFY_EMAIL || "").trim();
}

export async function recordServerError(input: ErrorReportInput) {
  try {
    const prismaAny = prisma as any;

    // If Prisma Client is not generated yet or DB not migrated, do not break the app.
    if (!prismaAny?.errorLog?.upsert) return;

    const fingerprint = fingerprintOf(input);

    const now = new Date();
    const message = redactPII((input.message || "Unbekannter Fehler").slice(0, 5000));
    const details = input.details ? redactPII(input.details.slice(0, 10000)) : null;
    const stack = input.stack ? redactPII(input.stack.slice(0, 20000)) : null;

    const row = await prismaAny.errorLog
      .upsert({
        where: { fingerprint },
        update: {
          route: input.route ?? null,
          status: input.status ?? null,
          message,
          details,
          stack,
          count: { increment: 1 },
          lastSeenAt: now,
        },
        create: {
          fingerprint,
          route: input.route ?? null,
          status: input.status ?? null,
          message,
          details,
          stack,
          count: 1,
          firstSeenAt: now,
          lastSeenAt: now,
        },
      })
      .catch((e: unknown) => {
        logger.warn({ e }, "recordServerError upsert failed");
        return null;
      });

    if (!row) return;

    const notifyEmail = await getNotifyEmail().catch(() => "");
    if (!notifyEmail) return;

    const status = input.status ?? 500;
    if (status < 500) return;

    const lastEmail = row.lastEmailSentAt;
    const minIntervalMs = 60 * 60 * 1000;
    if (lastEmail && now.getTime() - lastEmail.getTime() < minIntervalMs) return;

    try {
      const subject = `TribeFinder Fehler (${status})`;

      const content =
        (await emailHeading("Serverfehler erkannt")) +
        (await emailText(`Route: ${input.route || "(unbekannt)"}`)) +
        (await emailText(`Status: ${status}`)) +
        (await emailHighlight(message)) +
        (details ? await emailHighlight(details) : "");

      const html = await emailTemplate(content, "Serverfehler erkannt");
      const result = await sendEmail(notifyEmail, subject, html);

      if (result.success) {
        await prismaAny.errorLog
          .update({ where: { fingerprint }, data: { lastEmailSentAt: now } })
          .catch(() => undefined);
      } else {
        logger.warn({ notifyEmail, error: result.error }, "Error email notification failed");
      }
    } catch (e) {
      logger.warn({ e }, "Error email notification threw");
    }
  } catch (e) {
    logger.warn({ e }, "recordServerError failed");
  }
}
