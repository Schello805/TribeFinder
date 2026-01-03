"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface EventParticipationButtonProps {
  eventId: string;
}

export default function EventParticipationButton({ eventId }: EventParticipationButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
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
        alert("Anfrage gesendet!");
      } else {
        const data = await res.json();
        alert(data.message || "Fehler bei der Anfrage");
      }
    } catch {
      alert("Ein Fehler ist aufgetreten");
    } finally {
      setIsLoading(false);
    }
  };

  if (!session || managedGroups.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 transition shadow-sm flex items-center gap-2"
      >
        <span>🎭</span> Als Act teilnehmen
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Teilnahme anfragen</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Deine Gruppe wählen</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Nachricht (Optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Wir würden gerne auftreten..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Abbrechen
              </button>
              <button
                onClick={handleParticipate}
                disabled={!selectedGroupId || isLoading}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
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
