import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    const danceStyleDelegate = (prisma as unknown as { danceStyle: { findMany: (args: unknown) => Promise<unknown> } }).danceStyle;
    const available = (await danceStyleDelegate.findMany({
      orderBy: { name: "asc" },
      include: {
        aliases: {
          select: { name: true },
          orderBy: { name: "asc" },
        },
      },
    })) as unknown;
    const res = NextResponse.json({ available });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (error) {
    const err = error as { code?: string };
    if (err?.code === "P2021" || err?.code === "P2022") {
      const res = NextResponse.json({ available: [] }, { status: 200 });
      res.headers.set("Cache-Control", "no-store, max-age=0");
      return res;
    }
    return NextResponse.json({ message: "Fehler beim Laden der Tanzstile" }, { status: 500 });
  }
}
