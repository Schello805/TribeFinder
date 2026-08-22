#!/usr/bin/env node

const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

async function main() {
  const settings = await prisma.systemSetting.findMany({ where: { key: { in: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "SMTP_SECURE"] } }, select: { key: true, value: true } }).catch(() => []);
  const config = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
  const host = config.SMTP_HOST || process.env.SMTP_HOST;
  const user = config.SMTP_USER || process.env.SMTP_USER;
  const pass = config.SMTP_PASSWORD || process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return;

  const transporter = nodemailer.createTransport({ host, port: Number(config.SMTP_PORT || process.env.SMTP_PORT) || 587, secure: String(config.SMTP_SECURE || process.env.SMTP_SECURE || "") === "true", auth: { user, pass } });
  const from = config.SMTP_FROM || process.env.SMTP_FROM || '"TribeFinder" <noreply@tribefinder.de>';
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const step = `YEAR_${new Date().getFullYear()}`;
  const baseUrl = String(process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://tribefinder.de").replace(/\/$/, "");

  const groups = await prisma.group.findMany({
    where: { OR: [{ profileVerifiedAt: null }, { profileVerifiedAt: { lt: cutoff } }], owner: { emailNotifications: true } },
    select: { id: true, name: true, owner: { select: { id: true, email: true } } },
    take: 500,
  });

  for (const group of groups) {
    if (!group.owner.email) continue;
    const sent = await prisma.plgEmailNotificationState.findUnique({
      where: { userId_notificationType_targetId_step: { userId: group.owner.id, notificationType: "GROUP_FRESHNESS", targetId: group.id, step } },
      select: { id: true },
    });
    if (sent) continue;

    await transporter.sendMail({
      from,
      to: group.owner.email,
      subject: `Sind die Angaben von ${group.name} noch aktuell?`,
      html: `<h2>Kurzer Profil-Check</h2><p>Die Angaben deiner Gruppe <strong>${escapeHtml(group.name)}</strong> wurden seit über einem Jahr nicht bestätigt.</p><p>Bitte prüfe Adresse, Trainingszeiten und Links. Wenn alles stimmt, genügt ein Klick auf „Angaben sind aktuell“ im Gruppenprofil.</p><p><a href="${baseUrl}/groups/${encodeURIComponent(group.id)}">Gruppenprofil prüfen</a></p>`,
    });
    await prisma.plgEmailNotificationState.create({ data: { userId: group.owner.id, notificationType: "GROUP_FRESHNESS", targetType: "GROUP", targetId: group.id, step, lastSentAt: new Date() } });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
