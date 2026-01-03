"use client";

import dynamic from "next/dynamic";

const EventMap = dynamic(() => import("@/components/map/EventMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-gray-100 animate-pulse rounded-md flex items-center justify-center text-gray-500">Karte wird geladen...</div>
});

interface DynamicEventMapProps {
  lat: number;
  lng: number;
}

export default function DynamicEventMap({ lat, lng }: DynamicEventMapProps) {
  return <EventMap lat={lat} lng={lng} />;
}
