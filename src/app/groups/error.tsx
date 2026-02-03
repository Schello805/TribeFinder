"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GroupsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Groups error:", error);
  }, [error]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center bg-[var(--bg)] text-[var(--foreground)]">
      <div className="text-center max-w-md mx-auto p-8 bg-[var(--surface)] text-[var(--foreground)] rounded-xl shadow-sm border border-[var(--border)]">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--surface-2)] border border-[var(--border)] mb-4">
          <span className="text-2xl">👥</span>
        </div>
        <h2 className="tf-display text-xl font-bold text-[var(--foreground)] mb-3">
          Gruppen konnten nicht geladen werden
        </h2>
        <p className="text-[var(--muted)] mb-6 text-sm">
          Beim Laden der Tanzgruppen ist ein Fehler aufgetreten.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition text-sm font-medium"
          >
            Erneut laden
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-[var(--surface-2)] text-[var(--foreground)] rounded-lg hover:bg-[var(--surface-hover)] transition text-sm font-medium border border-[var(--border)]"
          >
            Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
