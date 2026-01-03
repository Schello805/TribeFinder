"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteEventButtonProps {
  eventId: string;
}

export default function DeleteEventButton({ eventId }: DeleteEventButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Möchtest du dieses Event wirklich löschen?")) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.message || "Fehler beim Löschen");
      }
    } catch {
      alert("Fehler beim Löschen");
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
