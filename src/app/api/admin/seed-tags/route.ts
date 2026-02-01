import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/requireAdmin';
import { jsonServerError, jsonUnauthorized } from "@/lib/apiResponse";

const STANDARD_TAGS = [
  "Orientalischer Tanz",
  "Bauchtanz",
  "Raqs Sharqi",
  "Baladi",
  "Shaabi",
  "Saidi",
  "Khaliji",
  "Dabke",
  "Oriental Folklore",
  "Ägyptischer Stil",
  "Türkischer Stil",
  "Libanesischer Stil",

  "Tribal Style",
  "American Tribal Style (ATS)",
  "ATS (FCBDStyle)",
  "FCBDStyle",
  "Tribal Fusion",
  "Oriental Fusion",
  "Tribal Improvisation",

  "Improvisational Tribal Style (ITS)",
  "Tribal Bellydance",
  "Neo-Tribal",
  "Post-Tribal",
  "Dark Fusion",
  "Gothic Tribal Fusion",
  "Urban Tribal",
  "Tribal Pop Fusion",
  "FCBDStyle Partnering",
  "ATS Partnering",

  "Drum Solo",
  "Schleiertanz (Veil)",
  "Fan Veils",
  "Zills / Fingerzimbeln",
  "Schwerttanz"
];

export async function POST() {
  const session = await requireAdminSession();
  if (!session) {
    return jsonUnauthorized();
  }

  try {
    // Wir nutzen eine Transaktion für bessere Performance
    await prisma.$transaction(
      STANDARD_TAGS.map(name => 
        prisma.tag.upsert({
          where: { name },
          update: { isApproved: true }, // Wenn existiert, sicherstellen dass approved
          create: { name, isApproved: true }
        })
      )
    );

    return NextResponse.json({ message: `Standard-Tags wurden importiert/aktualisiert.` });
  } catch (error) {
    console.error('Error seeding tags:', error);
    return jsonServerError('Fehler beim Importieren der Tags', error);
  }
}
