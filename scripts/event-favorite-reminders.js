#!/usr/bin/env node

const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

async function getMailer() {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "SMTP_SECURE"] } },
    select: { key: true, value: true },
  }).catch(() => []);
  const config = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
  const host = config.SMTP_HOST || process.env.SMTP_HOST;
  const user = config.SMTP_USER || process.env.SMTP_USER;
  const pass = config.SMTP_PASSWORD || process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;

  return {
    from: config.SMTP_FROM || process.env.SMTP_FROM || '"TribeFinder" <noreply@tribefinder.de>',
    transporter: nodemailer.createTransport({
      host,
      port: Number(config.SMTP_PORT || process.env.SMTP_PORT) || 587,
      secure: String(config.SMTP_SECURE || process.env.SMTP_SECURE || "") === "true",
      auth: { user, pass },
    }),
  };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Berlin" }).format(date);
}

async function main() {
  const mailer = await getMailer();
  if (!mailer) return;

  const now = new Date();
  const inEightDays = new Date(now.getTime() + 8 * DAY_MS);
  const favorites = await prisma.favoriteEvent.findMany({
    where: {
      event: { startDate: { gt: now, lte: inEightDays } },
      user: { emailNotifications: true },
      OR: [
        { remindWeek: true, weekReminderSentAt: null },
        { remindDay: true, dayReminderSentAt: null },
      ],
    },
    include: {
      user: { select: { email: true, name: true } },
      event: { select: { id: true, title: true, startDate: true, locationName: true, address: true } },
    },
  });

  const baseUrl = String(process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://tribefinder.de").replace(/\/$/, "");
  for (const favorite of favorites) {
    if (!favorite.user.email) continue;
    const diff = favorite.event.startDate.getTime() - now.getTime();
    const sendDay = favorite.remindDay && !favorite.dayReminderSentAt && diff <= 30 * 60 * 60 * 1000;
    const sendWeek = favorite.remindWeek && !favorite.weekReminderSentAt && diff >= 6 * DAY_MS && diff <= 8 * DAY_MS;
    if (!sendDay && !sendWeek) continue;

    const label = sendDay ? "morgen" : "in einer Woche";
    const location = favorite.event.locationName || favorite.event.address || "Ort siehe Eventseite";
    await mailer.transporter.sendMail({
      from: mailer.from,
      to: favorite.user.email,
      subject: `Erinnerung: ${favorite.event.title} ${label}`,
      html: `<h2>${escapeHtml(favorite.event.title)}</h2><p>Dein gemerktes Event findet ${label} statt.</p><p><strong>${escapeHtml(formatDate(favorite.event.startDate))}</strong><br>${escapeHtml(location)}</p><p><a href="${baseUrl}/events/${encodeURIComponent(favorite.event.id)}">Event ansehen</a></p><p style="color:#6b7280;font-size:12px">Erinnerungen kannst du auf der Eventseite oder in deiner Merkliste ändern.</p>`,
    });
    await prisma.favoriteEvent.update({
      where: { id: favorite.id },
      data: sendDay ? { dayReminderSentAt: now } : { weekReminderSentAt: now },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
