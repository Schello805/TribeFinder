import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

async function ensureDanceStylesSeeded() {
  try {
    const existing = await prisma.danceStyle.count();
    if (existing > 0) return;

    const tags = await prisma.tag.findMany({
      where: { isApproved: true },
      select: { name: true },
      orderBy: { name: "asc" },
    });

    const names = tags.length
      ? tags.map((t) => t.name)
      : [
          "FCBD Style",
          "FCBDStyle Partnering",
          "ATS Partnering",
          "Baladi",
          "Bauchtanz",
          "Dabke",
          "Dark Fusion",
          "Drum Solo",
          "Fan Veils",
          "Gothic Tribal Fusion",
          "ITS",
          "Khaliji",
          "Libanesischer Stil",
          "Neo-Tribal",
          "Oriental Folklore",
          "Oriental Fusion",
          "Orientalischer Tanz",
          "Post-Tribal",
          "Raqs Sharqi",
          "Saidi",
          "Schleiertanz (Veil)",
          "Schwerttanz",
          "Shaabi",
          "Tribal Bellydance",
          "Tribal Fusion",
          "Tribal Improvisation",
          "Tribal Pop Fusion",
          "Tribal Style",
          "Türkischer Stil",
          "Urban Tribal",
          "Zills / Fingerzimbeln",
          "Ägyptischer Stil",
        ];

    await prisma.$transaction(
      names.map((name) =>
        prisma.danceStyle.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    );
  } catch {
    return;
  }
}

export async function GET() {
  try {
    await ensureDanceStylesSeeded();
    const available = await prisma.danceStyle.findMany({
      orderBy: { name: "asc" },
      include: {
        aliases: {
          select: { name: true },
          orderBy: { name: "asc" },
        },
      },
    });
    return NextResponse.json({ available });
  } catch (error) {
    const err = error as { code?: string };
    if (err?.code === "P2021" || err?.code === "P2022") {
      return NextResponse.json({ available: [] }, { status: 200 });
    }
    return NextResponse.json({ message: "Fehler beim Laden der Tanzstile" }, { status: 500 });
  }
}
