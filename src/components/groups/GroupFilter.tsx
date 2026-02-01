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
    (newQuery: string, newLat: string, newLng: string, newRadius: string, newAddress: string, newTag: string) => {
      const params = new URLSearchParams(searchParamsString);

      if (newQuery) params.set("query", newQuery);
      else params.delete("query");

      if (newTag) params.set("tag", newTag);
      else params.delete("tag");

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
    updateUrl(debouncedSearchTerm, lat, lng, radius, location, selectedTag);
  }, [debouncedSearchTerm, lat, lng, location, radius, selectedTag, updateUrl]);

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
            updateUrl(searchTerm, data[0].lat, data[0].lon, radius, debouncedLocation, selectedTag);
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
  }, [debouncedLocation, lat, lng, radius, searchTerm, selectedTag, updateUrl]);

  // Trigger URL update when Radius or Coordinates change (if already set)
  useEffect(() => {
    if (lat && lng) {
      updateUrl(searchTerm, lat, lng, radius, location, selectedTag);
    }
  }, [lat, lng, location, radius, searchTerm, selectedTag, updateUrl]);

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
    updateUrl(searchTerm, "", "", radius, "", selectedTag);
  };

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Text Suche */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Suche</label>
          <input
            type="text"
            placeholder="Name, Beschreibung..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder:text-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tag Filter */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tanzstil</label>
          <div className="relative">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-black dark:text-white appearance-none"
            >
              <option value="">Alle Tanzstile</option>
              {availableTags.map(tag => (
                <option key={tag.id} value={tag.name}>{tag.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Standort Suche */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Standort</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Stadt oder PLZ..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder:text-gray-400"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  // Reset coords if user types manually to force re-geocode or clear
                  if (lat || lng) {
                    setLat("");
                    setLng("");
                  }
                }}
              />
              {location && (
                <button 
                  onClick={clearLocation}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 px-3 py-2 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="px-3 py-2 min-h-11 min-w-11 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200"
              title="Meinen Standort verwenden"
            >
              {isLocating ? "..." : "📍"}
            </button>
          </div>
        </div>
      </div>

      {/* Radius Slider (nur sichtbar wenn Koordinaten da sind) */}
      {(lat && lng) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
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
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>5 km</span>
            <span>200 km</span>
          </div>
        </div>
      )}
    </div>
  );
}
