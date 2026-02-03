"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

interface Participation {
  id: string;
  status: string;
  message?: string | null;
  group: {
    id: string;
    name: string;
    image?: string | null;
  };
}

interface EventParticipationManagerProps {
  participations: Participation[];
  eventId: string;
}

export default function EventParticipationManager({ participations }: EventParticipationManagerProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const pending = participations.filter(p => p.status === "PENDING");
  const approved = participations.filter(p => p.status === "APPROVED");

  const handleUpdateStatus = async (participationId: string, newStatus: "APPROVED" | "REJECTED") => {
    setIsLoading(participationId);
    try {
      const res = await fetch(`/api/participations/${participationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        showToast('Status aktualisiert', 'success');
        router.refresh();
      } else {
        showToast('Fehler beim Aktualisieren', 'error');
      }
    } catch {
      showToast('Ein Fehler ist aufgetreten', 'error');
    } finally {
      setIsLoading(null);
    }
  };

  if (participations.length === 0) return null;

  return (
    <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-xl border border-[var(--border)] overflow-hidden mt-8">
      <div className="bg-[var(--surface-2)] px-6 py-4 border-b border-[var(--border)]">
        <h3 className="tf-display font-bold text-[var(--foreground)]">Anfragen & Teilnehmer verwalten</h3>
      </div>
      
      <div className="p-6 space-y-8">
        {/* Pending Requests */}
        {pending.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-3">Ausstehende Anfragen ({pending.length})</h4>
            <div className="space-y-3">
              {pending.map(p => (
                <div key={p.id} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] gap-4">
                  <div className="flex items-center gap-3">
                    {p.group.image ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={normalizeUploadedImageUrl(p.group.image) ?? ""} alt={p.group.name} className="w-10 h-10 rounded-full object-cover" />
                        </>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-[var(--surface)] flex items-center justify-center font-bold text-orange-600 border border-[var(--border)]">
                            {p.group.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <div className="font-bold text-[var(--foreground)]">{p.group.name}</div>
                        {p.message && <div className="text-sm text-[var(--muted)] italic">&quot;{p.message}&quot;</div>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                        onClick={() => handleUpdateStatus(p.id, "APPROVED")}
                        disabled={isLoading === p.id}
                        className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                        Annehmen
                    </button>
                    <button 
                        onClick={() => handleUpdateStatus(p.id, "REJECTED")}
                        disabled={isLoading === p.id}
                        className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                        Ablehnen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved */}
        {approved.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-green-600 uppercase tracking-wider mb-3">Bestätigte Teilnehmer ({approved.length})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {approved.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="font-medium text-[var(--foreground)]">{p.group.name}</div>
                        </div>
                        <button 
                            onClick={() => handleUpdateStatus(p.id, "REJECTED")}
                            disabled={isLoading === p.id}
                            className="text-xs text-red-500 hover:text-red-700 underline"
                        >
                            Entfernen
                        </button>
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
