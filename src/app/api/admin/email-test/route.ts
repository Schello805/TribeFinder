import { NextResponse } from 'next/server';
import { sendEmail, emailTemplate, emailHeading, emailText } from '@/lib/email';
import { requireAdminSession } from '@/lib/requireAdmin';
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { jsonBadRequest, jsonError, jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";

export async function POST(req: Request) {
  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(`admin:email-test:${clientId}`, RATE_LIMITS.auth);
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const session = await requireAdminSession();
  if (!session) {
    return jsonUnauthorized();
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";

    if (!email) {
      return jsonBadRequest('Email Adresse erforderlich');
    }

    const result = await sendEmail(
      email,
      'Test Email von TribeFinder',
      await emailTemplate(
        `${emailHeading('SMTP Konfiguration erfolgreich!')} ${emailText('Wenn du diese Email liest, funktioniert der Email-Versand.')}`,
        'SMTP Test'
      )
    );

    if (result.success) {
      return NextResponse.json({ message: 'Test Email gesendet' });
    }

    const err: unknown = result.error;
    const o = (typeof err === "object" && err !== null ? (err as Record<string, unknown>) : null);
    const details = err
      ? {
          message: o && typeof o.message === "string" ? o.message : String(err),
          code: o && typeof o.code === "string" ? o.code : undefined,
          responseCode: o && typeof o.responseCode === "number" ? o.responseCode : undefined,
          response: o && typeof o.response === "string" ? o.response : undefined,
          command: o && typeof o.command === "string" ? o.command : undefined,
        }
      : undefined;

    return jsonError('Fehler beim Senden der Email.', 502, details);
  } catch (error) {
    console.error('Email test error:', error);
    return jsonServerError('Fehler beim Senden der Email. Prüfe die Server-Logs.', error);
  }
}
