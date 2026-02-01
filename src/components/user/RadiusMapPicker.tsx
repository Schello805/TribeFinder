"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { useToast } from "@/components/ui/Toast";
import "leaflet/dist/leaflet.css";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/images/markers/marker-icon-2x-blue.png",
  iconUrl: "/images/markers/marker-icon-2x-blue.png",
  shadowUrl: "/images/markers/marker-shadow.png",
});

type Props = {
  lat: number | null;
  lng: number | null;
  radiusKm: number;
  onChange: (next: { lat: number; lng: number }) => void;
};

export default function RadiusMapPicker({ lat, lng, radiusKm, onChange }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const { showToast } = useToast();
  const [isLocating, setIsLocating] = useState(false);

  const center = useMemo<[number, number]>(() => {
    if (lat != null && lng != null) return [lat, lng];
    return [51.1657, 10.4515];
  }, [lat, lng]);

  const hasCenter = lat != null && lng != null;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      scrollWheelZoom: true,
    }).setView(center, hasCenter ? 10 : 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    map.on("click", (e) => {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, hasCenter, onChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setView(center, hasCenter ? Math.max(map.getZoom(), 10) : map.getZoom());

    if (!hasCenter) {
      markerRef.current?.remove();
      markerRef.current = null;
      circleRef.current?.remove();
      circleRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = L.marker(center).addTo(map);
    } else {
      markerRef.current.setLatLng(center);
    }

    const radiusMeters = Math.max(1, radiusKm) * 1000;
    if (!circleRef.current) {
      circleRef.current = L.circle(center, {
        radius: radiusMeters,
        color: "#4f46e5",
        fillColor: "#6366f1",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);
    } else {
      circleRef.current.setLatLng(center);
      circleRef.current.setRadius(radiusMeters);
    }
  }, [center, hasCenter, radiusKm]);

  const locateMe = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation wird nicht unterstützt', 'warning');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setIsLocating(false);
        showToast('Standort konnte nicht ermittelt werden', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {hasCenter ? (
            <span className="font-mono text-xs">{lat?.toFixed(6)}, {lng?.toFixed(6)}</span>
          ) : (
            <span className="text-xs">Kein Mittelpunkt gesetzt – klicke in die Karte.</span>
          )}
        </div>
        <button
          type="button"
          onClick={locateMe}
          disabled={isLocating}
          className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          {isLocating ? "Suche Standort..." : "Meinen Standort verwenden"}
        </button>
      </div>

      <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div ref={mapContainerRef} className="h-72 w-full" />
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        Tipp: Mittelpunkt per Klick setzen. Der Kreis zeigt deinen Benachrichtigungs-Umkreis.
      </div>
    </div>
  );
}
