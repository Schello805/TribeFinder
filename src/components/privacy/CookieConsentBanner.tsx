"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CookieConsent, getStoredConsent, storeConsent } from "@/lib/cookieConsent";

type SettingsDraft = {
  analytics: boolean;
  externalMedia: boolean;
};

export default function CookieConsentBanner() {
  const [consent, setConsent] = useState<CookieConsent | null>(() => {
    if (typeof window === "undefined") return null;
    return getStoredConsent();
  });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SettingsDraft>(() => {
    if (typeof window === "undefined") return { analytics: false, externalMedia: false };
    const c = getStoredConsent();
    return { analytics: Boolean(c?.analytics), externalMedia: Boolean(c?.externalMedia) };
  });

  const hasConsent = Boolean(consent);

  useEffect(() => {
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as unknown;
      if (detail && typeof detail === "object") {
        const next = detail as CookieConsent;
        setConsent(next);
        setDraft({ analytics: next.analytics, externalMedia: next.externalMedia });
      } else {
        const next = getStoredConsent();
        setConsent(next);
        if (next) setDraft({ analytics: next.analytics, externalMedia: next.externalMedia });
      }
    };

    const onOpen = () => {
      const next = getStoredConsent();
      setConsent(next);
      if (next) setDraft({ analytics: next.analytics, externalMedia: next.externalMedia });
      setOpen(true);
    };

    window.addEventListener("tf-cookie-consent-changed", onChanged as EventListener);
    window.addEventListener("tf-open-cookie-settings", onOpen);
    return () => {
      window.removeEventListener("tf-cookie-consent-changed", onChanged as EventListener);
      window.removeEventListener("tf-open-cookie-settings", onOpen);
    };
  }, []);

  const acceptAll = useCallback(() => {
    const next = storeConsent({ version: 1, necessary: true, analytics: true, externalMedia: true });
    setConsent(next);
    setDraft({ analytics: next.analytics, externalMedia: next.externalMedia });
    setOpen(false);
  }, []);

  const acceptNecessary = useCallback(() => {
    const next = storeConsent({ version: 1, necessary: true, analytics: false, externalMedia: false });
    setConsent(next);
    setDraft({ analytics: next.analytics, externalMedia: next.externalMedia });
    setOpen(false);
  }, []);

  const saveSettings = useCallback(() => {
    const next = storeConsent({
      version: 1,
      necessary: true,
      analytics: Boolean(draft.analytics),
      externalMedia: Boolean(draft.externalMedia),
    });
    setConsent(next);
    setDraft({ analytics: next.analytics, externalMedia: next.externalMedia });
    setOpen(false);
  }, [draft.analytics, draft.externalMedia]);

  const bannerVisible = !hasConsent;

  const summary = useMemo(() => {
    if (!consent) return null;
    const parts: string[] = [];
    if (consent.analytics) parts.push("Matomo");
    if (consent.externalMedia) parts.push("YouTube");
    return parts.length ? parts.join(" + ") : "nur notwendig";
  }, [consent]);

  return (
    <>
      {bannerVisible ? (
        <div className="fixed bottom-0 left-0 right-0 z-[1050]">
          <div className="mx-auto max-w-6xl px-4 pb-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="min-w-0">
                  <div className="tf-display text-sm font-bold text-[var(--foreground)]">Cookies & Datenschutz</div>
                  <div className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                    Wir verwenden notwendige Cookies für Login und Sicherheit. Mit deiner Zustimmung nutzen wir Matomo-Statistiken und laden externe Inhalte (YouTube).
                    <span className="ml-1">
                      <Link href="/datenschutz" className="underline underline-offset-2 hover:opacity-90">
                        Zur Datenschutzerklärung
                      </Link>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  <button
                    type="button"
                    onClick={acceptNecessary}
                    className="inline-flex items-center px-3 py-2 rounded-md text-xs font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] transition"
                  >
                    Nur notwendig
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="inline-flex items-center px-3 py-2 rounded-md text-xs font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] transition"
                  >
                    Einstellungen
                  </button>
                  <button
                    type="button"
                    onClick={acceptAll}
                    className="inline-flex items-center px-3 py-2 rounded-md text-xs font-semibold text-[var(--on-primary)] bg-[var(--primary)] hover:opacity-90 transition"
                  >
                    Alle akzeptieren
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[1100]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Schließen"
            onClick={() => setOpen(false)}
          />

          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl text-[var(--foreground)] border border-[var(--border)] shadow-2xl overflow-hidden bg-[var(--surface)]">
              <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-start gap-4">
                <div className="min-w-0">
                  <div className="tf-display text-xl font-bold leading-tight break-words">Cookie-Einstellungen</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">Aktuell: {summary ?? "nicht gesetzt"}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ml-auto shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] transition"
                  aria-label="Schließen"
                >
                  ✕
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold">Notwendig</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">Login, Sicherheit, CSRF-Schutz</div>
                    </div>
                    <div className="text-xs font-semibold px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)]">Immer aktiv</div>
                  </div>
                </div>

                <label className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex items-start justify-between gap-4 cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold">Statistik (Matomo)</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">Hilft uns zu verstehen, welche Seiten genutzt werden</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.analytics}
                    onChange={(e) => setDraft((d) => ({ ...d, analytics: e.target.checked }))}
                    className="mt-1"
                  />
                </label>

                <label className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex items-start justify-between gap-4 cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold">Externe Medien (YouTube)</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">Einbettungen können Daten an Drittanbieter übertragen</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.externalMedia}
                    onChange={(e) => setDraft((d) => ({ ...d, externalMedia: e.target.checked }))}
                    className="mt-1"
                  />
                </label>

                <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={acceptNecessary}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] transition"
                  >
                    Nur notwendig
                  </button>
                  <button
                    type="button"
                    onClick={saveSettings}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold text-[var(--on-primary)] bg-[var(--primary)] hover:opacity-90 transition"
                  >
                    Speichern
                  </button>
                </div>

                <div className="text-xs text-[var(--muted)]">
                  <Link href="/datenschutz" className="underline underline-offset-2 hover:opacity-90">
                    Datenschutz lesen
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
