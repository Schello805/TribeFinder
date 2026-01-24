import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatUtcIcs(dt: Date) {
  return `${dt.getUTCFullYear()}${pad2(dt.getUTCMonth() + 1)}${pad2(dt.getUTCDate())}T${pad2(dt.getUTCHours())}${pad2(dt.getUTCMinutes())}${pad2(dt.getUTCSeconds())}Z`;
}

function escapeIcsText(input: string) {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      group: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ message: "Event nicht gefunden" }, { status: 404 });
  }

  const now = new Date();
  const dtStamp = formatUtcIcs(now);
  const dtStart = formatUtcIcs(new Date(event.startDate));
  const dtEnd = event.endDate ? formatUtcIcs(new Date(event.endDate)) : null;

  const summary = escapeIcsText(event.title);
  const description = escapeIcsText(event.description || "");
  const location = escapeIcsText(event.locationName || event.address || "");
  const organizerName = event.organizer || event.group?.name || "TribeFinder";
  const organizer = escapeIcsText(organizerName);

  const uid = `${event.id}@tribefinder`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TribeFinder//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    ...(dtEnd ? [`DTEND:${dtEnd}`] : []),
    `SUMMARY:${summary}`,
    ...(description ? [`DESCRIPTION:${description}`] : []),
    ...(location ? [`LOCATION:${location}`] : []),
    `ORGANIZER;CN=${organizer}:mailto:no-reply@tribefinder.local`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ];

  const ics = lines.join("\r\n");

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"event-${event.id}.ics\"`,
      "Cache-Control": "no-store",
    },
  });
}
