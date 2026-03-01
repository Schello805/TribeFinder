"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  bullets: string[];
  onClose: () => void;
};

export default function WhatsNewPreviewModal({ open, title, bullets, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Schließen"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-2xl">
          <div className="px-5 pt-5 pb-3 border-b border-[var(--border)] flex items-start gap-4">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Vorschau</div>
              <div className="tf-display text-xl font-bold leading-tight">{title || "(ohne Titel)"}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] transition"
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>

          <div className="px-5 py-4">
            {bullets.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[var(--foreground)]">
                {bullets.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-[var(--muted)]">(keine Bulletpoints)</div>
            )}

            <div className="mt-5 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
