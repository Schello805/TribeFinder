"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RadiusMapPicker from "@/components/user/RadiusMapPicker";
import { useToast } from "@/components/ui/Toast";

type Style = { id: string; name: string };

export default function OnboardingPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [styles, setStyles] = useState<Style[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radius, setRadius] = useState(50);
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [notifyGroups, setNotifyGroups] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/user/dance-styles")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStyles(Array.isArray(data?.available) ? data.available : []))
      .catch(() => undefined);
  }, []);

  const filteredStyles = useMemo(() => styles.filter((style) => style.name.toLowerCase().includes(query.toLowerCase())).slice(0, 40), [query, styles]);

  const finish = async () => {
    setBusy(true);
    try {
      const notificationResponse = await fetch("/api/user/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyNewEvents: notifyEvents && lat !== null && lng !== null,
          notifyNewGroups: notifyGroups && lat !== null && lng !== null,
          notifyRadius: radius,
          notifyLat: lat,
          notifyLng: lng,
        }),
      });
      if (!notificationResponse.ok) throw new Error("Standort und Benachrichtigungen konnten nicht gespeichert werden");

      const styleResponses = await Promise.all(Array.from(selected).map((styleId) => fetch("/api/user/dance-styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styleId, level: "BEGINNER" }),
      })));
      if (styleResponses.some((response) => !response.ok)) throw new Error("Einige Tanzstile konnten nicht gespeichert werden");

      const completeResponse = await fetch("/api/user/onboarding", { method: "POST" });
      if (!completeResponse.ok) throw new Error("Einrichtung konnte nicht abgeschlossen werden");
      showToast("Willkommen bei TribeFinder!", "success");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Speichern fehlgeschlagen", "error");
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    setBusy(true);
    await fetch("/api/user/onboarding", { method: "POST" });
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h2 className="tf-display text-3xl font-bold">Willkommen bei TribeFinder</h2><p className="mt-2 text-[var(--muted)]">Mit diesen drei Angaben zeigen wir dir schneller passende Gruppen und Events. Alles kann später geändert werden.</p></div>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <div><span className="text-xs font-bold text-[var(--primary)]">SCHRITT 1</span><h3 className="tf-display text-xl font-bold">Deine Tanzstile</h3></div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tanzstil suchen" className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2" />
        <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto">
          {filteredStyles.map((style) => <button key={style.id} type="button" onClick={() => setSelected((current) => { const next = new Set(current); if (next.has(style.id)) next.delete(style.id); else next.add(style.id); return next; })} className={`rounded-full border px-3 py-1.5 text-sm ${selected.has(style.id) ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]" : "border-[var(--border)] bg-[var(--surface-2)]"}`}>{style.name}</button>)}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <div><span className="text-xs font-bold text-[var(--primary)]">SCHRITT 2</span><h3 className="tf-display text-xl font-bold">Deine Region</h3><p className="text-sm text-[var(--muted)]">Der Standort dient nur der Umkreissuche und wird nicht öffentlich angezeigt.</p></div>
        <label className="block text-sm">Umkreis: <strong>{radius} km</strong><input type="range" min={10} max={250} step={10} value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="mt-2 block w-full" /></label>
        <RadiusMapPicker lat={lat} lng={lng} radiusKm={radius} onChange={(position) => { setLat(position.lat); setLng(position.lng); }} />
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <div><span className="text-xs font-bold text-[var(--primary)]">SCHRITT 3</span><h3 className="tf-display text-xl font-bold">Auf dem Laufenden bleiben</h3></div>
        <label className="flex items-center gap-3"><input type="checkbox" checked={notifyEvents} onChange={(event) => setNotifyEvents(event.target.checked)} /> Neue Events in meinem Umkreis</label>
        <label className="flex items-center gap-3"><input type="checkbox" checked={notifyGroups} onChange={(event) => setNotifyGroups(event.target.checked)} /> Neue Gruppen in meinem Umkreis</label>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={skip} disabled={busy} className="rounded-md border border-[var(--border)] px-4 py-2 text-[var(--muted)]">Später einrichten</button>
        <button type="button" onClick={finish} disabled={busy} className="rounded-md bg-[var(--primary)] px-5 py-2 font-medium text-[var(--primary-foreground)] disabled:opacity-50">{busy ? "Speichere…" : "Einrichtung abschließen"}</button>
      </div>
    </div>
  );
}
