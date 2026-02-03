"use client";

import Link from "next/link";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

interface Participation {
  id: string;
  status: string;
  group: {
    id: string;
    name: string;
    image?: string | null;
    size?: string | null;
  };
}

interface EventParticipantsListProps {
  participations: Participation[];
}

export default function EventParticipantsList({ participations }: EventParticipantsListProps) {
  // Only show APPROVED participations in the public list
  const approved = participations.filter((p) => p.status === "APPROVED");

  if (approved.length === 0) return null;

  return (
    <div className="mt-8 pt-8 border-t border-[var(--border)]">
      <h3 className="tf-display text-xl font-bold text-[var(--foreground)] mb-4">Bestätigte Acts & Gruppen</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {approved.map((p) => (
          <Link 
            key={p.id} 
            href={`/groups/${p.group.id}`}
            className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-md transition bg-[var(--surface)] text-[var(--foreground)] group"
          >
            {p.group.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={normalizeUploadedImageUrl(p.group.image) ?? ""}
                alt={p.group.name}
                className="w-12 h-12 rounded-full object-cover border border-[var(--border)]"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] font-bold border border-[var(--border)]">
                {p.group.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-bold text-[var(--foreground)] group-hover:text-[var(--link)] transition">{p.group.name}</div>
              <div className="text-xs text-[var(--muted)]">
                 {p.group.size === 'SOLO' ? 'Solo' : (p.group.size === 'SMALL' ? 'Kleine Gruppe' : 'Große Gruppe')}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
