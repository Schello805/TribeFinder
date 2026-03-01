"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

type Props = {
  open: boolean;
  title: string;
  bullets: string[];
  onClose: () => void;
};

export default function WhatsNewPreviewModal({ open, title, bullets, onClose }: Props) {
  const [logoUrl, setLogoUrl] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/branding", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const url = data?.logoUrl ? (normalizeUploadedImageUrl(String(data.logoUrl)) ?? "") : "";
        setLogoUrl(url);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const effectiveLogoUrl = logoUrl || "/icons/icon-192.png";

  return (
    <div className="fixed inset-0 z-[1200]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Schließen"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl text-[var(--foreground)] border border-[var(--border)] shadow-2xl overflow-hidden">
          <div className="bg-[var(--surface)] [background-image:linear-gradient(135deg,rgba(199,100,60,0.18),rgba(231,191,115,0.10))]">
            <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-start gap-4">
              <div className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2">
                <Image src={effectiveLogoUrl} alt="TribeFinder" width={28} height={28} className="h-7 w-7 rounded" unoptimized />
              </div>

              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Vorschau</div>
                <div className="tf-display text-2xl font-bold leading-tight break-words">{title || "(ohne Titel)"}</div>
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
          </div>

          <div className="px-5 py-4 bg-[var(--surface)] max-h-[70vh] overflow-auto">
            {bullets.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[var(--foreground)]">
                {bullets.map((b, idx) => (
                  <li key={idx} className="whitespace-pre-wrap break-words">
                    {b}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-[var(--muted)]">(keine Bulletpoints)</div>
            )}

            <div className="mt-5 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-[var(--on-primary)] bg-[var(--primary)] hover:opacity-90"
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
