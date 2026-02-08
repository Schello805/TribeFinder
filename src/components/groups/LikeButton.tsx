"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";

export default function LikeButton(props: {
  groupId: string;
  initialCount: number;
  initialLikedByMe: boolean;
  className?: string;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [count, setCount] = useState(props.initialCount);
  const [likedByMe, setLikedByMe] = useState(props.initialLikedByMe);
  const [isLoading, setIsLoading] = useState(false);

  const toggle = async () => {
    if (status !== "authenticated" || !session?.user?.id) {
      showToast("Bitte melde dich an, um zu liken.", "info");
      router.push("/auth/signin");
      return;
    }

    setIsLoading(true);
    try {
      const method = likedByMe ? "DELETE" : "POST";
      const res = await fetch(`/api/groups/${props.groupId}/like`, { method });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        showToast("Fehler beim Aktualisieren.", "error");
        return;
      }

      setCount(typeof data.count === "number" ? data.count : count);
      setLikedByMe(Boolean(data.likedByMe));
      router.refresh();
    } catch {
      showToast("Fehler beim Aktualisieren.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoading) toggle();
      }}
      disabled={isLoading}
      className={
        props.className ||
        "inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition disabled:opacity-50"
      }
      aria-pressed={likedByMe}
      title={likedByMe ? "Like entfernen" : "Gefällt mir"}
    >
      <svg
        className={likedByMe ? "h-4 w-4" : "h-4 w-4"}
        viewBox="0 0 24 24"
        fill={likedByMe ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span>{count}</span>
    </button>
  );
}
