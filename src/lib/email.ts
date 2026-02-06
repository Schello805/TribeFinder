import nodemailer from 'nodemailer';
import prisma from '@/lib/prisma';

const getTransporter = async () => {
  // Versuche Einstellungen aus der DB zu laden
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'SMTP_SECURE']
      }
    }
  });

  const config = settings.reduce((acc: Record<string, string>, setting: { key: string; value: string }) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, string>);

  // Fallback auf Env Vars
  const host = config.SMTP_HOST || process.env.SMTP_HOST;
  const port = Number(config.SMTP_PORT || process.env.SMTP_PORT) || 587;
  const user = config.SMTP_USER || process.env.SMTP_USER;
  const pass = config.SMTP_PASSWORD || process.env.SMTP_PASSWORD;
  const secure = (config.SMTP_SECURE || process.env.SMTP_SECURE) === 'true';
  const from = config.SMTP_FROM || process.env.SMTP_FROM || '"TribeFinder" <noreply@tribefinder.de>';

  if (!host || !user || !pass) {
    throw new Error('SMTP Konfiguration fehlt (DB oder ENV)');
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    }),
    from
  };
};

// Beautiful HTML email wrapper template
export const getEmailBaseUrl = (req?: Request) => {
  const envBase = (process.env.SITE_URL || process.env.NEXTAUTH_URL || '').trim();
  const normalizedEnvBase = envBase.replace(/\/+$/, '');
  if (/^https?:\/\//i.test(normalizedEnvBase)) return normalizedEnvBase;

  if (req) {
    const forwardedProto = (req.headers.get('x-forwarded-proto') || '').split(',')[0].trim();
    const forwardedHost = (req.headers.get('x-forwarded-host') || '').split(',')[0].trim();
    const host = (req.headers.get('host') || '').trim();

    const proto = forwardedProto || 'https';
    const effectiveHost = forwardedHost || host;
    if (effectiveHost) return `${proto}://${effectiveHost}`;
  }

  return 'http://localhost:3000';
};

export const toAbsoluteUrl = (maybeUrl: string, baseUrl?: string) => {
  if (!maybeUrl) return '';
  if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;

  const base = (baseUrl || '').replace(/\/+$/, '');
  if (!base) return maybeUrl;

  if (maybeUrl.startsWith('/')) return `${base}${maybeUrl}`;
  return `${base}/${maybeUrl}`;
};

const getBrandingLogoUrl = async () => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'BRANDING_LOGO_URL' } });
    return setting?.value ? toAbsoluteUrl(setting.value, getEmailBaseUrl()) : '';
  } catch {
    return '';
  }
};

export const emailTemplate = async (content: string, preheader?: string) => {
  const baseUrl = getEmailBaseUrl();
  const logoUrl = await getBrandingLogoUrl();

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TribeFinder</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; border-radius: 16px 16px 0 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    ${logoUrl ? `<img src="${logoUrl}" width="40" height="40" alt="TribeFinder" style="display:inline-block; vertical-align:middle; margin-right: 10px; border-radius: 8px;" />` : `<span style="font-size: 28px; margin-right: 10px;">💃</span>`}
                    <span style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">TribeFinder</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="color: #9ca3af; font-size: 12px; text-align: center;">
                    <p style="margin: 0 0 8px 0;">Diese E-Mail wurde automatisch von TribeFinder versendet.</p>
                    <p style="margin: 0 0 8px 0;">
                      Du kannst diese Benachrichtigungen im Profil (Mein Bereich) unter <strong>Benachrichtigungen</strong> deaktivieren:
                      <a href="${toAbsoluteUrl('/dashboard/notifications', baseUrl)}" style="color: #6366f1; text-decoration: none;">Einstellungen öffnen</a>
                    </p>
                    <p style="margin: 0;">
                      <a href="${baseUrl}" style="color: #6366f1; text-decoration: none;">TribeFinder besuchen</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

// Email content helpers
export const emailButton = (text: string, url: string) => `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
    <tr>
      <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 8px;">
        <a href="${url}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>
`;

export const emailHeading = (text: string) => `
  <h1 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 700; line-height: 1.3;">
    ${text}
  </h1>
`;

export const emailText = (text: string) => `
  <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
    ${text}
  </p>
`;

export const emailHighlight = (text: string) => `
  <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">
      ${text}
    </p>
  </div>
`;

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const { transporter, from } = await getTransporter();
    
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    console.log('Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};
