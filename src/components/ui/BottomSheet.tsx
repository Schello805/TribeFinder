"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function BottomSheet({ open, title, onClose, children }: Props) {
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
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Schließen"
        onClick={onClose}
      />

      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto w-full max-w-2xl rounded-t-2xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-2xl">
          <div className="px-4 pt-3 pb-2 border-b border-[var(--border)]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {title ? (
                  <div className="tf-display text-lg font-bold truncate">{title}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] transition"
                aria-label="Schließen"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 flex justify-center">
              <div className="h-1 w-12 rounded-full bg-[var(--border)]" />
            </div>
          </div>

          <div className="px-4 py-4 max-h-[75vh] overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
