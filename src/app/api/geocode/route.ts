import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "@/lib/rateLimit";
import { nominatimReverse, nominatimSearch } from "@/lib/nominatim";

const searchSchema = z.object({
  mode: z.literal("search"),
  q: z.string().optional(),
  country: z.string().optional(),
  limit: z.coerce.number().optional(),
  postalcode: z.string().optional(),
  city: z.string().optional(),
  street: z.string().optional(),
});

const reverseSchema = z.object({
  mode: z.literal("reverse"),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  zoom: z.coerce.number().optional(),
});

export async function GET(req: Request) {
  const clientId = getClientIdentifier(req);
  const rate = checkRateLimit(`geocode:${clientId}`, { limit: 30, windowSeconds: 60 });
  if (!rate.success) return rateLimitResponse(rate);

  const { searchParams } = new URL(req.url);
  const mode = (searchParams.get("mode") || "").trim();

  if (mode === "search") {
    const parsed = searchSchema.safeParse({
      mode: "search",
      q: (searchParams.get("q") || "").trim() || undefined,
      country: (searchParams.get("country") || "").trim() || undefined,
      limit: searchParams.get("limit") || undefined,
      postalcode: (searchParams.get("postalcode") || "").trim() || undefined,
      city: (searchParams.get("city") || "").trim() || undefined,
      street: (searchParams.get("street") || "").trim() || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const hasStructured = Boolean((parsed.data.postalcode || "").trim() && (parsed.data.city || "").trim());
    if (!hasStructured && !parsed.data.q) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const results = await nominatimSearch({
      query: parsed.data.q,
      country: parsed.data.country,
      limit: parsed.data.limit,
      acceptLanguage: "de",
      postalcode: parsed.data.postalcode,
      city: parsed.data.city,
      street: parsed.data.street,
    });
    const first = results[0] ?? null;

    return NextResponse.json({
      lat: first?.lat ?? null,
      lng: first?.lng ?? null,
      results,
    });
  }

  if (mode === "reverse") {
    const parsed = reverseSchema.safeParse({
      mode: "reverse",
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
      zoom: searchParams.get("zoom"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const r = await nominatimReverse({
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      zoom: parsed.data.zoom,
      acceptLanguage: "de",
    });

    const address = r?.address ?? null;
    const cityRaw = address?.city || address?.town || address?.village || null;

    return NextResponse.json({
      address,
      city: cityRaw ? String(cityRaw).trim() : null,
      postcode: typeof address?.postcode === "string" ? address.postcode : null,
      countryCode: typeof address?.country_code === "string" ? address.country_code : null,
    });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
