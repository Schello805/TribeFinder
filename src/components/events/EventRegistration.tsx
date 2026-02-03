"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

interface EventRegistrationProps {
  eventId: string;
  isCreator: boolean;
}

interface Registration {
  id: string;
  status: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export default function EventRegistration({ eventId, isCreator }: EventRegistrationProps) {
  const { data: session } = useSession();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/registrations`);
        if (res.ok) {
          const data = await res.json();
          setRegistrations(data.registrations || []);
          if (session?.user?.id) {
            setIsRegistered(data.registrations?.some((r: Registration) => r.user.id === session.user.id) || false);
          }
        }
      } catch (error) {
        console.error("Failed to fetch registrations", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegistrations();
  }, [eventId, session?.user?.id]);

  const handleRegister = async () => {
    if (!session) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/events/${eventId}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setIsRegistered(true);
        const data = await res.json();
        setRegistrations((prev) => [...prev, data]);
      }
    } catch (error) {
      console.error("Registration failed", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnregister = async () => {
    if (!session) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/events/${eventId}/registrations`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIsRegistered(false);
        setRegistrations((prev) => prev.filter((r) => r.user.id !== session.user.id));
      }
    } catch (error) {
      console.error("Unregistration failed", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] rounded-lg p-4">
        <p className="text-[var(--muted)]">Lade Anmeldungen...</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="tf-display font-bold text-[var(--foreground)]">Workshop-Anmeldung</h3>
          <p className="text-sm text-[var(--muted)]">
            {registrations.length} Teilnehmer angemeldet
          </p>
        </div>

        {session ? (
          isRegistered ? (
            <button
              onClick={handleUnregister}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] text-red-700 rounded-md hover:bg-[var(--surface-hover)] transition disabled:opacity-50 text-sm font-medium"
            >
              {isSubmitting ? "..." : "Abmelden"}
            </button>
          ) : (
            <button
              onClick={handleRegister}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition disabled:opacity-50 text-sm font-medium"
            >
              {isSubmitting ? "..." : "Anmelden"}
            </button>
          )
        ) : (
          <p className="text-sm text-[var(--muted)]">Bitte einloggen zum Anmelden</p>
        )}
      </div>

      {isCreator && registrations.length > 0 && (
        <div className="border-t border-[var(--border)] pt-4">
          <h4 className="text-sm font-medium text-[var(--muted)] mb-2">Teilnehmerliste:</h4>
          <div className="flex flex-wrap gap-2">
            {registrations.map((reg) => (
              <div
                key={reg.id}
                className="flex items-center gap-2 bg-[var(--surface)] text-[var(--foreground)] px-3 py-1.5 rounded-full border border-[var(--border)] text-sm"
              >
                {reg.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={normalizeUploadedImageUrl(reg.user.image) ?? ""} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--muted)]">
                    {reg.user.name?.charAt(0) || "?"}
                  </div>
                )}
                <span className="text-[var(--foreground)]">{reg.user.name || "Unbekannt"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
