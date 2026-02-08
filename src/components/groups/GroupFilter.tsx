"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useToast } from "@/components/ui/Toast";

export default function GroupFilter() {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get("query") || "");
  const [location, setLocation] = useState(searchParams.get("address") || "");
  const [lat, setLat] = useState(searchParams.get("lat") || "");
  const [lng, setLng] = useState(searchParams.get("lng") || "");
  const [radius, setRadius] = useState(searchParams.get("radius") || "50");
  const [selectedTag, setSelectedTag] = useState(searchParams.get("tag") || "");
  const [onlyPerformances, setOnlyPerformances] = useState(searchParams.get("performances") === "1");
  const [onlySeekingMembers, setOnlySeekingMembers] = useState(searchParams.get("seeking") === "1");
  const [groupSize, setGroupSize] = useState(searchParams.get("size") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<{ id: string, name: string }[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const geocodeSeq = useRef(0);

  const radiusMin = 5;
  const radiusMax = 200;
  const radiusValue = Number(radius) || 0;
  const radiusPercent = Math.min(
    100,
    Math.max(0, ((radiusValue - radiusMin) / (radiusMax - radiusMin)) * 100)
  );

  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const debouncedLocation = useDebounce(location, 800); // Längerer Debounce für Geocoding API

  // Fetch tags for filter
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/tags?approvedOnly=true');
        if (res.ok) {
          const data = await res.json();
          setAvailableTags(data);
        }
      } catch {
        console.error("Failed to load tags");
      }
    };
    fetchTags();
  }, []);

  // Update URL function
  const updateUrl = useCallback(
    (
      newQuery: string,
      newLat: string,
      newLng: string,
      newRadius: string,
      newAddress: string,
      newTag: string,
      newOnlyPerformances: boolean,
      newOnlySeekingMembers: boolean,
      newGroupSize: string,
      newSort: string
    ) => {
      const params = new URLSearchParams(searchParamsString);

      if (newQuery) params.set("query", newQuery);
      else params.delete("query");

      if (newTag) params.set("tag", newTag);
      else params.delete("tag");

      if (newOnlyPerformances) params.set("performances", "1");
      else params.delete("performances");

      if (newOnlySeekingMembers) params.set("seeking", "1");
      else params.delete("seeking");

      if (newGroupSize) params.set("size", newGroupSize);
      else params.delete("size");

      if (newSort && newSort !== "newest") params.set("sort", newSort);
      else params.delete("sort");

      if (newLat && newLng) {
        params.set("lat", newLat);
        params.set("lng", newLng);
        params.set("radius", newRadius);
        if (newAddress) params.set("address", newAddress);
        else params.delete("address");
      } else {
        params.delete("lat");
        params.delete("lng");
        params.delete("radius");
        if (newAddress) params.set("address", newAddress);
        else params.delete("address");
      }

      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `/groups?${nextQuery}` : "/groups";
      const currentUrl = searchParamsString ? `/groups?${searchParamsString}` : "/groups";
      if (nextUrl === currentUrl) return;

      router.replace(nextUrl);
    },
    [router, searchParamsString]
  );

  // Effect for Search Term and Tag
  useEffect(() => {
    updateUrl(debouncedSearchTerm, lat, lng, radius, location, selectedTag, onlyPerformances, onlySeekingMembers, groupSize, sort);
  }, [debouncedSearchTerm, lat, lng, location, radius, selectedTag, onlyPerformances, onlySeekingMembers, groupSize, sort, updateUrl]);

  // Effect for Location Search (Geocoding)
  useEffect(() => {
    // Nur suchen, wenn Location Text da ist, aber noch keine Koordinaten oder wenn sich der Text geändert hat
    if (debouncedLocation && !lat && !lng) {
      const seqId = ++geocodeSeq.current;
      const controller = new AbortController();

      const geocode = async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedLocation)}&limit=1`,
            { signal: controller.signal }
          );
          if (!res.ok) {
            return;
          }

          const data = await res.json().catch(() => null);
          if (geocodeSeq.current !== seqId) return;
          if (!data || !data[0]) return;
          if (!debouncedLocation) return;

          if (data && data[0]) {
            setLat(data[0].lat);
            setLng(data[0].lon);
            updateUrl(searchTerm, data[0].lat, data[0].lon, radius, debouncedLocation, selectedTag, onlyPerformances, onlySeekingMembers, groupSize, sort);
          }
        } catch (e) {
          if (controller.signal.aborted) return;
          if (e instanceof DOMException && e.name === "AbortError") return;
          console.warn("Geocoding failed");
        }
      };
      geocode();

      return () => {
        controller.abort();
      };
    }
  }, [debouncedLocation, lat, lng, radius, searchTerm, selectedTag, onlyPerformances, onlySeekingMembers, groupSize, sort, updateUrl]);

  // Trigger URL update when Radius or Coordinates change (if already set)
  useEffect(() => {
    if (lat && lng) {
      updateUrl(searchTerm, lat, lng, radius, location, selectedTag, onlyPerformances, onlySeekingMembers, groupSize, sort);
    }
  }, [lat, lng, location, radius, searchTerm, selectedTag, onlyPerformances, onlySeekingMembers, groupSize, sort, updateUrl]);

  const handleUseMyLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLat(latitude.toString());
          setLng(longitude.toString());
          setLocation("Mein Standort");
          
          // Optional: Reverse Geocoding für schöneren Text
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            if (data && data.address) {
              const city = data.address.city || data.address.town || data.address.village || "Mein Standort";
              setLocation(city);
            }
          } catch {
            // Ignore
          }
          
          setIsLocating(false);
        },
        (error) => {
          console.error(error);
          setIsLocating(false);
          showToast('Standort konnte nicht ermittelt werden', 'error');
        }
      );
    } else {
      setIsLocating(false);
      showToast('Geolocation wird von diesem Browser nicht unterstützt', 'warning');
    }
  };

  const clearLocation = () => {
    geocodeSeq.current += 1;
    setLocation("");
    setLat("");
    setLng("");
    updateUrl(searchTerm, "", "", radius, "", selectedTag, onlyPerformances, onlySeekingMembers, groupSize, sort);
  };

  const clearAll = () => {
    geocodeSeq.current += 1;
    setSearchTerm("");
    setSelectedTag("");
    setOnlyPerformances(false);
    setOnlySeekingMembers(false);
    setGroupSize("");
    setSort("newest");
    setLocation("");
    setLat("");
    setLng("");
    setRadius("50");
    updateUrl("", "", "", "50", "", "", false, false, "", "newest");
  };

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    Boolean(selectedTag) ||
    Boolean(location.trim()) ||
    Boolean(onlyPerformances) ||
    Boolean(onlySeekingMembers) ||
    Boolean(groupSize) ||
    Boolean(sort && sort !== "newest");

  const showDistanceSort = Boolean(lat && lng);

  const secondaryControls = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Tanzstil</label>
        <div className="relative">
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="w-full px-4 py-2 pr-10 min-h-11 border border-[var(--border)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-[var(--surface)] text-[var(--foreground)] appearance-none"
          >
            <option value="">Alle Tanzstile</option>
            {availableTags.map((tag) => (
              <option key={tag.id} value={tag.name}>
                {tag.name}
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

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Standort</label>
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Stadt oder PLZ..."
              className="w-full px-4 py-2 min-h-11 border border-[var(--border)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                if (lat || lng) {
                  setLat("");
                  setLng("");
                }
              }}
            />
            {location && (
              <button
                onClick={clearLocation}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 px-3 py-2 rounded text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ×
              </button>
            )}
          </div>
          <button
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="px-2 min-h-11 min-w-11 border border-[var(--border)] rounded-md bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] transition"
            title="Meinen Standort verwenden"
          >
            {isLocating ? "..." : "📍"}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Optionen</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={onlyPerformances}
              onChange={(e) => setOnlyPerformances(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            Auftrittsanfragen
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={onlySeekingMembers}
              onChange={(e) => setOnlySeekingMembers(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            Sucht Mitglieder
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Gruppengröße</label>
        <div className="relative">
          <select
            value={groupSize}
            onChange={(e) => setGroupSize(e.target.value)}
            className="w-full px-4 py-2 pr-10 min-h-11 border border-[var(--border)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-[var(--surface)] text-[var(--foreground)] appearance-none"
          >
            <option value="">Alle Größen</option>
            <option value="SOLO">Solo</option>
            <option value="DUO">Duo</option>
            <option value="TRIO">Trio</option>
            <option value="SMALL">Kleine Gruppe (&lt; 10)</option>
            <option value="LARGE">Große Gruppe (&gt; 10)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--muted)]">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mb-4 bg-[var(--surface)] text-[var(--foreground)] p-3 rounded-lg shadow-sm border border-[var(--border)] space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Text Suche */}
        <div className="relative">
          <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Suche</label>
          <input
            type="text"
            placeholder="Name, Beschreibung..."
            className="w-full px-3 py-2 min-h-10 border border-[var(--border)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Sortierung</label>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => {
                const next = e.target.value;
                if (next === "distance" && !showDistanceSort) {
                  showToast('Für „Entfernung“ bitte einen Standort/Umkreis setzen.', 'info');
                  setIsFilterOpen(true);
                  setSort("newest");
                  return;
                }
                setSort(next);
              }}
              className="w-full px-3 py-2 pr-9 min-h-10 border border-[var(--border)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-[var(--surface)] text-[var(--foreground)] appearance-none"
            >
              <option value="newest">Neueste</option>
              <option value="popular">Beliebtheit</option>
              <option value="name">Alphabetisch</option>
              <option value="distance">
                Entfernung
              </option>
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
      </div>

      <details
        className="rounded-md border border-[var(--border)] bg-[var(--surface-2)]"
        open={isFilterOpen}
        onToggle={(e) => setIsFilterOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-[var(--foreground)]">
          Filter
        </summary>
        <div className="px-3 pb-3 pt-1 space-y-3">
          {secondaryControls}

          {(lat && lng) && (
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                Umkreis: {radius} km
              </label>
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
          )}
        </div>
      </details>

      {hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {onlyPerformances ? (
            <button
              type="button"
              onClick={() => setOnlyPerformances(false)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              Auftrittsanfragen
              <span className="text-[var(--muted)]">×</span>
            </button>
          ) : null}

          {onlySeekingMembers ? (
            <button
              type="button"
              onClick={() => setOnlySeekingMembers(false)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              Sucht Mitglieder
              <span className="text-[var(--muted)]">×</span>
            </button>
          ) : null}

          {groupSize ? (
            <button
              type="button"
              onClick={() => setGroupSize("")}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              Größe: {groupSize}
              <span className="text-[var(--muted)]">×</span>
            </button>
          ) : null}

          {selectedTag ? (
            <button
              type="button"
              onClick={() => setSelectedTag("")}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              Tanzstil: {selectedTag}
              <span className="text-[var(--muted)]">×</span>
            </button>
          ) : null}

          {searchTerm.trim() ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              Suche
              <span className="text-[var(--muted)]">×</span>
            </button>
          ) : null}

          {(location.trim() || (lat && lng)) ? (
            <button
              type="button"
              onClick={clearLocation}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              Standort
              <span className="text-[var(--muted)]">×</span>
            </button>
          ) : null}

          {sort && sort !== "newest" ? (
            <button
              type="button"
              onClick={() => setSort("newest")}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
            >
              Sortierung
              <span className="text-[var(--muted)]">×</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={clearAll}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition"
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : null}
    </div>
  );
}
