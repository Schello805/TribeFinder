"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

interface DeleteEventButtonProps {
  eventId: string;
  redirectTo?: string;
  iconOnly?: boolean;
}

export default function DeleteEventButton({ eventId, redirectTo, iconOnly = false }: DeleteEventButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Möchtest du dieses Event wirklich löschen?")) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (res.ok) {
        showToast('Event gelöscht', 'success');
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      } else {
        const data = await res.json();
        showToast(data.message || 'Fehler beim Löschen', 'error');
      }
    } catch {
      showToast('Fehler beim Löschen', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      aria-label="Event löschen"
      title="Löschen"
      className={
        iconOnly
          ? "inline-flex items-center justify-center rounded-md border border-red-500/40 bg-[var(--surface)] p-2 text-red-600 shadow-sm hover:bg-[var(--surface-hover)] hover:text-red-700 disabled:opacity-50"
          : "inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-base font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
      }
    >
      {iconOnly ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      ) : (
        (isDeleting ? "Lösche..." : "Löschen")
      )}
    </button>
  );
}
