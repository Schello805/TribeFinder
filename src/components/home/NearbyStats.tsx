"use client";

import { useEffect, useMemo, useState } from "react";

type NearbyStatsResponse = {
  radiusKm: number;
  groups: number;
  events: number;
  members: number;
};

type Props = {
  radiusKm?: number;
  fallbackGroups: number;
  fallbackEvents: number;
  fallbackMembers: number;
};

export default function NearbyStats({
  radiusKm = 25,
  fallbackGroups,
  fallbackEvents,
  fallbackMembers,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [stats, setStats] = useState<NearbyStatsResponse | null>(null);

  const display = useMemo(() => {
    if (stats) return stats;
    return {
      radiusKm,
      groups: fallbackGroups,
      events: fallbackEvents,
      members: fallbackMembers,
    };
  }, [fallbackEvents, fallbackGroups, fallbackMembers, radiusKm, stats]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const res = await fetch(
            `/api/stats/nearby?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(
              String(lng)
            )}&radiusKm=${encodeURIComponent(String(radiusKm))}`,
            { cache: "no-store" }
          );
          const data = (await res.json().catch(() => null)) as NearbyStatsResponse | null;
          if (res.ok && data && typeof data.groups === "number") {
            setStats(data);
          }
        } finally {
          setLoading(false);
        }
      },
      () => {
        setDenied(true);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 5 * 60 * 1000 }
    );
  }, [radiusKm]);

  return (
    <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center">
        <div className="text-sm text-[var(--muted)]">
          {stats ? `In ${display.radiusKm}km um dich` : "Schon dabei"}
        </div>
        <div className="mt-1 text-3xl font-extrabold text-[var(--primary)]">
          {loading ? "…" : display.groups}
        </div>
        <div className="mt-1 text-sm text-[var(--muted)]">Tanzgruppen</div>
      </div>

      <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center">
        <div className="text-sm text-[var(--muted)]">
          {stats ? `In ${display.radiusKm}km um dich` : "Aktuell geplant"}
        </div>
        <div className="mt-1 text-3xl font-extrabold text-[var(--primary)]">
          {loading ? "…" : display.events}
        </div>
        <div className="mt-1 text-sm text-[var(--muted)]">Events</div>
      </div>

      <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center">
        <div className="text-sm text-[var(--muted)]">
          {stats ? `In ${display.radiusKm}km um dich` : "Mitglieder"}
        </div>
        <div className="mt-1 text-3xl font-extrabold text-[var(--primary)]">
          {loading ? "…" : display.members}
        </div>
        <div className="mt-1 text-sm text-[var(--muted)]">Mitglieder</div>
      </div>

      {denied ? (
        <div className="md:col-span-3 text-xs text-[var(--muted)] text-center">
          Standort-Zugriff deaktiviert – zeige Gesamtzahlen.
        </div>
      ) : null}
    </div>
  );
}
