"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

type Item = {
  id: string;
  title: string;
  bullets: unknown;
};

function bulletsAsStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x : "")).filter((x) => x.trim().length > 0);
}

export default function WhatsNewModal() {
  const [item, setItem] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/announcements/latest", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { item?: Item | null } | null;
      const next = data?.item ?? null;
      setItem(next);
      setOpen(Boolean(next));
    } catch {
      setItem(null);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
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
  }, []);

  const dismiss = useCallback(async () => {
    if (!item?.id) {
      setOpen(false);
      return;
    }

    setDismissing(true);
    try {
      await fetch("/api/announcements/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: item.id }),
      });
    } catch {
      // ignore
    } finally {
      setDismissing(false);
      setOpen(false);
      setItem(null);
    }
  }, [item?.id]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") void dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismiss, open]);

  if (loading) return null;
  if (!open || !item) return null;

  const bulletLines = bulletsAsStringArray(item.bullets);
  const effectiveLogoUrl = logoUrl || "/icons/icon-192.png";

  return (
    <div className="fixed inset-0 z-[1100]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Schließen"
        onClick={() => void dismiss()}
        disabled={dismissing}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl text-[var(--foreground)] border border-[var(--border)] shadow-2xl overflow-hidden">
          <div className="bg-[var(--surface)] [background-image:linear-gradient(135deg,rgba(199,100,60,0.18),rgba(231,191,115,0.10))]">
            <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-start gap-4">
              <div className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2">
                <Image
                  src={effectiveLogoUrl}
                  alt="TribeFinder"
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded"
                  unoptimized
                />
              </div>

              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-[var(--muted)]">What&apos;s new</div>
                <div className="tf-display text-2xl font-bold leading-tight break-words">{item.title}</div>
              </div>

              <button
                type="button"
                onClick={() => void dismiss()}
                disabled={dismissing}
                className="ml-auto shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] transition disabled:opacity-50"
                aria-label="Schließen"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="px-5 py-4 bg-[var(--surface)] max-h-[70vh] overflow-auto">
            {bulletLines.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2 text-sm text-[var(--foreground)]">
                {bulletLines.map((b, idx) => (
                  <li key={idx} className="whitespace-pre-wrap break-words">
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => void dismiss()}
                disabled={dismissing}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-[var(--on-primary)] bg-[var(--primary)] hover:opacity-90 disabled:opacity-50"
              >
                {dismissing ? "Bitte warten…" : "OK"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
