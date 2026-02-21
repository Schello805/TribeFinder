import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const querySchema = z.object({
  lat: z.coerce.number().finite(),
  lng: z.coerce.number().finite(),
  radiusKm: z.coerce.number().finite().positive().max(200).default(25),
});

const toRadians = (deg: number) => (deg * Math.PI) / 180;

const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

export async function GET(req: Request) {
  const url = new URL(req.url);

  const parsed = querySchema.safeParse({
    lat: url.searchParams.get("lat"),
    lng: url.searchParams.get("lng"),
    radiusKm: url.searchParams.get("radiusKm") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Ungültige Anfrage", errors: parsed.error.issues },
      { status: 400 }
    );
  }

  const { lat, lng, radiusKm } = parsed.data;

  const kmPerDegLat = 111.32;
  const dLat = radiusKm / kmPerDegLat;
  const dLng = radiusKm / (kmPerDegLat * Math.max(0.2, Math.cos(toRadians(lat))));

  const minLat = lat - dLat;
  const maxLat = lat + dLat;
  const minLng = lng - dLng;
  const maxLng = lng + dLng;

  const origin = { lat, lng };

  const now = new Date();

  const [groupsCandidate, eventsCandidate] = await Promise.all([
    prisma.group.findMany({
      where: {
        location: {
          is: {
            lat: { gte: minLat, lte: maxLat },
            lng: { gte: minLng, lte: maxLng },
          },
        },
      },
      select: { id: true, location: { select: { lat: true, lng: true } } },
    }),
    prisma.event.findMany({
      where: {
        startDate: { gte: now },
        lat: { gte: minLat, lte: maxLat },
        lng: { gte: minLng, lte: maxLng },
      },
      select: { id: true, lat: true, lng: true },
    }),
  ]);

  const groupIdsInRadius = groupsCandidate
    .filter((g) => {
      const p = g.location;
      if (!p) return false;
      return distanceKm(origin, { lat: p.lat, lng: p.lng }) <= radiusKm;
    })
    .map((g) => g.id);

  const eventIdsInRadius = eventsCandidate
    .filter((e) => {
      if (typeof e.lat !== "number" || typeof e.lng !== "number") return false;
      return distanceKm(origin, { lat: e.lat, lng: e.lng }) <= radiusKm;
    })
    .map((e) => e.id);

  const memberUserIds = groupIdsInRadius.length
    ? await prisma.groupMember.findMany({
        where: { groupId: { in: groupIdsInRadius }, status: "APPROVED" },
        select: { userId: true },
      })
    : [];

  const uniqueMembers = new Set(memberUserIds.map((m) => m.userId));

  return NextResponse.json({
    radiusKm,
    groups: groupIdsInRadius.length,
    events: eventIdsInRadius.length,
    members: uniqueMembers.size,
  });
}
