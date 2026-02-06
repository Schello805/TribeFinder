export type GeocodeResult = { lat: number; lng: number };

export async function geocodeGermany(query: string): Promise<GeocodeResult | null> {
  const q = (query || "").trim();
  if (!q) return null;

  const normalizedQuery = /\bdeutschland\b/i.test(q) ? q : `${q}, Deutschland`;
  const params = new URLSearchParams({
    format: "json",
    q: normalizedQuery,
    limit: "1",
    countrycodes: "de",
    "accept-language": "de",
    addressdetails: "0",
  });

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "TribeFinder/1.0",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = (await res.json().catch(() => null)) as Array<{ lat?: string; lon?: string }> | null;
    const first = data && data[0];
    if (!first?.lat || !first?.lon) return null;

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
