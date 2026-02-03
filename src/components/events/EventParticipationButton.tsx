"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

interface EventParticipationButtonProps {
  eventId: string;
}

export default function EventParticipationButton({ eventId }: EventParticipationButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [managedGroups, setManagedGroups] = useState<{ id: string; name: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");

  // Fetch groups where user is admin
  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/groups/managed")
        .then((res) => {
            if (res.ok) return res.json();
            return [];
        })
        .then((data) => setManagedGroups(data))
        .catch((e) => console.error(e));
    }
  }, [session]);

  const handleParticipate = async () => {
    if (!selectedGroupId) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/participations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: selectedGroupId,
          message: message,
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        setMessage("");
        router.refresh();
        showToast('Anfrage gesendet!', 'success');
      } else {
        const data = await res.json();
        showToast(data.message || 'Fehler bei der Anfrage', 'error');
      }
    } catch {
      showToast('Ein Fehler ist aufgetreten', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!session || managedGroups.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-md font-medium hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition shadow-sm flex items-center gap-2"
      >
        <span>🎭</span> Als Act teilnehmen
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-[color-mix(in_srgb,var(--foreground)_50%,transparent)] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-lg shadow-xl max-w-md w-full p-6 border border-[var(--border)]">
            <h3 className="tf-display text-lg font-bold mb-4">Teilnahme anfragen</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Deine Gruppe wählen</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full border border-[var(--border)] bg-[var(--surface)] rounded-md shadow-sm focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              >
                <option value="">Bitte wählen...</option>
                {managedGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Nachricht (Optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-[var(--border)] bg-[var(--surface)] rounded-md shadow-sm focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                placeholder="Wir würden gerne auftreten..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Abbrechen
              </button>
              <button
                onClick={handleParticipate}
                disabled={!selectedGroupId || isLoading}
                className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-md hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50"
              >
                {isLoading ? "Sende..." : "Anfragen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
