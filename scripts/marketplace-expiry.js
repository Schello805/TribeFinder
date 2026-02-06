#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const nodemailer = require("nodemailer");

const { PrismaClient } = require("@prisma/client");

const DAY_MS = 24 * 60 * 60 * 1000;

function stripWrappingQuotes(v) {
  const s = String(v ?? "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).trim();
  }
  return s;
}

function getBaseUrl() {
  const envBase = (process.env.SITE_URL || process.env.NEXTAUTH_URL || "").trim();
  const normalized = envBase.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return "http://localhost:3000";
}

async function getMailer(prisma) {
  let config = {};
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "SMTP_SECURE"],
        },
      },
      select: { key: true, value: true },
    });

    config = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
  } catch {
    // ignore
  }

  const host = config.SMTP_HOST || process.env.SMTP_HOST;
  const port = Number(config.SMTP_PORT || process.env.SMTP_PORT) || 587;
  const user = config.SMTP_USER || process.env.SMTP_USER;
  const pass = config.SMTP_PASSWORD || process.env.SMTP_PASSWORD;
  const secure = String(config.SMTP_SECURE || process.env.SMTP_SECURE || "").trim() === "true";
  const from = config.SMTP_FROM || process.env.SMTP_FROM || '"TribeFinder" <noreply@tribefinder.de>';

  if (!host || !user || !pass) {
    return { transporter: null, from };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return { transporter, from };
}

async function resolveUploadsDir() {
  const envDir = stripWrappingQuotes(process.env.UPLOADS_DIR || "").trim();
  return envDir || path.join(process.cwd(), "public", "uploads");
}

async function deleteUploadByPublicUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed.startsWith("/uploads/")) return;

  const filename = trimmed.replace(/^\/uploads\//, "");
  if (!filename) return;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) return;

  const uploadsDir = await resolveUploadsDir();
  const resolvedUploads = path.resolve(uploadsDir);
  const candidate = path.resolve(uploadsDir, filename);
  if (!candidate.startsWith(resolvedUploads + path.sep)) return;

  try {
    await fs.unlink(candidate);
    return true;
  } catch {
    return false;
  }
}

async function sendReminderEmail(transporter, from, to, subject, html) {
  if (!transporter) return { ok: false, reason: "SMTP missing" };
  await transporter.sendMail({ from, to, subject, html });
  return { ok: true };
}

function buildReminderHtml(params) {
  const baseUrl = getBaseUrl();
  const listingUrl = `${baseUrl}/marketplace/${params.listingId}`;

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:24px;color:#fff;font-weight:700;">TribeFinder</div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">Dein Marketplace-Inserat läuft bald ab</h1>
      <p style="margin:0 0 12px 0;color:#374151;line-height:1.6;">Dein Inserat <strong>${params.title}</strong> ist nur noch bis <strong>${params.expiresDate}</strong> online und wird danach automatisch gelöscht.</p>
      <p style="margin:0 0 18px 0;color:#374151;line-height:1.6;">Wenn du es vorher löschen möchtest, öffne das Inserat und verwalte es dort.</p>
      <a href="${listingUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;">Inserat öffnen</a>
      <p style="margin:18px 0 0 0;color:#6b7280;font-size:12px;">Diese E-Mail wurde automatisch versendet.</p>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 27 * DAY_MS);
    const windowEnd = new Date(now.getTime() + 28 * DAY_MS);

    const { transporter, from } = await getMailer(prisma);

    const reminders = await prisma.marketplaceListing.findMany({
      where: {
        reminderSentAt: null,
        expiresAt: { gte: windowStart, lte: windowEnd },
      },
      select: {
        id: true,
        title: true,
        expiresAt: true,
        owner: { select: { id: true, email: true, emailNotifications: true } },
      },
      take: 500,
    });

    let remindersSent = 0;
    for (const l of reminders) {
      const email = l.owner?.email;
      if (!email) continue;
      if (!l.owner.emailNotifications) continue;

      try {
        const expiresDate = l.expiresAt.toLocaleDateString("de-DE");
        const subject = `Reminder: Inserat läuft bald ab (${expiresDate})`;
        const html = buildReminderHtml({ listingId: l.id, title: l.title, expiresDate });
        const result = await sendReminderEmail(transporter, from, email, subject, html);
        if (!result.ok) {
          continue;
        }

        await prisma.marketplaceListing.update({
          where: { id: l.id },
          data: { reminderSentAt: new Date() },
        });
        remindersSent += 1;
      } catch {
        // best-effort
      }
    }

    const expired = await prisma.marketplaceListing.findMany({
      where: { expiresAt: { lte: now } },
      select: { id: true, images: { select: { url: true } } },
      take: 1000,
    });

    let deletedListings = 0;
    let deletedFiles = 0;

    for (const l of expired) {
      const urls = (l.images || []).map((i) => i.url).filter(Boolean);
      try {
        await prisma.marketplaceListing.delete({ where: { id: l.id } });
        deletedListings += 1;
      } catch {
        continue;
      }

      for (const u of urls) {
        const ok = await deleteUploadByPublicUrl(u);
        if (ok) deletedFiles += 1;
      }
    }

    process.stdout.write(
      JSON.stringify({ ok: true, remindersConsidered: reminders.length, remindersSent, expiredConsidered: expired.length, deletedListings, deletedFiles }) +
        "\n"
    );
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(1);
});
