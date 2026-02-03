"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center bg-[var(--bg)] text-[var(--foreground)]">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--surface-2)] border border-[var(--border)] mb-6">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="tf-display text-2xl font-bold text-[var(--foreground)] mb-4">
          Etwas ist schiefgelaufen
        </h2>
        <p className="text-[var(--muted)] mb-6">
          Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
        </p>
        {error.digest && (
          <p className="text-xs text-[var(--muted)] mb-4 font-mono">
            Fehler-ID: {error.digest}
          </p>
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition font-medium"
          >
            Erneut versuchen
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--surface-hover)] transition font-medium"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
