"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";

interface FavoriteButtonProps {
  groupId: string;
  initialIsFavorite?: boolean;
  onToggle?: (isFavorite: boolean) => void;
}

export default function FavoriteButton({ groupId, initialIsFavorite = false, onToggle }: FavoriteButtonProps) {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (!session) {
      showToast("Bitte melde dich an, um Favoriten zu speichern", "warning");
      return;
    }

    setIsLoading(true);

    try {
      const method = isFavorite ? "DELETE" : "POST";
      const response = await fetch("/api/favorites", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });

      if (!response.ok) {
        throw new Error("Fehler beim Speichern");
      }

      const newState = !isFavorite;
      setIsFavorite(newState);
      onToggle?.(newState);
      showToast(
        newState ? "Zu Favoriten hinzugefügt" : "Aus Favoriten entfernt",
        "success"
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showToast("Fehler beim Speichern", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 ${
        isFavorite
          ? "bg-[var(--surface-2)] text-red-700 hover:bg-[var(--surface-hover)] border border-[var(--border)]"
          : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)]"
      }`}
      title={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
    >
      <svg
        className="w-5 h-5"
        fill={isFavorite ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {isFavorite ? "Favorit" : "Favorisieren"}
    </button>
  );
}
