#!/usr/bin/env node

const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");

const DAY_MS = 24 * 60 * 60 * 1000;

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

async function getSystemSettings(prisma, keys) {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: keys } },
      select: { key: true, value: true },
    });
    return rows.reduce((acc, r) => {
      acc[r.key] = r.value;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function parseBool(v, fallback) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return fallback;
}

function parsePositiveInt(v, fallback) {
  const n = Number(String(v ?? "").trim());
  if (!Number.isFinite(n)) return fallback;
  if (n <= 0) return fallback;
  return Math.floor(n);
}

async function sendEmail(transporter, from, to, subject, html) {
  if (!transporter) return { ok: false, reason: "SMTP missing" };
  await transporter.sendMail({ from, to, subject, html });
  return { ok: true };
}

function needsShareFields(event) {
  const flyer1 = String(event.flyer1 || "").trim();
  const flyer2 = String(event.flyer2 || "").trim();
  const website = String(event.website || "").trim();
  const ticketLink = String(event.ticketLink || "").trim();
  return !flyer1 && !flyer2 && !website && !ticketLink;
}

function resolveRecipient(event) {
  if (event.creator && event.creator.email && event.creator.emailNotifications) {
    return { userId: event.creator.id, email: event.creator.email };
  }
  if (event.group && event.group.owner && event.group.owner.email && event.group.owner.emailNotifications) {
    return { userId: event.group.owner.id, email: event.group.owner.email };
  }
  return null;
}

function buildHtml(params) {
  const baseUrl = getBaseUrl();
  const eventUrl = `${baseUrl}/events/${params.eventId}`;
  const editUrl = params.groupId
    ? `${baseUrl}/groups/${params.groupId}/events/${params.eventId}/edit`
    : `${baseUrl}/events/${params.eventId}/edit`;
  const settingsUrl = `${baseUrl}/dashboard/notifications`;

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:24px;color:#fff;font-weight:700;">TribeFinder</div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 12px 0;font-size:20px;color:#111827;">Mach dein Event leichter teilbar</h1>
      <p style="margin:0 0 12px 0;color:#374151;line-height:1.6;"><strong>${params.title}</strong></p>
      <p style="margin:0 0 18px 0;color:#374151;line-height:1.6;">Wenn du Flyer oder einen Link ergänzt, können andere dein Event einfacher teilen.</p>
      <a href="${editUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;">Event ergänzen</a>
      <a href="${eventUrl}" style="display:inline-block;margin-left:10px;background:#fff;color:#111827;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;border:1px solid #e5e7eb;">Event ansehen</a>
      <p style="margin:18px 0 0 0;color:#6b7280;font-size:12px;">Du möchtest solche E-Mails nicht mehr? <a href="${settingsUrl}" style="color:#6366f1;">Benachrichtigungen anpassen</a>.</p>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const now = new Date();
    const { transporter, from } = await getMailer(prisma);

    const settings = await getSystemSettings(prisma, [
      "PLG_EMAILS_ENABLED",
      "PLG_EVENT_SHARE_REMINDERS_ENABLED",
      "PLG_EVENT_SHARE_DAYS_1",
      "PLG_EVENT_SHARE_DAYS_2",
    ]);

    const plgEnabled = parseBool(settings.PLG_EMAILS_ENABLED, true);
    const hookEnabled = parseBool(settings.PLG_EVENT_SHARE_REMINDERS_ENABLED, true);
    if (!plgEnabled || !hookEnabled) {
      process.stdout.write(JSON.stringify({ ok: true, skipped: true, reason: "disabled" }) + "\n");
      return;
    }

    const days1 = parsePositiveInt(settings.PLG_EVENT_SHARE_DAYS_1, 2);
    const days2 = parsePositiveInt(settings.PLG_EVENT_SHARE_DAYS_2, 7);

    const steps = [
      { key: "STEP_1", minAgeMs: days1 * DAY_MS, maxAgeMs: (days1 + 1) * DAY_MS },
      { key: "STEP_2", minAgeMs: days2 * DAY_MS, maxAgeMs: (days2 + 1) * DAY_MS },
    ];

    let considered = 0;
    let sent = 0;

    for (const step of steps) {
      const windowStart = new Date(now.getTime() - step.maxAgeMs);
      const windowEnd = new Date(now.getTime() - step.minAgeMs);

      const events = await prisma.event.findMany({
        where: {
          createdAt: { gte: windowStart, lte: windowEnd },
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          flyer1: true,
          flyer2: true,
          website: true,
          ticketLink: true,
          groupId: true,
          creator: { select: { id: true, email: true, emailNotifications: true } },
          group: { select: { owner: { select: { id: true, email: true, emailNotifications: true } } } },
        },
        take: 500,
      });

      for (const e of events) {
        considered += 1;
        if (!needsShareFields(e)) continue;
        const r = resolveRecipient(e);
        if (!r?.email) continue;

        const alreadySent = await prisma.plgEmailNotificationState.findUnique({
          where: {
            userId_notificationType_targetId_step: {
              userId: r.userId,
              notificationType: "EVENT_SHARE",
              targetId: e.id,
              step: step.key,
            },
          },
          select: { id: true },
        });

        if (alreadySent) continue;

        const subject = `Tipp: Event leichter teilen (${e.title})`;
        const html = buildHtml({ eventId: e.id, groupId: e.groupId, title: e.title });
        const result = await sendEmail(transporter, from, r.email, subject, html);
        if (!result.ok) continue;

        await prisma.plgEmailNotificationState.create({
          data: {
            userId: r.userId,
            notificationType: "EVENT_SHARE",
            targetType: "EVENT",
            targetId: e.id,
            step: step.key,
            lastSentAt: now,
          },
          select: { id: true },
        });

        sent += 1;
      }
    }

    process.stdout.write(JSON.stringify({ ok: true, considered, sent }) + "\n");
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(1);
});
