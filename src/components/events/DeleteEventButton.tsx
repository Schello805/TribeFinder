"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

interface DeleteEventButtonProps {
  eventId: string;
  redirectTo?: string;
}

export default function DeleteEventButton({ eventId, redirectTo }: DeleteEventButtonProps) {
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
      className="text-red-600 hover:text-red-900 text-sm font-medium disabled:opacity-50"
    >
      {isDeleting ? "Lösche..." : "Löschen"}
    </button>
  );
}
