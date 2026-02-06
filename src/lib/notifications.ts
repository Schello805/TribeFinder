import prisma from "@/lib/prisma";
import { sendEmail, emailTemplate, emailHeading, emailText, emailButton } from "@/lib/email";
import logger from "@/lib/logger";

// Notify group owner/admins about a new membership request
export async function notifyGroupAboutNewMember(groupId: string, applicantName: string, applicantEmail: string) {
  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        owner: { select: { email: true, emailNotifications: true } },
        members: {
          where: { status: 'APPROVED' },
          include: { user: { select: { email: true, emailNotifications: true } } }
        }
      }
    });

    if (!group) return;

    const recipients: string[] = [];
    
    if (group.owner.email && group.owner.emailNotifications) {
      recipients.push(group.owner.email);
    }
    
    group.members.forEach((m: { user: { email: string | null; emailNotifications: boolean } }) => {
      if (m.user.email && m.user.emailNotifications && !recipients.includes(m.user.email)) {
        recipients.push(m.user.email);
      }
    });

    if (recipients.length === 0) return;

    const subject = `Neue Mitgliedsanfrage für ${group.name}`;
    const content = `
      ${emailHeading('Neue Mitgliedsanfrage 👋')}
      ${emailText(`<strong>${applicantName}</strong> (${applicantEmail}) möchte deiner Gruppe <strong>${group.name}</strong> beitreten.`)}
      ${emailText('Besuche die Gruppenseite, um die Anfrage zu bearbeiten:')}
      ${emailButton('Anfrage bearbeiten', `${process.env.NEXTAUTH_URL}/groups/${groupId}`)}
    `;

    const html = await emailTemplate(content, `${applicantName} möchte beitreten`);
    await Promise.all(recipients.map(email => sendEmail(email, subject, html)));
    logger.info({ groupId, applicantEmail, recipientCount: recipients.length }, "Membership request notification sent");
  } catch (error) {
    logger.error({ error, groupId }, "Error sending membership request notification");
  }
}

export async function notifyUserRemovedFromGroup(params: {
  userId: string;
  groupId: string;
  removedByName: string;
}) {
  try {
    const [user, group] = await Promise.all([
      prisma.user.findUnique({ where: { id: params.userId }, select: { email: true, emailNotifications: true } }),
      prisma.group.findUnique({ where: { id: params.groupId }, select: { name: true } }),
    ]);

    if (!user?.email || !user.emailNotifications || !group) return;

    const subject = `Du wurdest aus ${group.name} entfernt`;
    const content = `
      ${emailHeading('Mitgliedschaft beendet')}
      ${emailText(`Du wurdest von <strong>${params.removedByName}</strong> aus der Gruppe <strong>${group.name}</strong> entfernt.`)}
      ${emailText('Wenn das ein Fehler war, kannst du der Gruppe jederzeit erneut beitreten:')}
      ${emailButton('Zur Gruppe', `${process.env.NEXTAUTH_URL}/groups/${params.groupId}`)}
    `;

    const html = await emailTemplate(content, `Entfernt aus ${group.name}`);
    await sendEmail(user.email, subject, html);
    logger.info({ userId: params.userId, groupId: params.groupId }, "Removed-from-group notification sent");
  } catch (error) {
    logger.error({ error, userId: params.userId, groupId: params.groupId }, "Error sending removed-from-group notification");
  }
}

export async function notifyGroupAboutInboxMessage(params: {
  groupId: string;
  threadId: string;
  authorId: string;
  authorName: string;
  preview: string;
  subject?: string | null;
}) {
  try {
    const group = await prisma.group.findUnique({
      where: { id: params.groupId },
      select: {
        id: true,
        name: true,
        owner: { select: { id: true, email: true, emailNotifications: true, notifyInboxMessages: true } },
        members: {
          where: { status: "APPROVED" },
          select: {
            user: { select: { id: true, email: true, emailNotifications: true, notifyInboxMessages: true } },
          },
        },
      },
    });

    if (!group) return;

    const recipients = new Set<string>();
    const shouldNotify = (u: { id: string; email: string | null; emailNotifications: boolean; notifyInboxMessages?: boolean }) => {
      if (!u.email) return false;
      if (u.id === params.authorId) return false;
      if (!u.emailNotifications) return false;
      if (!u.notifyInboxMessages) return false;
      return true;
    };

    if (group.owner && shouldNotify(group.owner)) {
      recipients.add(group.owner.email as string);
    }

    group.members.forEach((m) => {
      const u = m.user;
      if (shouldNotify(u)) {
        recipients.add(u.email as string);
      }
    });

    if (recipients.size === 0) return;

    const subject = `Neue Nachricht in ${group.name}`;
    const threadTitle = params.subject ? params.subject : `Nachricht an ${group.name}`;
    const url = `${process.env.NEXTAUTH_URL}/messages/threads/${params.threadId}`;
    const content = `
      ${emailHeading('Neue Inbox-Nachricht 📬')}
      ${emailText(`<strong>${params.authorName}</strong> hat in <strong>${group.name}</strong> geschrieben:`)}
      ${emailText(`<em>"${params.preview}"</em>`)}
      ${emailText(`Betreff: <strong>${threadTitle}</strong>`)}
      ${emailButton('Thread öffnen', url)}
    `;

    const html = await emailTemplate(content, `Neue Nachricht in ${group.name}`);
    await Promise.all(Array.from(recipients).map((email) => sendEmail(email, subject, html)));
    logger.info({ groupId: params.groupId, threadId: params.threadId, recipientCount: recipients.size }, "Inbox notification sent");
  } catch (error) {
    const err = error as { code?: string; message?: string };
    // Best-effort: wenn DB noch nicht migriert ist (fehlende Spalte), nicht crashen.
    if (err?.code === "P2022" || err?.code === "P2021") return;
    logger.error({ error, groupId: params.groupId, threadId: params.threadId }, "Error sending inbox notification");
  }
}

// Notify user when their membership is approved
export async function notifyUserMembershipApproved(userId: string, groupId: string) {
  try {
    const [user, group] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailNotifications: true } }),
      prisma.group.findUnique({ where: { id: groupId }, select: { name: true } })
    ]);

    if (!user?.email || !user.emailNotifications || !group) return;

    const subject = `Willkommen bei ${group.name}!`;
    const content = `
      ${emailHeading('Willkommen im Team! 🎉')}
      ${emailText(`Super Neuigkeiten! Deine Mitgliedsanfrage für <strong>${group.name}</strong> wurde angenommen.`)}
      ${emailText('Du bist jetzt offizielles Mitglied und kannst dich mit der Gruppe vernetzen.')}
      ${emailButton('Zur Gruppe', `${process.env.NEXTAUTH_URL}/groups/${groupId}`)}
    `;

    const html = await emailTemplate(content, `Du bist jetzt Mitglied bei ${group.name}`);
    await sendEmail(user.email, subject, html);
    logger.info({ userId, groupId }, "Membership approved notification sent");
  } catch (error) {
    logger.error({ error, userId, groupId }, "Error sending membership approved notification");
  }
}

// Notify user about a new message
export async function notifyUserAboutNewMessage(receiverId: string, senderName: string) {
  try {
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { email: true, emailNotifications: true }
    });

    if (!receiver?.email || !receiver.emailNotifications) return;

    const subject = `Neue Nachricht von ${senderName}`;
    const content = `
      ${emailHeading('Neue Nachricht 💬')}
      ${emailText(`<strong>${senderName}</strong> hat dir eine Nachricht auf TribeFinder gesendet.`)}
      ${emailText('Öffne deine Nachrichten, um zu antworten:')}
      ${emailButton('Nachrichten öffnen', `${process.env.NEXTAUTH_URL}/direct-messages`)}
    `;

    const html = await emailTemplate(content, `${senderName} hat dir geschrieben`);
    await sendEmail(receiver.email, subject, html);
    logger.info({ receiverId, senderName }, "New message notification sent");
  } catch (error) {
    logger.error({ error, receiverId }, "Error sending new message notification");
  }
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Notify users about a new group in their vicinity
export async function notifyUsersAboutNewGroup(groupId: string, groupName: string, lat: number, lng: number) {
  try {
    // Find users who want notifications for new groups
    const users = await prisma.user.findMany({
      where: {
        notifyNewGroups: true,
        notifyLat: { not: null },
        notifyLng: { not: null },
        emailNotifications: true,
      },
      select: {
        id: true,
        email: true,
        notifyLat: true,
        notifyLng: true,
        notifyRadius: true,
      }
    });

    const recipients = users.filter(user => {
      if (!user.notifyLat || !user.notifyLng) return false;
      const distance = calculateDistance(user.notifyLat, user.notifyLng, lat, lng);
      return distance <= user.notifyRadius;
    });

    if (recipients.length === 0) return;

    const subject = `Neue Tanzgruppe in deiner Nähe: ${groupName}`;
    const content = `
      ${emailHeading('Neue Tanzgruppe entdeckt! 💃')}
      ${emailText('Eine neue Tanzgruppe wurde in deiner Nähe erstellt:')}
      <h3 style="color: #6366f1; margin: 16px 0; font-size: 20px;">${groupName}</h3>
      ${emailButton('Gruppe ansehen', `${process.env.NEXTAUTH_URL}/groups/${groupId}`)}
      ${emailText('<small style="color: #9ca3af;">Du erhältst diese E-Mail, weil du Benachrichtigungen für neue Gruppen aktiviert hast. <a href="' + process.env.NEXTAUTH_URL + '/dashboard/notifications" style="color: #6366f1;">Einstellungen ändern</a></small>')}
    `;

    const html = await emailTemplate(content, `${groupName} in deiner Nähe`);
    await Promise.all(recipients.map(user => 
      user.email ? sendEmail(user.email, subject, html) : Promise.resolve()
    ));

    logger.info({ groupId, recipientCount: recipients.length }, "New group notifications sent");
  } catch (error) {
    logger.error({ error, groupId }, "Error sending new group notifications");
  }
}

// Notify users about a new event in their vicinity
export async function notifyUsersAboutNewEvent(eventId: string, eventTitle: string, lat: number, lng: number, startDate: Date) {
  try {
    // Find users who want notifications for new events
    const users = await prisma.user.findMany({
      where: {
        notifyNewEvents: true,
        notifyLat: { not: null },
        notifyLng: { not: null },
        emailNotifications: true,
      },
      select: {
        id: true,
        email: true,
        notifyLat: true,
        notifyLng: true,
        notifyRadius: true,
      }
    });

    const recipients = users.filter(user => {
      if (!user.notifyLat || !user.notifyLng) return false;
      const distance = calculateDistance(user.notifyLat, user.notifyLng, lat, lng);
      return distance <= user.notifyRadius;
    });

    if (recipients.length === 0) return;

    const dateStr = startDate.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const subject = `Neues Event in deiner Nähe: ${eventTitle}`;
    const content = `
      ${emailHeading('Neues Event entdeckt! 🎉')}
      ${emailText('Ein neues Event wurde in deiner Nähe erstellt:')}
      <h3 style="color: #8b5cf6; margin: 16px 0; font-size: 20px;">${eventTitle}</h3>
      <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px;"><strong>📅 ${dateStr}</strong></p>
      ${emailButton('Event ansehen', `${process.env.NEXTAUTH_URL}/events/${eventId}`)}
      ${emailText('<small style="color: #9ca3af;">Du erhältst diese E-Mail, weil du Benachrichtigungen für neue Events aktiviert hast. <a href="' + process.env.NEXTAUTH_URL + '/dashboard/notifications" style="color: #6366f1;">Einstellungen ändern</a></small>')}
    `;

    const html = await emailTemplate(content, `${eventTitle} am ${dateStr}`);
    await Promise.all(recipients.map(user => 
      user.email ? sendEmail(user.email, subject, html) : Promise.resolve()
    ));

    logger.info({ eventId, recipientCount: recipients.length }, "New event notifications sent");
  } catch (error) {
    logger.error({ error, eventId }, "Error sending new event notifications");
  }
}

export async function notifyAdminsAboutNewTags(newTags: string[], creatorName: string) {
  if (newTags.length === 0) return;

  try {
    // 1. Finde alle Admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true }
    });

    if (admins.length === 0) return;

    // 2. Erstelle Email-Inhalt
    const subject = `Neue Tanzstile warten auf Freigabe (${newTags.length})`;
    const tagList = newTags.map(tag => `<li style="margin: 4px 0;"><strong>${tag}</strong></li>`).join('');
    const content = `
      ${emailHeading('Neue Tanzstile vorgeschlagen 🏷️')}
      ${emailText(`Der Benutzer <strong>${creatorName}</strong> hat folgende neue Tanzstile in einem Gruppenprofil verwendet:`)}
      <ul style="margin: 16px 0; padding-left: 20px; color: #4b5563;">
        ${tagList}
      </ul>
      ${emailText('Diese Tags sind vorerst als "pending" markiert und warten auf deine Freigabe.')}
      ${emailButton('Tags verwalten', `${process.env.NEXTAUTH_URL}/admin/tags`)}
    `;

    const promises = admins.map((admin: { email: string | null }) => {
      if (admin.email) {
        return emailTemplate(content, `${newTags.length} neue Tags warten`).then((html) => sendEmail(admin.email as string, subject, html));
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
    console.log(`Benachrichtigung über ${newTags.length} neue Tags an ${admins.length} Admins gesendet.`);

  } catch (error) {
    console.error("Fehler beim Senden der Tag-Benachrichtigung:", error);
  }
}
