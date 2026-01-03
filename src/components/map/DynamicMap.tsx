"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center bg-gray-100"><p className="text-xl text-gray-500">Karte wird geladen...</p></div>
});

export default Map;
