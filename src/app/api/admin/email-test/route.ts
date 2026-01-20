import { NextResponse } from 'next/server';
import { sendEmail, emailTemplate, emailHeading, emailText } from '@/lib/email';
import { requireAdminSession } from '@/lib/requireAdmin';

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email Adresse erforderlich' }, { status: 400 });
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
    } else {
      throw new Error('Send failed');
    }
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json({ error: 'Fehler beim Senden der Email. Prüfe die Server-Logs.' }, { status: 500 });
  }
}
