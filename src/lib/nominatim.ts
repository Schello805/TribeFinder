import { getCountryCodeFromGermanName } from "@/lib/countries";

type CacheEntry<T> = { expiresAt: number; value: T };

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const cache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function getUserAgent() {
  return process.env.NOMINATIM_USER_AGENT?.trim() || "TribeFinder/1.0";
}

async function fetchJson(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": getUserAgent(),
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export type NominatimReverseAddress = {
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  country_code?: string;
};

export type NominatimReverseResult = {
  address?: NominatimReverseAddress;
};

export type NominatimSearchResult = {
  lat: number;
  lng: number;
  displayName?: string;
  address?: {
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
  };
};

export async function nominatimSearch(args: {
  query?: string;
  country?: string;
  limit?: number;
  acceptLanguage?: string;
  postalcode?: string;
  city?: string;
  street?: string;
}): Promise<NominatimSearchResult[]> {
  const country = (args.country || "Deutschland").trim() || "Deutschland";
  const acceptLanguage = (args.acceptLanguage || "de").trim() || "de";
  const limit = Math.min(10, Math.max(1, Number.isFinite(args.limit) ? Number(args.limit) : 1));

  const params = new URLSearchParams({
    format: "json",
    limit: String(limit),
    "accept-language": acceptLanguage,
    addressdetails: "1",
  });

  const postalcode = (args.postalcode || "").trim();
  const city = (args.city || "").trim();
  const street = (args.street || "").trim();

  const hasStructured = Boolean(postalcode && city);
  if (hasStructured) {
    // Structured search: primarily for DE-style addresses (PLZ + city [+ street]).
    params.set("postalcode", postalcode);
    params.set("city", city);
    if (street) params.set("street", street);
    params.set("country", country);
    const cc = getCountryCodeFromGermanName(country);
    if (cc) params.set("countrycodes", cc);
  } else {
    const rawQuery = (args.query || "").trim();
    if (!rawQuery) return [];
    const normalizedQuery = new RegExp(`\\b${country.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "i").test(rawQuery)
      ? rawQuery
      : `${rawQuery}, ${country}`;

    const cc = getCountryCodeFromGermanName(country);
    if (cc) params.set("countrycodes", cc);
    params.set("q", normalizedQuery);
  }

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const cacheKey = `search:${url}`;
  const cached = cacheGet<NominatimSearchResult[]>(cacheKey);
  if (cached) return cached;

  const json = await fetchJson(url, 4_000);
  const data = Array.isArray(json)
    ? (json as Array<{ lat?: unknown; lon?: unknown; display_name?: unknown; address?: unknown }>)
    : null;
  if (!data || data.length === 0) return [];

  const results: NominatimSearchResult[] = [];
  for (const item of data) {
    if (!item) continue;
    if (typeof item.lat !== "string" || typeof item.lon !== "string") continue;
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    results.push({
      lat,
      lng,
      displayName: typeof item.display_name === "string" ? item.display_name : undefined,
      address:
        item.address && typeof item.address === "object"
          ? {
              postcode: typeof (item.address as Record<string, unknown>).postcode === "string" ? (item.address as Record<string, unknown>).postcode as string : undefined,
              city: typeof (item.address as Record<string, unknown>).city === "string" ? (item.address as Record<string, unknown>).city as string : undefined,
              town: typeof (item.address as Record<string, unknown>).town === "string" ? (item.address as Record<string, unknown>).town as string : undefined,
              village: typeof (item.address as Record<string, unknown>).village === "string" ? (item.address as Record<string, unknown>).village as string : undefined,
            }
          : undefined,
    });
    if (results.length >= limit) break;
  }

  cacheSet(cacheKey, results);
  return results;
}

export async function nominatimSearchFirst(args: {
  query: string;
  country?: string;
  acceptLanguage?: string;
}): Promise<{ lat: number; lng: number } | null> {
  const rawQuery = (args.query || "").trim();
  if (!rawQuery) return null;

  const results = await nominatimSearch({
    query: rawQuery,
    country: args.country,
    limit: 1,
    acceptLanguage: args.acceptLanguage,
  });
  const first = results[0];
  return first ? { lat: first.lat, lng: first.lng } : null;
}

export async function nominatimReverse(args: {
  lat: number;
  lng: number;
  zoom?: number;
  acceptLanguage?: string;
}): Promise<NominatimReverseResult | null> {
  const lat = args.lat;
  const lng = args.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const zoom = Number.isFinite(args.zoom) ? String(args.zoom) : "10";
  const acceptLanguage = (args.acceptLanguage || "de").trim() || "de";

  const params = new URLSearchParams({
    format: "json",
    lat: String(lat),
    lon: String(lng),
    zoom,
    addressdetails: "1",
    "accept-language": acceptLanguage,
  });

  const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;
  const cacheKey = `reverse:${url}`;
  const cached = cacheGet<NominatimReverseResult>(cacheKey);
  if (cached) return cached;

  const json = await fetchJson(url, 4_000);
  if (!json || typeof json !== "object") return null;

  const address = "address" in (json as Record<string, unknown>) ? (json as { address?: unknown }).address : undefined;
  const addrObj = address && typeof address === "object" ? (address as Record<string, unknown>) : null;

  const result: NominatimReverseResult = addrObj
    ? {
        address: {
          postcode: typeof addrObj.postcode === "string" ? addrObj.postcode : undefined,
          city: typeof addrObj.city === "string" ? addrObj.city : undefined,
          town: typeof addrObj.town === "string" ? addrObj.town : undefined,
          village: typeof addrObj.village === "string" ? addrObj.village : undefined,
          country_code: typeof addrObj.country_code === "string" ? addrObj.country_code : undefined,
        },
      }
    : {};

  cacheSet(cacheKey, result);
  return result;
}
