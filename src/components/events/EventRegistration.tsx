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
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-4">
        <p className="text-gray-500 dark:text-gray-400">Lade Anmeldungen...</p>
      </div>
    );
  }

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Workshop-Anmeldung</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {registrations.length} Teilnehmer angemeldet
          </p>
        </div>

        {session ? (
          isRegistered ? (
            <button
              onClick={handleUnregister}
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition disabled:opacity-50 text-sm font-medium"
            >
              {isSubmitting ? "..." : "Abmelden"}
            </button>
          ) : (
            <button
              onClick={handleRegister}
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-50 text-sm font-medium"
            >
              {isSubmitting ? "..." : "Anmelden"}
            </button>
          )
        ) : (
          <p className="text-sm text-gray-500">Bitte einloggen zum Anmelden</p>
        )}
      </div>

      {isCreator && registrations.length > 0 && (
        <div className="border-t border-indigo-100 dark:border-indigo-800 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Teilnehmerliste:</h4>
          <div className="flex flex-wrap gap-2">
            {registrations.map((reg) => (
              <div
                key={reg.id}
                className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-sm"
              >
                {reg.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={normalizeUploadedImageUrl(reg.user.image) ?? ""} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-300">
                    {reg.user.name?.charAt(0) || "?"}
                  </div>
                )}
                <span className="text-gray-700 dark:text-gray-300">{reg.user.name || "Unbekannt"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
