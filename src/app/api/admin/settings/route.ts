import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = settings.reduce((acc: Record<string, string>, setting: { key: string; value: string }) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    // Sensible Daten maskieren? Hier nicht, da Admin sie sehen/bearbeiten muss
    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Einstellungen' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await req.json();
    
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
