"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BottomSheet from "@/components/ui/BottomSheet";

type NearbyStatsResponse = {
  radiusKm: number;
  groups: number;
  events: number;
  members: number;
};

type NearbyItemsResponse = {
  radiusKm: number;
  type: "groups" | "events";
  items: unknown[];
};

type Props = {
  radiusKm?: number;
  globalGroups: number;
  globalEvents: number;
  globalMembers: number;
};

type ActiveSheet =
  | { scope: "global" | "nearby"; type: "groups" | "events" | "members" }
  | null;

type EventItem = {
  id: string;
  title: string;
  startDate: string;
  locationName?: string | null;
  group?: { id: string; name: string } | null;
};

type GroupItem = {
  id: string;
  name: string;
  description?: string;
  location?: { address?: string | null } | null;
};

const TZ_EUROPE_BERLIN = "Europe/Berlin";

function formatBerlinDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ_EUROPE_BERLIN,
    hourCycle: "h23",
  }).format(d);
}

function startOfDayBerlin(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_EUROPE_BERLIN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {} as Record<string, string>);

  const iso = `${parts.year}-${parts.month}-${parts.day}T00:00:00`;
  const local = new Date(iso);
  return local;
}

function weekendRangeBerlin(anchor: Date, which: "this" | "next") {
  const d0 = startOfDayBerlin(anchor);
  const weekdayName = new Intl.DateTimeFormat("en-US", { timeZone: TZ_EUROPE_BERLIN, weekday: "short" }).format(d0);
  const weekday = weekdayName === "Mon" ? 1
    : weekdayName === "Tue" ? 2
      : weekdayName === "Wed" ? 3
        : weekdayName === "Thu" ? 4
          : weekdayName === "Fri" ? 5
            : weekdayName === "Sat" ? 6
              : 0;

  const daysUntilSaturday = (6 - weekday + 7) % 7;
  const saturday = new Date(d0);
  saturday.setDate(saturday.getDate() + daysUntilSaturday);

  const start = new Date(saturday);
  if (which === "next") start.setDate(start.getDate() + 7);

  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  return { start, end };
}

export default function HomeStats({ radiusKm = 25, globalGroups, globalEvents, globalMembers }: Props) {
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyDenied, setNearbyDenied] = useState(false);
  const [nearbyStats, setNearbyStats] = useState<NearbyStatsResponse | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [sheet, setSheet] = useState<ActiveSheet>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [items, setItems] = useState<Array<EventItem | GroupItem>>([]);
  const [eventPreset, setEventPreset] = useState<"all" | "today" | "thisWeekend" | "nextWeekend">("all");

  useEffect(() => {
    if (!navigator.geolocation) return;

    setNearbyLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        try {
          const res = await fetch(
            `/api/stats/nearby?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(
              String(lng)
            )}&radiusKm=${encodeURIComponent(String(radiusKm))}`,
            { cache: "no-store" }
          );
          const data = (await res.json().catch(() => null)) as NearbyStatsResponse | null;
          if (res.ok && data) setNearbyStats(data);
        } finally {
          setNearbyLoading(false);
        }
      },
      () => {
        setNearbyDenied(true);
        setNearbyLoading(false);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 5 * 60 * 1000 }
    );
  }, [radiusKm]);

  const openSheet = useCallback((next: ActiveSheet) => {
    setEventPreset("all");
    setItems([]);
    setSheet(next);
  }, []);

  const closeSheet = useCallback(() => {
    setSheet(null);
    setItems([]);
    setSheetLoading(false);
  }, []);

  const sheetTitle = useMemo(() => {
    if (!sheet) return "";
    const scopeLabel = sheet.scope === "nearby" ? `In deiner Nähe (${radiusKm}km)` : "Gesamt";
    if (sheet.type === "groups") return `${scopeLabel}: Gruppen`;
    if (sheet.type === "events") return `${scopeLabel}: Events`;
    return `${scopeLabel}: Mitglieder`;
  }, [radiusKm, sheet]);

  const loadSheetItems = useCallback(async () => {
    if (!sheet) return;

    setSheetLoading(true);
    try {
      if (sheet.type === "members") {
        setItems([]);
        return;
      }

      if (sheet.scope === "global") {
        if (sheet.type === "groups") {
          const params = new URLSearchParams();
          params.append("limit", "30");
          params.append("sort", "newest");
          const res = await fetch(`/api/groups?${params.toString()}`, { cache: "no-store" });
          const data = await res.json().catch(() => null);
          const arr = Array.isArray(data) ? data : data?.data;
          setItems(Array.isArray(arr) ? (arr as GroupItem[]) : []);
          return;
        }

        const params = new URLSearchParams();
        params.append("upcoming", "true");
        params.append("limit", "100");
        const res = await fetch(`/api/events?${params.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        const arr = Array.isArray(data) ? data : data?.data;
        setItems(Array.isArray(arr) ? (arr as EventItem[]) : []);
        return;
      }

      if (!coords) {
        setItems([]);
        return;
      }

      const params = new URLSearchParams();
      params.append("lat", String(coords.lat));
      params.append("lng", String(coords.lng));
      params.append("radiusKm", String(radiusKm));
      params.append("type", sheet.type);
      params.append("limit", "100");

      const res = await fetch(`/api/stats/nearby/items?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as NearbyItemsResponse | null;
      const arr = json && Array.isArray(json.items) ? json.items : [];
      setItems(arr as Array<EventItem | GroupItem>);
    } finally {
      setSheetLoading(false);
    }
  }, [coords, radiusKm, sheet]);

  useEffect(() => {
    void loadSheetItems();
  }, [loadSheetItems]);

  const filteredItems = useMemo(() => {
    if (!sheet || sheet.type !== "events") return items;

    const events = items as EventItem[];
    if (eventPreset === "all") return events;

    const now = new Date();
    if (eventPreset === "today") {
      const start = startOfDayBerlin(now);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return events.filter((ev) => {
        const d = new Date(ev.startDate);
        return d >= start && d < end;
      });
    }

    if (eventPreset === "thisWeekend") {
      const { start, end } = weekendRangeBerlin(now, "this");
      return events.filter((ev) => {
        const d = new Date(ev.startDate);
        return d >= start && d < end;
      });
    }

    const { start, end } = weekendRangeBerlin(now, "next");
    return events.filter((ev) => {
      const d = new Date(ev.startDate);
      return d >= start && d < end;
    });
  }, [eventPreset, items, sheet]);

  const nearbyLabel = nearbyStats ? `In deiner Nähe (${radiusKm}km)` : "In deiner Nähe";

  return (
    <div>
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => openSheet({ scope: "global", type: "groups" })}
          className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center hover:bg-[var(--surface-hover)] transition"
        >
          <div className="text-sm text-[var(--muted)]">Schon dabei</div>
          <div className="mt-1 text-3xl font-extrabold text-[var(--primary)]">{globalGroups}</div>
          <div className="mt-1 text-sm text-[var(--muted)]">Tanzgruppen</div>
        </button>

        <button
          type="button"
          onClick={() => openSheet({ scope: "global", type: "events" })}
          className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center hover:bg-[var(--surface-hover)] transition"
        >
          <div className="text-sm text-[var(--muted)]">Aktuell geplant</div>
          <div className="mt-1 text-3xl font-extrabold text-[var(--primary)]">{globalEvents}</div>
          <div className="mt-1 text-sm text-[var(--muted)]">Events</div>
        </button>

        <button
          type="button"
          onClick={() => openSheet({ scope: "global", type: "members" })}
          className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center hover:bg-[var(--surface-hover)] transition"
        >
          <div className="text-sm text-[var(--muted)]">Mitglieder</div>
          <div className="mt-1 text-3xl font-extrabold text-[var(--primary)]">{globalMembers}</div>
          <div className="mt-1 text-sm text-[var(--muted)]">in der Community</div>
        </button>
      </div>

      <div className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
        <div className="text-center">
          <div className="tf-display text-xl font-bold text-[var(--foreground)]">{nearbyLabel}</div>
          <div className="mt-2 text-sm text-[var(--muted)]">
            {nearbyDenied
              ? "Standort-Zugriff deaktiviert."
              : "Aktiviere Standortzugriff, um Listen im Umkreis von 25km zu sehen."}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            disabled={!coords || nearbyDenied}
            onClick={() => openSheet({ scope: "nearby", type: "groups" })}
            className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center hover:bg-[var(--surface-hover)] transition disabled:opacity-50 disabled:hover:bg-[var(--surface)]"
          >
            <div className="text-sm text-[var(--muted)]">{nearbyLabel}</div>
            <div className="mt-1 text-3xl font-extrabold text-[var(--primary)]">
              {nearbyLoading ? "…" : nearbyStats?.groups ?? "–"}
            </div>
            <div className="mt-1 text-sm text-[var(--muted)]">Tanzgruppen</div>
          </button>

          <button
            type="button"
            disabled={!coords || nearbyDenied}
            onClick={() => openSheet({ scope: "nearby", type: "events" })}
            className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center hover:bg-[var(--surface-hover)] transition disabled:opacity-50 disabled:hover:bg-[var(--surface)]"
          >
            <div className="text-sm text-[var(--muted)]">{nearbyLabel}</div>
            <div className="mt-1 text-3xl font-extrabold text-[var(--primary)]">
              {nearbyLoading ? "…" : nearbyStats?.events ?? "–"}
            </div>
            <div className="mt-1 text-sm text-[var(--muted)]">Events</div>
          </button>

          <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center">
            <div className="text-sm text-[var(--muted)]">{nearbyLabel}</div>
            <div className="mt-1 text-3xl font-extrabold text-[var(--primary)]">
              {nearbyLoading ? "…" : nearbyStats?.members ?? "–"}
            </div>
            <div className="mt-1 text-sm text-[var(--muted)]">Mitglieder</div>
          </div>
        </div>
      </div>

      <BottomSheet open={Boolean(sheet)} title={sheetTitle} onClose={closeSheet}>
        {sheet?.type === "members" ? (
          <div className="space-y-3 text-sm text-[var(--muted)]">
            <div>
              Diese Kennzahl zählt Gruppen-Mitgliedschaften im Umkreis. Eine direkte Mitglieder-Liste zeigen wir hier nicht.
            </div>
            <div>
              <Link href="/taenzerinnen" className="text-[var(--link)] font-semibold hover:opacity-90 transition">
                Tänzerinnen ansehen
              </Link>
            </div>
          </div>
        ) : sheetLoading ? (
          <div className="text-sm text-[var(--muted)]">Lade…</div>
        ) : (
          <div className="space-y-4">
            {sheet?.type === "events" ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEventPreset("all")}
                  className={`px-3 py-1.5 rounded-full text-sm border border-[var(--border)] transition ${
                    eventPreset === "all" ? "bg-[var(--surface)]" : "bg-[var(--surface-2)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  Alle
                </button>
                <button
                  type="button"
                  onClick={() => setEventPreset("today")}
                  className={`px-3 py-1.5 rounded-full text-sm border border-[var(--border)] transition ${
                    eventPreset === "today" ? "bg-[var(--surface)]" : "bg-[var(--surface-2)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  Heute
                </button>
                <button
                  type="button"
                  onClick={() => setEventPreset("thisWeekend")}
                  className={`px-3 py-1.5 rounded-full text-sm border border-[var(--border)] transition ${
                    eventPreset === "thisWeekend" ? "bg-[var(--surface)]" : "bg-[var(--surface-2)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  Dieses Wochenende
                </button>
                <button
                  type="button"
                  onClick={() => setEventPreset("nextWeekend")}
                  className={`px-3 py-1.5 rounded-full text-sm border border-[var(--border)] transition ${
                    eventPreset === "nextWeekend" ? "bg-[var(--surface)]" : "bg-[var(--surface-2)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  Nächstes Wochenende
                </button>
              </div>
            ) : null}

            {filteredItems.length === 0 ? (
              <div className="text-sm text-[var(--muted)]">Keine Treffer.</div>
            ) : sheet?.type === "groups" ? (
              <div className="space-y-3">
                {(filteredItems as GroupItem[]).map((g) => (
                  <Link
                    key={g.id}
                    href={`/groups/${g.id}`}
                    className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:bg-[var(--surface-hover)] transition"
                  >
                    <div className="tf-display text-base font-bold text-[var(--foreground)] line-clamp-2">{g.name}</div>
                    {g.location?.address ? (
                      <div className="mt-1 text-sm text-[var(--muted)] line-clamp-1">📍 {g.location.address}</div>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(filteredItems as EventItem[]).map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:bg-[var(--surface-hover)] transition"
                  >
                    <div className="text-xs text-[var(--muted)]">
                      {formatBerlinDateTime(ev.startDate)}
                      {ev.locationName ? ` • ${ev.locationName}` : ""}
                    </div>
                    <div className="mt-1 tf-display text-base font-bold text-[var(--foreground)] line-clamp-2">{ev.title}</div>
                    {ev.group?.id && ev.group?.name ? (
                      <div className="mt-1 text-sm text-[var(--muted)] line-clamp-1">👥 {ev.group.name}</div>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}

            <div className="pt-2">
              <Link
                href={sheet?.type === "groups" ? "/groups" : "/events"}
                className="text-sm font-semibold text-[var(--link)] hover:opacity-90 transition"
              >
                Alle ansehen
              </Link>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
