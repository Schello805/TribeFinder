"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { useToast } from "@/components/ui/Toast";
import "leaflet/dist/leaflet.css";
import "leaflet-gesture-handling/dist/leaflet-gesture-handling.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

type NominatimReverseResult = {
  address?: {
    postcode?: string;
    country_code?: string;
  };
};

interface MapTag {
  name: string;
}

interface MapLocation {
  lat: number;
  lng: number;
  address?: string | null;
}

interface MapGroup {
  id: string;
  name: string;
  image?: string | null;
  website?: string | null;
  size?: string | null;
  location?: MapLocation | null;
  tags: MapTag[];
}

interface MapEvent {
  id: string;
  title: string;
  startDate: string | Date;
  lat?: number | null;
  lng?: number | null;
  locationName?: string | null;
  group?: { name?: string | null } | null;
  creator?: { name?: string | null } | null;
  organizer?: string | null;
  flyer1?: string | null;
  flyer2?: string | null;
}

interface MapLink {
  id: string;
  url: string;
  title: string;
  category: string | null;
  postalCode: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
}

type MapLinkCategory = { id: string; name: string; showOnMap: boolean };

function hashToUnit(v: string): number {
  let h = 2166136261;
  for (let i = 0; i < v.length; i++) {
    h ^= v.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0..1
  return ((h >>> 0) % 10_000) / 10_000;
}

function jitterLatLng(baseLat: number, baseLng: number, key: string, index: number, totalAtPoint: number) {
  if (totalAtPoint <= 1) return { lat: baseLat, lng: baseLng };

  // Deterministic "random" angle + small radius in meters.
  // Keep it small so it still represents PLZ/Ort.
  const u = hashToUnit(key);
  const angle = 2 * Math.PI * (u + index / Math.max(1, totalAtPoint));
  const radiusM = 30 + 50 * hashToUnit(`${key}:${index}`); // 30..80m

  const latFactor = 1 / 111_320;
  const lngFactor = 1 / (111_320 * Math.cos((baseLat * Math.PI) / 180));

  const dLat = Math.sin(angle) * radiusM * latFactor;
  const dLng = Math.cos(angle) * radiusM * lngFactor;

  return { lat: baseLat + dLat, lng: baseLng + dLng };
}

const createPinIcon = (color: string) =>
  L.divIcon({
    className: "",
    iconSize: [26, 41],
    iconAnchor: [13, 41],
    popupAnchor: [0, -38],
    html: `
      <svg width="26" height="41" viewBox="0 0 26 41" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M13 41s13-14.9 13-26C26 6.7 20.2 0 13 0S0 6.7 0 15c0 11.1 13 26 13 26z" fill="${color}"/>
        <path d="M13 21.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z" fill="white" opacity="0.95"/>
        <path d="M13 20.3a5.3 5.3 0 1 0 0-10.6 5.3 5.3 0 0 0 0 10.6z" fill="${color}" opacity="0.25"/>
      </svg>
    `.trim(),
  });

const groupIcon = createPinIcon("#2563eb");
const eventIcon = createPinIcon("#dc2626");
const linkIcon = createPinIcon("#059669");

interface MapProps {
  groups: MapGroup[];
  events?: MapEvent[];
  availableTags?: { id: string; name: string }[];
  links?: MapLink[];
}

export default function Map({ groups, events = [], availableTags = [], links = [] }: MapProps) {
  const { showToast } = useToast();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const groupClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const eventClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const linkClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const eventLocationOkCache = useRef<globalThis.Map<string, boolean>>(new globalThis.Map());
  const [mapReady, setMapReady] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [showGroups, setShowGroups] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  const [linkCategories, setLinkCategories] = useState<MapLinkCategory[]>([]);
  const [selectedLinkCategoryIds, setSelectedLinkCategoryIds] = useState<Record<string, boolean>>({});
  const [showUncategorizedLinks, setShowUncategorizedLinks] = useState(true);

  const selectedLinkCategoryNames = useMemo(() => {
    const set = new Set<string>();
    for (const c of linkCategories) {
      if (selectedLinkCategoryIds[c.id]) set.add(c.name);
    }
    return set;
  }, [linkCategories, selectedLinkCategoryIds]);

  useEffect(() => {
    let alive = true;
    const loadLinkCategoriesForMap = async () => {
      try {
        const res = await fetch("/api/link-categories?onlyOnMap=1", { cache: "no-store" });
        const data = (await res.json().catch(() => [])) as unknown;
        if (!alive) return;
        if (!Array.isArray(data)) {
          setLinkCategories([]);
          setSelectedLinkCategoryIds({});
          return;
        }

        const items = data as MapLinkCategory[];
        setLinkCategories(items);
        setSelectedLinkCategoryIds((prev) => {
          const next: Record<string, boolean> = { ...prev };
          for (const c of items) {
            if (typeof next[c.id] !== "boolean") next[c.id] = true;
          }
          for (const id of Object.keys(next)) {
            if (!items.some((c) => c.id === id)) delete next[id];
          }
          return next;
        });
      } catch {
        if (!alive) return;
        setLinkCategories([]);
        setSelectedLinkCategoryIds({});
      }
    };

    void loadLinkCategoriesForMap();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setIsFilterOpen(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  const extractPostcode = useCallback((address: string) => {
    const m = (address || "").match(/\b(\d{5})\b/);
    return m ? m[1] : null;
  }, []);

  const buildNominatimReverseUrl = useCallback((lat: number, lng: number) => {
    const params = new URLSearchParams({
      format: "json",
      lat: String(lat),
      lon: String(lng),
      zoom: "18",
      addressdetails: "1",
      "accept-language": "de",
    });
    return `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;
  }, []);

  const isEventLocationReliable = useCallback(async (event: MapEvent) => {
    if (!event.id) return false;
    const cached = eventLocationOkCache.current.get(event.id);
    if (typeof cached === "boolean") return cached;

    const lat = typeof event.lat === "number" ? event.lat : null;
    const lng = typeof event.lng === "number" ? event.lng : null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      eventLocationOkCache.current.set(event.id, false);
      return false;
    }

    const postcodeInAddress = extractPostcode(String((event as unknown as { address?: string | null }).address || ""));
    if (!postcodeInAddress) {
      eventLocationOkCache.current.set(event.id, true);
      return true;
    }

    try {
      const res = await fetch(buildNominatimReverseUrl(lat!, lng!));
      const json = (await res.json().catch(() => null)) as NominatimReverseResult | null;
      const postcode = typeof json?.address?.postcode === "string" ? json.address.postcode.trim() : "";
      const ok = Boolean(postcode && postcode === postcodeInAddress);
      eventLocationOkCache.current.set(event.id, ok);
      return ok;
    } catch {
      eventLocationOkCache.current.set(event.id, false);
      return false;
    }
  }, [buildNominatimReverseUrl, extractPostcode]);

  const handleLocateMe = () => {
    setIsLocating(true);
    if (navigator.geolocation && mapRef.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          mapRef.current?.flyTo([latitude, longitude], 12);
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location", error);
          setIsLocating(false);
          showToast('Standort konnte nicht ermittelt werden', 'error');
        }
      );
    } else {
      setIsLocating(false);
      showToast('Geolocation wird nicht unterstützt', 'warning');
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Import gesture handling dynamically and initialize map after it's loaded
    import("leaflet-gesture-handling").then((GestureHandling) => {
      L.Map.addInitHook("addHandler", "gestureHandling", GestureHandling.GestureHandling);
      
      // Initialize map AFTER gesture handling is loaded
      if (!mapRef.current && mapContainerRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
          gestureHandling: true,
          zoomControl: false,
          gestureHandlingOptions: {
            text: {
              touch: "Verwende zwei Finger zum Bewegen der Karte",
              scroll: "Strg + Scrollen zum Zoomen",
              scrollMac: "⌘ + Scrollen zum Zoomen"
            },
            duration: 1000
          }
        } as unknown as L.MapOptions).setView([51.1657, 10.4515], 6);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapRef.current);

        groupClusterRef.current = L.markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          maxClusterRadius: 46,
        });
        eventClusterRef.current = L.markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          maxClusterRadius: 46,
        });
        linkClusterRef.current = L.markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          maxClusterRadius: 46,
        });

        groupClusterRef.current.addTo(mapRef.current);
        eventClusterRef.current.addTo(mapRef.current);
        linkClusterRef.current.addTo(mapRef.current);

        setMapReady(true);
      }
    });

    // Cleanup function will handle marker removal
    return () => {
      if (mapRef.current) {
        if (groupClusterRef.current) {
          groupClusterRef.current.clearLayers();
          groupClusterRef.current = null;
        }
        if (eventClusterRef.current) {
          eventClusterRef.current.clearLayers();
          eventClusterRef.current = null;
        }
        if (linkClusterRef.current) {
          linkClusterRef.current.clearLayers();
          linkClusterRef.current = null;
        }
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Separate effect for markers that responds to filter changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    groupClusterRef.current?.clearLayers();
    eventClusterRef.current?.clearLayers();
    linkClusterRef.current?.clearLayers();

    // Filter groups by selected tag
    const filteredGroups = selectedTag
      ? groups.filter((g) => g.tags?.some((t) => t.name === selectedTag))
      : groups;

    const isLinkVisible = (link: MapLink) => {
      const categoryName = (link.category || "").trim();
      if (!categoryName) return showUncategorizedLinks;
      return selectedLinkCategoryNames.has(categoryName);
    };

    const visibleLinks = (links || []).filter((link) => {
      const lat = typeof link.lat === "number" ? link.lat : null;
      const lng = typeof link.lng === "number" ? link.lng : null;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      return isLinkVisible(link);
    });

    const visibleGroups = (filteredGroups || []).filter((group) => {
      const lat = group.location?.lat;
      const lng = group.location?.lng;
      return typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng);
    });

    const visibleEvents = (events || []).filter((event) => {
      const lat = typeof event.lat === "number" ? event.lat : null;
      const lng = typeof event.lng === "number" ? event.lng : null;
      return Number.isFinite(lat) && Number.isFinite(lng);
    });

    // Build deterministic jitter map for points shared between groups and links,
    // so markers from different types don't overlap.
    const pointMarkerKeys = new globalThis.Map<string, string[]>();
    const addPointKey = (lat: number, lng: number, markerKey: string) => {
      const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      const arr = pointMarkerKeys.get(key) || [];
      arr.push(markerKey);
      pointMarkerKeys.set(key, arr);
    };

    for (const group of visibleGroups) {
      addPointKey(group.location!.lat, group.location!.lng, `G:${group.id}`);
    }
    for (const link of visibleLinks) {
      addPointKey(link.lat as number, link.lng as number, `L:${link.id}`);
    }
    for (const event of visibleEvents) {
      addPointKey(event.lat as number, event.lng as number, `E:${event.id}`);
    }

    for (const [k, arr] of pointMarkerKeys.entries()) {
      arr.sort();
      pointMarkerKeys.set(k, arr);
    }

    // Add markers for groups
    if (showGroups) {
      filteredGroups.forEach((group) => {
        if (group.location) {
          const pointKey = `${group.location.lat.toFixed(6)},${group.location.lng.toFixed(6)}`;
          const keys = pointMarkerKeys.get(pointKey) || [];
          const index = keys.findIndex((x) => x === `G:${group.id}`);
          const j = jitterLatLng(group.location.lat, group.location.lng, pointKey, Math.max(0, index), keys.length);

          const normalizedGroupImage = normalizeUploadedImageUrl((group.image || "").trim());

          // Logo Logic
          const logoHtml = normalizedGroupImage 
            ? `<div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-20 h-20 rounded-full border-4 border-[var(--surface)] bg-[var(--surface)] overflow-hidden shadow-lg flex items-center justify-center z-10 pointer-events-none">
                 <img src="${normalizedGroupImage}" alt="${group.name}" class="w-full h-full object-contain p-1 pointer-events-none" />
               </div>`
            : `<div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-20 h-20 rounded-full border-4 border-[var(--surface)] bg-[var(--surface)] flex items-center justify-center shadow-lg z-10 pointer-events-none">
                 <span class="tf-display text-2xl font-bold text-[var(--link)] pointer-events-none">${group.name.charAt(0)}</span>
               </div>`;
        
          // Website Logic
          const websiteHtml = group.website
            ? `<a href="${group.website}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-[var(--link)] hover:opacity-90 text-xs font-medium truncate transition-colors bg-[var(--surface-2)] px-2 py-1 rounded-full border border-[var(--border)]">
                 <svg class="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                 ${group.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
               </a>`
            : '';

          const marker = L.marker([j.lat, j.lng], { icon: groupIcon }).bindPopup(
            `
              <div class="min-w-[260px] font-sans -m-1">
                <div class="relative bg-[var(--surface)] text-[var(--foreground)] rounded-xl shadow-xl border border-[var(--border)]">
                  ${logoHtml}

                  <div class="pt-12 pb-5 px-5 text-center">
                    <h3 class="tf-display font-extrabold text-xl text-[var(--foreground)] leading-tight mb-1">${group.name}</h3>
                    <p class="text-[11px] text-[var(--muted)] font-bold uppercase tracking-widest mb-4">
                      ${group.size === 'SOLO' ? 'Solo Artist' : group.size === 'SMALL' ? 'Kleine Gruppe' : 'Große Gruppe'}
                    </p>

                    <div class="flex flex-col gap-2 mb-4">
                      <p class="text-sm text-[var(--muted)] flex items-center justify-center gap-1.5">
                        <span class="bg-[var(--surface-2)] p-1 rounded-full text-[var(--muted)] border border-[var(--border)]">
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </span>
                        <span class="truncate max-w-[180px]">${group.location.address || 'Keine Adresse'}</span>
                      </p>

                      ${websiteHtml ? `<div class="flex justify-center">${websiteHtml}</div>` : ''}
                    </div>

                    <div class="flex flex-wrap justify-center gap-1.5 mb-5">
                      ${group.tags
                        .slice(0, 3)
                        .map(
                          (t) =>
                            `<span class="text-[10px] font-medium bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] px-2.5 py-1 rounded-full">${t.name}</span>`
                        )
                        .join('')}
                      ${group.tags.length > 3 ? `<span class="text-[10px] text-[var(--muted)] px-1 self-center font-medium">+${group.tags.length - 3}</span>` : ''}
                    </div>

                    <a href="/groups/${group.id}" class="relative z-20 block w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] text-[var(--primary-foreground)] text-sm font-bold py-2.5 rounded-lg transition-all transform hover:scale-[1.02] shadow-md no-underline">
                      Profil ansehen
                    </a>
                  </div>
                </div>
              </div>
            `,
            {
              className: "custom-popup-style",
              closeButton: false,
              autoClose: false,
              closeOnClick: false,
              keepInView: true,
            }
          );
          groupClusterRef.current?.addLayer(marker);
          markersRef.current.push(marker);
        }
      });
    }

    // Add markers for events
    if (showEvents) {
      (async () => {
        for (const event of events || []) {
          const lat = typeof event.lat === "number" ? event.lat : null;
          const lng = typeof event.lng === "number" ? event.lng : null;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

          const ok = await isEventLocationReliable(event);
          if (!ok) continue;

        const date = new Date(event.startDate).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Berlin'
        });

        const organizerName = ((event.organizer || '').trim() || (event.group?.name || '').trim());
        const flyerUrl = normalizeUploadedImageUrl((event.flyer1 || event.flyer2 || '').trim()) || '';
        
        const pointKey = `${lat!.toFixed(6)},${lng!.toFixed(6)}`;
        const keys = pointMarkerKeys.get(pointKey) || [];
        const index = keys.findIndex((x) => x === `E:${event.id}`);
        const j = jitterLatLng(lat!, lng!, pointKey, Math.max(0, index), keys.length);

        const marker = L.marker([j.lat, j.lng], { icon: eventIcon })
          .bindPopup(`
            <div class="min-w-[260px] font-sans -m-1">
              <div class="p-4 bg-[var(--surface)] text-[var(--foreground)] rounded-xl shadow-lg border border-[var(--border)]">
                <div class="flex items-center justify-between gap-3 mb-3">
                  <span class="text-[11px] font-bold bg-[var(--surface-2)] text-[var(--foreground)] px-2 py-0.5 rounded-full border border-[var(--border)]">EVENT</span>
                  <span class="text-[11px] text-[var(--muted)] font-medium">${date} Uhr</span>
                </div>

                <div class="flex items-start gap-3">
                  ${flyerUrl ? `
                    <div class="w-14 h-14 rounded-lg overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] flex-shrink-0">
                      <img src="${flyerUrl}" alt="Flyer" class="w-full h-full object-cover" />
                    </div>
                  ` : ''}

                  <div class="min-w-0">
                    <h3 class="tf-display font-extrabold text-lg leading-snug text-[var(--foreground)] mb-1 truncate">${event.title}</h3>
                    ${organizerName ? `<p class="text-sm text-[var(--foreground)] mb-1 truncate"><span class=\"text-[var(--muted)]\">Veranstalter:</span> <span class=\"font-semibold\">${organizerName}</span></p>` : ''}
                    ${event.locationName ? `<p class="text-sm text-[var(--muted)] mb-2 truncate">${event.locationName}</p>` : ''}
                  </div>
                </div>

                <div class="mt-3">
                  <a href="/events/${event.id}" class="inline-flex items-center px-3 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] text-[var(--primary-foreground)] text-sm font-bold no-underline">
                    Zum Event
                  </a>
                </div>
              </div>
            </div>
          `, {
            autoClose: false,
            closeOnClick: false,
            keepInView: true,
          });
          eventClusterRef.current?.addLayer(marker);
          markersRef.current.push(marker);
        }
      })();
    }

    // Add markers for external links
    if (showUncategorizedLinks || selectedLinkCategoryNames.size > 0) {
      for (const link of visibleLinks) {
        const lat = link.lat as number;
        const lng = link.lng as number;

        const pointKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
        const keys = pointMarkerKeys.get(pointKey) || [];
        const index = keys.findIndex((x) => x === `L:${link.id}`);
        const j = jitterLatLng(lat, lng, pointKey, Math.max(0, index), keys.length);

        const locationText = [link.postalCode, link.city].filter(Boolean).join(" ");
        const categoryText = (link.category || "").trim();
        const safeUrl = (link.url || "").trim();

        const marker = L.marker([j.lat, j.lng], { icon: linkIcon }).bindPopup(
          `
            <div class="min-w-[260px] font-sans -m-1">
              <div class="p-4 bg-[var(--surface)] text-[var(--foreground)] rounded-xl shadow-lg border border-[var(--border)]">
                <div class="flex items-center justify-between gap-3 mb-2">
                  <span class="text-[11px] font-bold bg-[var(--surface-2)] text-[var(--foreground)] px-2 py-0.5 rounded-full border border-[var(--border)]">LINK</span>
                  ${categoryText ? `<span class="text-[11px] font-medium bg-[var(--surface-2)] text-[var(--foreground)] px-2 py-0.5 rounded-full border border-[var(--border)]">${categoryText}</span>` : ""}
                </div>

                <h3 class="tf-display font-extrabold text-lg leading-snug text-[var(--foreground)] mb-1">${link.title}</h3>
                ${locationText ? `<p class="text-sm text-[var(--muted)] mb-2">${locationText}</p>` : ""}

                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-[var(--link)] hover:opacity-90 text-xs font-medium break-all transition-colors bg-[var(--surface-2)] px-2 py-1 rounded-full border border-[var(--border)] no-underline">
                  ${safeUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              </div>
            </div>
          `.trim(),
          {
            autoClose: false,
            closeOnClick: false,
            keepInView: true,
          }
        );

        linkClusterRef.current?.addLayer(marker);
        markersRef.current.push(marker);
      }
    }
  }, [groups, events, links, selectedTag, showGroups, showEvents, selectedLinkCategoryNames, showUncategorizedLinks, mapReady, isEventLocationReliable]);

  return (
    <div className="relative h-[calc(100vh-64px)] w-full z-0">
      <div ref={mapContainerRef} className="h-full w-full" />
      
      {/* Filter Panel */}
      <div
        className="absolute top-2 left-2 md:top-4 md:left-4 z-[400] bg-[var(--surface)] text-[var(--foreground)] rounded-lg shadow-lg border border-[var(--border)] p-3 md:p-4 max-w-[calc(100vw-1rem)] md:max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="tf-display font-semibold text-[var(--foreground)] text-sm">Filter</h3>
          <button
            type="button"
            onClick={() => setIsFilterOpen((v) => !v)}
            className="md:hidden text-xs font-semibold text-[var(--link)] hover:opacity-90"
            aria-expanded={isFilterOpen}
          >
            {isFilterOpen ? "Weniger" : "Mehr"}
          </button>
        </div>

        <div className={`${isFilterOpen ? "mt-3" : "hidden md:block md:mt-3"} max-h-[55vh] overflow-auto pr-1`}>
        
        {/* Tag/Style Filter */}
        {availableTags.length > 0 && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Tanzstil</label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full text-sm border border-[var(--border)] rounded-md px-2 py-1.5 bg-[var(--surface)] text-[var(--foreground)]"
            >
              <option value="">Alle Stile</option>
              {availableTags.map(tag => (
                <option key={tag.id} value={tag.name}>{tag.name}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* Show/Hide Toggles */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showGroups}
              onChange={(e) => setShowGroups(e.target.checked)}
              className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-[var(--primary)] rounded-full"></span>
              Gruppen
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showEvents}
              onChange={(e) => setShowEvents(e.target.checked)}
              className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-600 rounded-full"></span>
              Events
            </span>
          </label>
          {linkCategories.length > 0 || links.length > 0 ? (
            <div className="pt-2 border-t border-[var(--border)]">
              <div className="text-xs font-medium text-[var(--muted)] mb-2">Links</div>
              <div className="space-y-1">
                {linkCategories.length === 0 ? (
                  <div className="text-xs text-[var(--muted)]">Keine Kategorien</div>
                ) : null}

                {linkCategories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedLinkCategoryIds[c.id])}
                      onChange={(e) => setSelectedLinkCategoryIds((prev) => ({ ...prev, [c.id]: e.target.checked }))}
                      className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="w-3 h-3 bg-emerald-600 rounded-full"></span>
                      <span className="truncate">{c.name}</span>
                    </span>
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUncategorizedLinks}
                    onChange={(e) => setShowUncategorizedLinks(e.target.checked)}
                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span className="flex items-center gap-1 min-w-0">
                    <span className="w-3 h-3 bg-emerald-600 rounded-full opacity-60"></span>
                    <span className="truncate">Ohne Kategorie</span>
                  </span>
                </label>
              </div>
            </div>
          ) : null}
        </div>
        </div>
      </div>
      
      {/* Control Buttons - Bottom Right */}
      <div className="absolute bottom-6 right-4 z-[400] flex flex-col gap-2">
        {/* Zoom In */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            mapRef.current?.zoomIn();
          }}
          className="bg-[var(--surface)] p-2 rounded-md shadow-md border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] focus:outline-none"
          title="Vergrößern"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        
        {/* Zoom Out */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            mapRef.current?.zoomOut();
          }}
          className="bg-[var(--surface)] p-2 rounded-md shadow-md border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] focus:outline-none"
          title="Verkleinern"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        
        {/* Locate Me */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleLocateMe();
          }}
          disabled={isLocating}
          className="bg-[var(--surface)] p-2 rounded-md shadow-md border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] focus:outline-none disabled:opacity-50"
          title="Meinen Standort anzeigen"
        >
          {isLocating ? (
             <span className="animate-spin block text-sm text-[var(--muted)]">⌛</span>
          ) : (
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
          )}
        </button>
      </div>
    </div>
  );
}
