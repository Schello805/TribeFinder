import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";

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

export async function GET(req: Request) {
  try {
    await ensureDanceStylesSeeded();

    const { searchParams } = new URL(req.url);
    const usedByRaw = (searchParams.get("usedBy") || "").trim();
    const usedBy = usedByRaw || "any";

    logger.debug({ usedBy }, "[dance-styles] GET");

    const where =
      usedBy === "groups"
        ? { groupDanceStyles: { some: {} } }
        : usedBy === "events"
          ? { eventDanceStyles: { some: {} } }
          : usedBy === "dancers"
            ? { userDanceStyles: { some: {} } }
            : {};

    const danceStyleDelegate = (prisma as unknown as {
      danceStyle: { findMany: (args: unknown) => Promise<unknown> };
    }).danceStyle;

    let available: unknown;
    try {
      available = (await danceStyleDelegate.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          aliases: {
            select: { name: true },
            orderBy: { name: "asc" },
          },
        },
      })) as unknown;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.includes("Unknown argument `groupDanceStyles`") ||
        msg.includes("Unknown argument `eventDanceStyles`") ||
        msg.includes("Unknown argument `userDanceStyles`") ||
        msg.includes("Unknown field `groupDanceStyles`") ||
        msg.includes("Unknown field `eventDanceStyles`") ||
        msg.includes("Unknown field `userDanceStyles`")
      ) {
        logger.warn({ usedBy, msg }, "[dance-styles] usedBy filter not supported by Prisma client; falling back to all");
        available = (await danceStyleDelegate.findMany({
          orderBy: { name: "asc" },
          include: {
            aliases: {
              select: { name: true },
              orderBy: { name: "asc" },
            },
          },
        })) as unknown;
      } else {
        logger.error({ usedBy, msg }, "[dance-styles] findMany failed");
        throw error;
      }
    }

    if (Array.isArray(available)) {
      logger.debug({ usedBy, count: available.length }, "[dance-styles] returning styles");
    }
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
    logger.error(
      { msg: error instanceof Error ? error.message : String(error) },
      "[dance-styles] GET failed"
    );
    return NextResponse.json({ message: "Fehler beim Laden der Tanzstile" }, { status: 500 });
  }
}
