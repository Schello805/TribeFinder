import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/requireAdmin';

const DEFAULT_SMTP_FROM = '"TribeFinder" <noreply@tribefinder.de>';
const LEGACY_SMTP_FROM_VALUES = new Set([
  '"TribeFinder" <noreply@tribefinder.com>',
  '"Dance Connect" <noreply@dance-connect.com>',
]);

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = settings.reduce((acc: Record<string, string>, setting: { key: string; value: string }) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    const currentFrom = settingsMap.SMTP_FROM;
    const shouldMigrateDefault =
      !currentFrom ||
      currentFrom.trim() === '' ||
      LEGACY_SMTP_FROM_VALUES.has(currentFrom.trim());

    if (shouldMigrateDefault) {
      await prisma.systemSetting.upsert({
        where: { key: 'SMTP_FROM' },
        update: { value: DEFAULT_SMTP_FROM },
        create: { key: 'SMTP_FROM', value: DEFAULT_SMTP_FROM },
      });
      settingsMap.SMTP_FROM = DEFAULT_SMTP_FROM;
    }

    // Sensible Daten maskieren? Hier nicht, da Admin sie sehen/bearbeiten muss
    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Einstellungen' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (Object.prototype.hasOwnProperty.call(body, 'SMTP_FROM')) {
      const v = typeof body.SMTP_FROM === 'string' ? body.SMTP_FROM.trim() : '';
      if (!v) body.SMTP_FROM = DEFAULT_SMTP_FROM;
      if (LEGACY_SMTP_FROM_VALUES.has(String(body.SMTP_FROM).trim())) {
        body.SMTP_FROM = DEFAULT_SMTP_FROM;
      }
    }
    
    // Transaktion für alle Updates
    await prisma.$transaction(
      Object.entries(body).map(([key, value]) => 
        prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    return NextResponse.json({ message: 'Einstellungen gespeichert' });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Fehler beim Speichern der Einstellungen' }, { status: 500 });
  }
}
