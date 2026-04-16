export type GeocodeResult = { lat: number; lng: number };

import { nominatimSearchFirst } from "@/lib/nominatim";

export async function geocodeByCountry(query: string, country: string): Promise<GeocodeResult | null> {
  const q = (query || "").trim();
  if (!q) return null;

  const selectedCountry = (country || "Deutschland").trim() || "Deutschland";
  return nominatimSearchFirst({ query: q, country: selectedCountry, acceptLanguage: "de" });
}

export async function geocodeGermany(query: string): Promise<GeocodeResult | null> {
  return geocodeByCountry(query, "Deutschland");
}
