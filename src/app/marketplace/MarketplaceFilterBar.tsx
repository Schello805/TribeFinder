"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "@/lib/hooks/useDebounce";

const categories = [
  { value: "", label: "Alle" },
  { value: "KOSTUEME", label: "Kostüme" },
  { value: "SCHMUCK", label: "Schmuck" },
  { value: "ACCESSOIRES", label: "Accessoires" },
  { value: "SCHUHE", label: "Schuhe" },
  { value: "SONSTIGES", label: "Sonstiges" },
] as const;

const listingTypes = [
  { value: "", label: "Alle" },
  { value: "OFFER", label: "Ich biete" },
  { value: "REQUEST", label: "Ich suche" },
] as const;

const sorts = [
  { value: "newest", label: "Neueste" },
  { value: "priceAsc", label: "Preis: aufsteigend" },
  { value: "priceDesc", label: "Preis: absteigend" },
  { value: "distance", label: "Entfernung" },
] as const;

export default function MarketplaceFilterBar(props: {
  query: string;
  category: string;
  sort: string;
  type: string;
  address: string;
  lat: string;
  lng: string;
  radius: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [query, setQuery] = useState(() => props.query);
  const [category, setCategory] = useState(() => props.category);
  const [sort, setSort] = useState(() => props.sort);
  const [type, setType] = useState(() => props.type);
  const [address, setAddress] = useState(() => props.address);
  const [lat, setLat] = useState(() => props.lat);
  const [lng, setLng] = useState(() => props.lng);
  const [radius, setRadius] = useState(() => props.radius);
  const [isLocating, setIsLocating] = useState(false);
  const geocodeSeq = useRef(0);

  const debouncedQuery = useDebounce(query, 400);
  const debouncedAddress = useDebounce(address, 800);

  const radiusMin = 5;
  const radiusMax = 200;
  const radiusValue = Number(radius) || 0;
  const radiusPercent = Math.min(100, Math.max(0, ((radiusValue - radiusMin) / (radiusMax - radiusMin)) * 100));

  const currentBase = useMemo(() => {
    const u = new URLSearchParams(sp);
    u.delete("query");
    u.delete("category");
    u.delete("sort");
    u.delete("type");
    u.delete("address");
    u.delete("lat");
    u.delete("lng");
    u.delete("radius");
    u.delete("page");
    return u;
  }, [sp]);

  const updateUrl = useCallback(
    (next: { query: string; category: string; sort: string; type: string; address: string; lat: string; lng: string; radius: string }) => {
      const u = new URLSearchParams(currentBase);
      if (next.query.trim()) u.set("query", next.query.trim());
      if (next.category) u.set("category", next.category);

      if (next.sort && next.sort !== "newest") u.set("sort", next.sort);
      else u.delete("sort");

      if (next.type && next.type !== "") u.set("type", next.type);
      else u.delete("type");

      if (next.address.trim()) u.set("address", next.address.trim());
      else u.delete("address");

      if (next.lat && next.lng) {
        u.set("lat", next.lat);
        u.set("lng", next.lng);
        const r = next.radius && Number(next.radius) > 0 ? next.radius : "50";
        u.set("radius", r);
      } else {
        u.delete("lat");
        u.delete("lng");
        u.delete("radius");
      }

      const nextQs = u.toString();
      const href = nextQs ? `/marketplace?${nextQs}` : "/marketplace";
      const currentQs = sp.toString();
      const currentHref = currentQs ? `/marketplace?${currentQs}` : "/marketplace";
      if (href !== currentHref) router.push(href);
    },
    [currentBase, router, sp]
  );

  useEffect(() => {
    updateUrl({ query: debouncedQuery, category, sort, type, address, lat, lng, radius });
  }, [debouncedQuery, category, sort, type, address, lat, lng, radius, updateUrl]);

  useEffect(() => {
    if (!debouncedAddress || lat || lng) return;
    const seqId = ++geocodeSeq.current;
    const controller = new AbortController();

    const run = async () => {
      try {
        const q = /\bdeutschland\b/i.test(debouncedAddress) ? debouncedAddress : `${debouncedAddress}, Deutschland`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=de&accept-language=de`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as Array<{ lat?: string; lon?: string }> | null;
        if (geocodeSeq.current !== seqId) return;
        if (!data || !data[0]?.lat || !data[0]?.lon) return;
        setLat(String(data[0].lat));
        setLng(String(data[0].lon));
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    };

    void run();
    return () => controller.abort();
  }, [debouncedAddress, lat, lng]);

  const handleUseMyLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        setAddress("Mein Standort");
        setIsLocating(false);
      },
      () => setIsLocating(false)
    );
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche…"
          className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        >
          {listingTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "distance" && !(lat && lng)) {
              setSort("newest");
              return;
            }
            setSort(next);
          }}
          className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <Link
          href="/marketplace"
          className="w-full px-4 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition text-center"
        >
          Reset
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-3 flex gap-2">
          <input
            value={address}
            onChange={(e) => {
              geocodeSeq.current += 1;
              setAddress(e.target.value);
              if (lat || lng) {
                setLat("");
                setLng("");
              }
            }}
            placeholder="PLZ oder Ort (für Entfernung)…"
            className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          />
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition disabled:opacity-50"
            title="Meinen Standort verwenden"
          >
            {isLocating ? "…" : "📍"}
          </button>
        </div>

        <div className="sm:col-span-1">
          <label className="block text-xs text-[var(--muted)] mb-1">Umkreis: {radius || "50"} km</label>
          <input
            type="range"
            min={radiusMin}
            max={radiusMax}
            step="5"
            value={radius || "50"}
            onChange={(e) => setRadius(e.target.value)}
            style={{
              background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${radiusPercent}%, #e5e7eb ${radiusPercent}%, #e5e7eb 100%)`,
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
