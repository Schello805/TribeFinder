import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const querySchema = z.object({
  lat: z.coerce.number().finite(),
  lng: z.coerce.number().finite(),
  radiusKm: z.coerce.number().finite().positive().max(200).default(25),
  type: z.enum(["groups", "events"]),
  limit: z.coerce.number().int().positive().max(200).default(100),
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
    type: url.searchParams.get("type"),
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Ungültige Anfrage", errors: parsed.error.issues },
      { status: 400 }
    );
  }

  const { lat, lng, radiusKm, type, limit } = parsed.data;

  const kmPerDegLat = 111.32;
  const dLat = radiusKm / kmPerDegLat;
  const dLng = radiusKm / (kmPerDegLat * Math.max(0.2, Math.cos(toRadians(lat))));

  const minLat = lat - dLat;
  const maxLat = lat + dLat;
  const minLng = lng - dLng;
  const maxLng = lng + dLng;

  const origin = { lat, lng };
  const now = new Date();

  if (type === "events") {
    const candidates = await prisma.event.findMany({
      where: {
        startDate: { gte: now },
        lat: { gte: minLat, lte: maxLat },
        lng: { gte: minLng, lte: maxLng },
      },
      include: {
        group: { select: { id: true, name: true } },
      },
      orderBy: { startDate: "asc" },
      take: Math.min(500, limit * 5),
    });

    const filtered = candidates
      .filter((e) => typeof e.lat === "number" && typeof e.lng === "number")
      .map((e) => ({ e, d: distanceKm(origin, { lat: e.lat as number, lng: e.lng as number }) }))
      .filter((x) => x.d <= radiusKm)
      .sort((a, b) => a.d - b.d)
      .slice(0, limit)
      .map((x) => ({
        id: x.e.id,
        title: x.e.title,
        startDate: x.e.startDate,
        locationName: x.e.locationName,
        group: x.e.group ? { id: x.e.group.id, name: x.e.group.name } : null,
      }));

    return NextResponse.json({ radiusKm, type, items: filtered });
  }

  const candidates = await prisma.group.findMany({
    where: {
      location: {
        is: {
          lat: { gte: minLat, lte: maxLat },
          lng: { gte: minLng, lte: maxLng },
        },
      },
    },
    include: {
      location: { select: { address: true, lat: true, lng: true } },
    },
    take: Math.min(500, limit * 5),
  });

  const filtered = candidates
    .filter((g) => g.location && typeof g.location.lat === "number" && typeof g.location.lng === "number")
    .map((g) => ({ g, d: distanceKm(origin, { lat: g.location!.lat, lng: g.location!.lng }) }))
    .filter((x) => x.d <= radiusKm)
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => ({
      id: x.g.id,
      name: x.g.name,
      location: { address: x.g.location?.address ?? null },
    }));

  return NextResponse.json({ radiusKm, type, items: filtered });
}
