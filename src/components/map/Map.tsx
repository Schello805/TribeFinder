"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { useToast } from "@/components/ui/Toast";
import "leaflet/dist/leaflet.css";
import "leaflet-gesture-handling/dist/leaflet-gesture-handling.css";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

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
  size?: "SOLO" | "SMALL" | "LARGE" | null;
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

// Define icons
const groupIcon = new L.Icon({
  iconUrl: "/images/markers/marker-icon-2x-blue.png",
  shadowUrl: "/images/markers/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const eventIcon = new L.Icon({
  iconUrl: "/images/markers/marker-icon-2x-red.png",
  shadowUrl: "/images/markers/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapProps {
  groups: MapGroup[];
  events?: MapEvent[];
  availableTags?: { id: string; name: string }[];
}

export default function Map({ groups, events = [], availableTags = [] }: MapProps) {
  const { showToast } = useToast();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [showGroups, setShowGroups] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

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

        setMapReady(true);
      }
    });

    // Cleanup function will handle marker removal
    return () => {
      if (mapRef.current) {
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

    // Filter groups by selected tag
    const filteredGroups = selectedTag
      ? groups.filter((g) => g.tags?.some((t) => t.name === selectedTag))
      : groups;

    // Add markers for groups
    if (showGroups) {
      filteredGroups.forEach((group) => {
        if (group.location) {
          // Logo Logic
        const logoHtml = group.image 
          ? `<div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-20 h-20 rounded-full border-4 border-white bg-white overflow-hidden shadow-lg flex items-center justify-center z-10">
               <img src="${group.image}" alt="${group.name}" class="w-full h-full object-contain p-1" />
             </div>`
          : `<div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-20 h-20 rounded-full border-4 border-white bg-white flex items-center justify-center shadow-lg z-10">
               <span class="text-2xl font-bold text-indigo-600">${group.name.charAt(0)}</span>
             </div>`;
        
        // Website Logic
        const websiteHtml = group.website
          ? `<a href="${group.website}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-xs font-medium truncate transition-colors bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
               <svg class="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
               ${group.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
             </a>`
          : '';

        const marker = L.marker([group.location.lat, group.location.lng], { icon: groupIcon })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div class="min-w-[260px] font-sans -m-1">
              <!-- Card Header -->
              <div class="relative h-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-t-lg shadow-inner">
                 <!-- Decorative pattern/overlay could go here -->
                 <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                 ${logoHtml}
              </div>
              
              <!-- Card Body -->
              <div class="pt-12 pb-5 px-5 text-center bg-white rounded-b-lg shadow-xl border-x border-b border-gray-100">
                <h3 class="font-extrabold text-xl text-gray-900 leading-tight mb-1">${group.name}</h3>
                <p class="text-[11px] text-indigo-500 font-bold uppercase tracking-widest mb-4">
                  ${group.size === 'SOLO' ? 'Solo Artist' : (group.size === 'SMALL' ? 'Kleine Gruppe' : 'Große Gruppe')}
                </p>
                
                <div class="flex flex-col gap-2 mb-4">
                  <p class="text-sm text-gray-600 flex items-center justify-center gap-1.5">
                    <span class="bg-gray-100 p-1 rounded-full text-gray-500">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </span>
                    <span class="truncate max-w-[180px]">${group.location.address || 'Keine Adresse'}</span>
                  </p>
                  
                  ${websiteHtml ? `
                  <div class="flex justify-center">
                    ${websiteHtml}
                  </div>` : ''}
                </div>
                
                <div class="flex flex-wrap justify-center gap-1.5 mb-5">
                  ${group.tags.slice(0, 3).map((t) => `<span class="text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-full">${t.name}</span>`).join('')}
                  ${group.tags.length > 3 ? `<span class="text-[10px] text-gray-400 px-1 self-center font-medium">+${group.tags.length - 3}</span>` : ''}
                </div>
                
                <a href="/groups/${group.id}" class="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold py-2.5 rounded-lg transition-all transform hover:scale-[1.02] shadow-md no-underline">
                  Profil ansehen
                </a>
              </div>
            </div>
          `, {
            className: 'custom-popup-style',
            closeButton: false
          });
          markersRef.current.push(marker);
        }
      });
    }

    // Add markers for events
    if (showEvents) {
      events?.forEach((event) => {
        if (event.lat && event.lng) {
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
        
        const marker = L.marker([event.lat, event.lng], { icon: eventIcon })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div class="min-w-[260px] font-sans -m-1">
              <div class="p-4 bg-white rounded-xl shadow-lg border border-gray-100">
                <div class="flex items-center justify-between gap-3 mb-3">
                  <span class="text-[11px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">EVENT</span>
                  <span class="text-[11px] text-gray-500 font-medium">${date} Uhr</span>
                </div>

                <div class="flex items-start gap-3">
                  ${flyerUrl ? `
                    <div class="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                      <img src="${flyerUrl}" alt="Flyer" class="w-full h-full object-cover" />
                    </div>
                  ` : ''}

                  <div class="min-w-0">
                    <h3 class="font-extrabold text-lg leading-snug text-gray-900 mb-1 truncate">${event.title}</h3>
                    ${organizerName ? `<p class="text-sm text-gray-700 mb-1 truncate"><span class=\"text-gray-500\">Veranstalter:</span> <span class=\"font-semibold\">${organizerName}</span></p>` : ''}
                    ${event.locationName ? `<p class="text-sm text-gray-600 mb-2 truncate">${event.locationName}</p>` : ''}
                  </div>
                </div>

                <div class="mt-3">
                  <a href="/events/${event.id}" class="inline-flex items-center px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 text-sm font-bold no-underline">
                    Zum Event
                  </a>
                </div>
              </div>
            </div>
          `);
          markersRef.current.push(marker);
        }
      });
    }
  }, [groups, events, selectedTag, showGroups, showEvents, mapReady]);

  return (
    <div className="relative h-[calc(100vh-64px)] w-full z-0">
      <div ref={mapContainerRef} className="h-full w-full" />
      
      {/* Filter Panel */}
      <div className="absolute top-4 left-4 z-[400] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-xs">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Filter</h3>
        
        {/* Tag/Style Filter */}
        {availableTags.length > 0 && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tanzstil</label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              Gruppen
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showEvents}
              onChange={(e) => setShowEvents(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              Events
            </span>
          </label>
        </div>
      </div>
      
      {/* Control Buttons - Bottom Right */}
      <div className="absolute bottom-6 right-4 z-[400] flex flex-col gap-2">
        {/* Zoom In */}
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="bg-white p-2 rounded-md shadow-md border border-gray-300 hover:bg-gray-50 text-gray-700 focus:outline-none"
          title="Vergrößern"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        
        {/* Zoom Out */}
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="bg-white p-2 rounded-md shadow-md border border-gray-300 hover:bg-gray-50 text-gray-700 focus:outline-none"
          title="Verkleinern"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        
        {/* Locate Me */}
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className="bg-white p-2 rounded-md shadow-md border border-gray-300 hover:bg-gray-50 text-gray-700 focus:outline-none disabled:opacity-50"
          title="Meinen Standort anzeigen"
        >
          {isLocating ? (
             <span className="animate-spin block text-sm">⌛</span>
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
