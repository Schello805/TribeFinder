"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";
import { useToast } from "@/components/ui/Toast";

interface EventRegistrationProps {
  eventId: string;
  isCreator: boolean;
}

type Registration = {
  id: string;
  status: "CONFIRMED" | "WAITLIST" | "CANCELLED";
  user: { id: string; name: string | null; image: string | null; email?: string | null };
};

type RegistrationData = {
  confirmedCount: number;
  waitlistCount: number;
  maxParticipants: number | null;
  currentRegistration: { id: string; status: "CONFIRMED" | "WAITLIST" } | null;
  registrations: Registration[];
};

export default function EventRegistration({ eventId, isCreator }: EventRegistrationProps) {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [data, setData] = useState<RegistrationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/registrations`, { cache: "no-store" });
    if (!res.ok) throw new Error("Anmeldungen konnten nicht geladen werden");
    setData(await res.json());
  }, [eventId]);

  useEffect(() => {
    load()
      .catch(() => showToast("Anmeldungen konnten nicht geladen werden", "error"))
      .finally(() => setIsLoading(false));
  }, [load, showToast]);

  const submit = async (method: "POST" | "DELETE") => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/registrations`, { method });
      const response = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(response.message || "Aktion fehlgeschlagen");
      await load();
      if (method === "DELETE") showToast("Du bist nicht mehr angemeldet", "success");
      else if (response.status === "WAITLIST") showToast("Du stehst jetzt auf der Warteliste", "success");
      else showToast("Deine Anmeldung ist bestätigt", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Aktion fehlgeschlagen", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-[var(--muted)]">Lade Anmeldungen…</div>;
  }

  const current = data?.currentRegistration;
  const isFull = data?.maxParticipants !== null && (data?.confirmedCount ?? 0) >= (data?.maxParticipants ?? 0);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="tf-display font-bold text-[var(--foreground)]">Anmeldung</h3>
          <p className="text-sm text-[var(--muted)]">
            {data?.confirmedCount ?? 0}{data?.maxParticipants ? ` von ${data.maxParticipants}` : ""} Plätze belegt
            {(data?.waitlistCount ?? 0) > 0 ? ` · ${data?.waitlistCount} auf der Warteliste` : ""}
          </p>
          {current?.status === "WAITLIST" ? <p className="mt-1 text-sm font-medium text-amber-700">Du stehst auf der Warteliste.</p> : null}
          {current?.status === "CONFIRMED" ? <p className="mt-1 text-sm font-medium text-green-700">Deine Teilnahme ist bestätigt.</p> : null}
        </div>

        {session ? (
          current ? (
            <button type="button" onClick={() => submit("DELETE")} disabled={isSubmitting} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-red-700 hover:bg-[var(--surface-hover)] disabled:opacity-50">
              {isSubmitting ? "Bitte warten…" : "Abmelden"}
            </button>
          ) : (
            <button type="button" onClick={() => submit("POST")} disabled={isSubmitting} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {isSubmitting ? "Bitte warten…" : isFull ? "Auf Warteliste setzen" : "Jetzt anmelden"}
            </button>
          )
        ) : (
          <Link href={`/auth/signin?callbackUrl=/events/${eventId}`} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]">
            Zum Anmelden einloggen
          </Link>
        )}
      </div>

      {isCreator && (data?.registrations.length ?? 0) > 0 ? (
        <div className="border-t border-[var(--border)] pt-4">
          <h4 className="mb-2 text-sm font-medium text-[var(--foreground)]">Teilnehmerliste</h4>
          <div className="space-y-2">
            {data?.registrations.map((registration) => (
              <div key={registration.id} className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  {registration.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={normalizeUploadedImageUrl(registration.user.image) ?? ""} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] font-bold">{registration.user.name?.charAt(0) || "?"}</div>
                  )}
                  <span className="truncate">{registration.user.name || "Unbekannt"}</span>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${registration.status === "CONFIRMED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                  {registration.status === "CONFIRMED" ? "Bestätigt" : "Warteliste"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
