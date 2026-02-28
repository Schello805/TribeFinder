"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";

type Props = {
  availableMonths: string[];
  initialAddress?: string;
};

export default function EventFilter({ availableMonths, initialAddress }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [danceStyleId, setDanceStyleId] = useState(searchParams.get("danceStyleId") || "");
  const [month, setMonth] = useState(searchParams.get("month") || "");
  const [location, setLocation] = useState(searchParams.get("address") || initialAddress || "");
  const [lat, setLat] = useState(searchParams.get("lat") || "");
  const [lng, setLng] = useState(searchParams.get("lng") || "");
  const [radius, setRadius] = useState(searchParams.get("radius") || "50");
  const [isLocating, setIsLocating] = useState(false);
  const [availableStyles, setAvailableStyles] = useState<Array<{ id: string; name: string }>>([]);
  const [debouncedSearch] = useDebounce(search, 500);
  const [debouncedLocation] = useDebounce(location, 800);

  const radiusMin = 5;
  const radiusMax = 200;
  const radiusValue = Number(radius) || 0;
  const radiusPercent = Math.min(
    100,
    Math.max(0, ((radiusValue - radiusMin) / (radiusMax - radiusMin)) * 100)
  );

  const formatMonthLabel = (value: string) => {
    const m = /^\d{4}-\d{2}$/.exec(value);
    if (!m) return value;
    const [y, mo] = value.split("-");
    const d = new Date(Date.UTC(Number(y), Number(mo) - 1, 1, 0, 0, 0, 0));
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(d);
  };

  useEffect(() => {
    const loadStyles = async () => {
      try {
        const res = await fetch("/api/dance-styles?usedBy=events", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as unknown;
        const available =
          typeof data === "object" && data !== null && "available" in data && Array.isArray((data as { available?: unknown }).available)
            ? ((data as { available: unknown[] }).available as unknown[])
            : [];
        const mapped = available
          .map((x) => {
            if (!x || typeof x !== "object") return null;
            const id = "id" in x && typeof (x as { id?: unknown }).id === "string" ? (x as { id: string }).id : null;
            const name = "name" in x && typeof (x as { name?: unknown }).name === "string" ? (x as { name: string }).name : null;
            if (!id || !name) return null;
            return { id, name };
          })
          .filter(Boolean) as Array<{ id: string; name: string }>;
        setAvailableStyles(mapped);
      } catch {
        return;
      }
    };
    void loadStyles();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    
    if (debouncedSearch) {
      params.set("q", debouncedSearch);
    } else {
      params.delete("q");
    }

    if (danceStyleId) params.set("danceStyleId", danceStyleId);
    else params.delete("danceStyleId");

    if (month) params.set("month", month);
    else params.delete("month");

    if (lat && lng) {
      params.set("lat", lat);
      params.set("lng", lng);
      params.set("radius", radius);
      if (location) params.set("address", location);
      else params.delete("address");
    } else {
      params.delete("lat");
      params.delete("lng");
      params.delete("radius");
      if (location) params.set("address", location);
      else params.delete("address");
    }

    const next = params.toString();
    if (next === searchParamsString) return;

    router.replace(next ? `/events?${next}` : "/events");
  }, [debouncedSearch, danceStyleId, lat, lng, location, month, radius, router, searchParamsString]);

  useEffect(() => {
    if (debouncedLocation && !lat && !lng) {
      const controller = new AbortController();

      const geocode = async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedLocation)}&limit=1`,
            { signal: controller.signal }
          );
          if (!res.ok) return;
          const data = (await res.json().catch(() => null)) as unknown;
          if (!Array.isArray(data) || !data[0]) return;
          const first = data[0] as { lat?: unknown; lon?: unknown };
          if (typeof first.lat !== "string" || typeof first.lon !== "string") return;
          setLat(first.lat);
          setLng(first.lon);
        } catch (e) {
          if (controller.signal.aborted) return;
          if (e instanceof DOMException && e.name === "AbortError") return;
          return;
        }
      };

      void geocode();
      return () => controller.abort();
    }
  }, [debouncedLocation, lat, lng]);

  useEffect(() => {
    if (lat && lng) {
      const next = String(radiusValue || "");
      if (!next) return;
      if (radius !== next) setRadius(next);
    }
  }, [lat, lng, radius, radiusValue]);

  const clearLocation = () => {
    setLocation("");
    setLat("");
    setLng("");
    setRadius("50");
  };

  const handleUseMyLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setLat(String(latitude));
        setLng(String(longitude));
        setLocation("Mein Standort");
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1&accept-language=de`
          );
          if (res.ok) {
            const data = (await res.json().catch(() => null)) as any;
            const city = data?.address?.city || data?.address?.town || data?.address?.village;
            if (typeof city === "string" && city.trim()) {
              setLocation(city.trim());
            }
          }
        } catch {
          // ignore
        }
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="bg-[var(--surface)] text-[var(--foreground)] p-4 rounded-lg shadow-sm border border-[var(--border)] w-full">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="relative md:col-span-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Events suchen (Titel, Ort, Gruppe)..."
            className="block w-full pl-10 pr-3 py-2 min-h-11 border border-[var(--border)] rounded-md leading-5 bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:placeholder:text-[var(--muted)] focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] sm:text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="relative md:col-span-2">
          <select
            value={danceStyleId}
            onChange={(e) => setDanceStyleId(e.target.value)}
            className="block w-full px-3 py-2 pr-9 min-h-11 border border-[var(--border)] rounded-md leading-5 bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] sm:text-sm appearance-none"
          >
            <option value="">Alle Tanzstile</option>
            {availableStyles.length === 0 ? (
              <option value="" disabled>
                Noch keine Tanzstile in Events vorhanden
              </option>
            ) : null}
            {availableStyles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted)]">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="relative md:col-span-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="block w-full px-3 py-2 pr-9 min-h-11 border border-[var(--border)] rounded-md leading-5 bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] sm:text-sm appearance-none"
          >
            <option value="">Alle Monate</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted)]">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        <div className="flex gap-2 md:col-span-4">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Stadt oder PLZ..."
              className="block w-full px-3 py-2 min-h-11 border border-[var(--border)] rounded-md leading-5 bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] sm:text-sm"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                if (lat || lng) {
                  setLat("");
                  setLng("");
                }
              }}
            />
            {location ? (
              <button
                type="button"
                onClick={clearLocation}
                className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-2 rounded text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ×
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="px-3 min-h-11 min-w-11 border border-[var(--border)] rounded-md bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition disabled:opacity-50"
            title="Meinen Standort verwenden"
          >
            {isLocating ? "..." : "📍"}
          </button>
        </div>
      </div>

      {(lat && lng) ? (
        <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-medium text-[var(--foreground)]">Umkreis</div>
            <div className="text-xs text-[var(--muted)]">{radius} km</div>
          </div>
          <input
            type="range"
            min={radiusMin}
            max={radiusMax}
            step="5"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            style={{
              background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${radiusPercent}%, #e5e7eb ${radiusPercent}%, #e5e7eb 100%)`,
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-[var(--muted)] mt-1">
            <span>5 km</span>
            <span>200 km</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
