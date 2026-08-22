"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type Favorite = { id: string; remindWeek: boolean; remindDay: boolean };

export default function EventFavoriteButton({ eventId, isExpired }: { eventId: string; isExpired: boolean }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [favorite, setFavorite] = useState<Favorite | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/event-favorites?eventId=${encodeURIComponent(eventId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setFavorite(data?.favorite ?? null))
      .catch(() => undefined);
  }, [eventId, session?.user?.id]);

  if (isExpired) return null;

  const toggle = async () => {
    if (status !== "authenticated") {
      router.push(`/auth/signin?callbackUrl=/events/${eventId}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(favorite ? `/api/event-favorites?eventId=${encodeURIComponent(eventId)}` : "/api/event-favorites", {
        method: favorite ? "DELETE" : "POST",
        headers: favorite ? undefined : { "Content-Type": "application/json" },
        body: favorite ? undefined : JSON.stringify({ eventId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Aktion fehlgeschlagen");
      setFavorite(favorite ? null : data.favorite);
      showToast(favorite ? "Event aus Merkliste entfernt" : "Event gemerkt – Erinnerungen sind aktiviert", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Aktion fehlgeschlagen", "error");
    } finally {
      setBusy(false);
    }
  };

  const updateReminder = async (key: "remindWeek" | "remindDay", value: boolean) => {
    if (!favorite) return;
    const previous = favorite;
    setFavorite({ ...favorite, [key]: value });
    const res = await fetch("/api/event-favorites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, [key]: value }),
    });
    if (!res.ok) {
      setFavorite(previous);
      showToast("Erinnerung konnte nicht gespeichert werden", "error");
    }
  };

  return (
    <div className="space-y-2">
      <button type="button" onClick={toggle} disabled={busy} className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${favorite ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"}`}>
        <span aria-hidden="true">{favorite ? "★" : "☆"}</span>
        {busy ? "Bitte warten…" : favorite ? "Event gemerkt" : "Event merken"}
      </button>
      {favorite ? (
        <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={favorite.remindWeek} onChange={(e) => updateReminder("remindWeek", e.target.checked)} /> 7 Tage vorher</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={favorite.remindDay} onChange={(e) => updateReminder("remindDay", e.target.checked)} /> 1 Tag vorher</label>
        </div>
      ) : null}
    </div>
  );
}
