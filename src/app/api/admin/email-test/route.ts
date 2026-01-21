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

    const err = result.error as any;
    const details = err
      ? {
          message: typeof err?.message === "string" ? err.message : String(err),
          code: typeof err?.code === "string" ? err.code : undefined,
          responseCode: typeof err?.responseCode === "number" ? err.responseCode : undefined,
          response: typeof err?.response === "string" ? err.response : undefined,
          command: typeof err?.command === "string" ? err.command : undefined,
        }
      : undefined;

    return jsonError('Fehler beim Senden der Email.', 502, details);
  } catch (error) {
    console.error('Email test error:', error);
    return jsonServerError('Fehler beim Senden der Email. Prüfe die Server-Logs.', error);
  }
}
