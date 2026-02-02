"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet icon issue
// @ts-expect-error Leaflet internal type mismatch for private property
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

export default function LocationPicker({
  initialLat = 51.1657, // Center of Germany
  initialLng = 10.4515,
  onLocationSelect,
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);

  const markerIconRef = useRef(
    L.divIcon({
      className: "",
      html: '<div class="tf-location-marker"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })
  );

  const markerOptionsRef = useRef<L.MarkerOptions>({
    zIndexOffset: 0,
  });

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView([initialLat, initialLng], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    mapRef.current.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else if (mapRef.current) {
        markerRef.current = L.marker([lat, lng], { ...markerOptionsRef.current, icon: markerIconRef.current }).addTo(mapRef.current);
      }

      onLocationSelectRef.current(lat, lng);
    });

    if (Number.isFinite(initialLat) && Number.isFinite(initialLng)) {
      markerRef.current = L.marker([initialLat, initialLng], { ...markerOptionsRef.current, icon: markerIconRef.current }).addTo(mapRef.current);
      mapRef.current.setView([initialLat, initialLng], 13);
    }
    
    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initialLat, initialLng]);

  // React to coordinate changes
  useEffect(() => {
    if (!mapRef.current) return;

    if (!Number.isFinite(initialLat) || !Number.isFinite(initialLng)) return;

    if (markerRef.current) {
        markerRef.current.setLatLng([initialLat, initialLng]);
    } else {
        markerRef.current = L.marker([initialLat, initialLng], { ...markerOptionsRef.current, icon: markerIconRef.current }).addTo(mapRef.current);
    }
    
    mapRef.current.setView([initialLat, initialLng], 13);
  }, [initialLat, initialLng]);

  return <div ref={mapContainerRef} className="h-64 w-full rounded-md border border-[var(--border)]" />;
}
