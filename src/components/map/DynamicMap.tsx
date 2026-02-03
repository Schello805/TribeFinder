"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)]"><p className="text-xl text-[var(--muted)]">Karte wird geladen...</p></div>
});

export default Map;
