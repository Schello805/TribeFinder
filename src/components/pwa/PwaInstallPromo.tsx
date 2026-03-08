"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type Variant = "card" | "menu";

type Props = {
  variant: Variant;
  onAction?: () => void;
  className?: string;
};

function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className ?? "h-5 w-5"}
      fill="currentColor"
    >
      <path d="M9.02 3.4a.75.75 0 0 1 1.02.27l.44.78a7.16 7.16 0 0 1 3.04 0l.44-.78a.75.75 0 1 1 1.3.75l-.47.82A6.76 6.76 0 0 1 18.7 10H5.3a6.76 6.76 0 0 1 3.87-4.76l-.47-.82A.75.75 0 0 1 9.02 3.4Z" />
      <path d="M5 11.25c0-.41.34-.75.75-.75h12.5c.41 0 .75.34.75.75V17a2.5 2.5 0 0 1-2.5 2.5H7.5A2.5 2.5 0 0 1 5 17v-5.75Z" />
      <path d="M3.25 11.5c.41 0 .75.34.75.75v4.25a1 1 0 0 1-2 0v-4.25c0-.41.34-.75.75-.75Zm17.5 0c.41 0 .75.34.75.75v4.25a1 1 0 0 1-2 0v-4.25c0-.41.34-.75.75-.75Z" />
      <path d="M8.25 19.5c.41 0 .75.34.75.75V22a1 1 0 0 1-2 0v-1.75c0-.41.34-.75.75-.75Zm7.5 0c.41 0 .75.34.75.75V22a1 1 0 0 1-2 0v-1.75c0-.41.34-.75.75-.75Z" />
      <path d="M9 8.25a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm6 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className ?? "h-5 w-5"}
      fill="currentColor"
    >
      <path d="M16.36 1.5c.06 1.02-.35 2.04-1.03 2.79-.72.8-1.88 1.41-2.93 1.32-.11-1 .32-2.04 1.06-2.83.71-.76 1.96-1.37 2.9-1.28Z" />
      <path d="M20.74 17.03c-.57 1.33-1.24 2.55-2.15 3.73-.85 1.1-1.56 2.24-2.95 2.26-1.35.02-1.79-.8-3.33-.8-1.54 0-2.03.78-3.31.82-1.34.05-2.36-1.28-3.21-2.37C3.43 18.83 1.6 13.3 3.5 10.02c.95-1.64 2.65-2.68 4.5-2.71 1.33-.02 2.59.9 3.31.9.72 0 2.27-1.11 3.83-.95.65.03 2.46.26 3.63 1.96-2.92 1.6-2.45 5.8.97 6.81-.22.68-.49 1.32-1 2Z" />
    </svg>
  );
}

const DISMISS_UNTIL_KEY = "tf_pwa_promo_dismissed_until_v1";

function nowMs() {
  return Date.now();
}

function readDismissUntil(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(DISMISS_UNTIL_KEY);
    const v = raw ? Number(raw) : 0;
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

function writeDismissUntil(ms: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_UNTIL_KEY, String(ms));
  } catch {
    // ignore
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)");
  const displayModeStandalone = Boolean(mql?.matches);
  const iosStandalone = Boolean((navigator as unknown as { standalone?: boolean }).standalone);
  return displayModeStandalone || iosStandalone;
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(ua);
}

function isAndroid(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  return /Android/i.test(ua);
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
}

function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return !isMobile();
}

function isSafariOnIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  if (!isIOS()) return false;
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  return isSafari;
}

export default function PwaInstallPromo({ variant, onAction, className }: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installable, setInstallable] = useState(false);
  const [dismissUntil, setDismissUntil] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string>(" ");

  useEffect(() => {
    Promise.resolve().then(() => {
      setMounted(true);
      setDismissUntil(readDismissUntil());
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;

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
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const onBeforeInstallPrompt = (e: Event) => {
      const evt = e as BeforeInstallPromptEvent;
      if (typeof evt.preventDefault === "function") evt.preventDefault();
      setDeferredPrompt(evt);
      setInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    const mql = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayMode = () => {
      if (isStandalone()) {
        setDeferredPrompt(null);
        setInstallable(false);
      }
    };
    if (mql) mql.addEventListener?.("change", onDisplayMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      if (mql) mql.removeEventListener?.("change", onDisplayMode);
    };
  }, [mounted]);

  const isInstalled = mounted ? isStandalone() : false;
  const canShowIOSInstructions = mounted ? isSafariOnIOS() && !isInstalled : false;
  const canShowAndroidInstructions = mounted ? isAndroid() && !isInstalled : false;
  const canShowMobileFallback = mounted ? isMobile() && !isInstalled : false;
  const canShowDesktopInstructions = mounted ? isDesktop() && !isInstalled : false;

  const shouldHide = useMemo(() => {
    if (!mounted) return true;
    if (isInstalled) return true;
    if (dismissUntil > nowMs()) return true;

    if (variant === "menu") {
      return false;
    }

    if (installable) return false;
    if (canShowIOSInstructions) return false;
    if (canShowAndroidInstructions) return false;
    if (canShowMobileFallback) return false;
    if (canShowDesktopInstructions) return false;
    return true;
  }, [mounted, isInstalled, dismissUntil, installable, canShowIOSInstructions, canShowAndroidInstructions, canShowMobileFallback, canShowDesktopInstructions, variant]);

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  const dismissForDays = useCallback((days: number) => {
    const until = nowMs() + days * 24 * 60 * 60 * 1000;
    writeDismissUntil(until);
    setDismissUntil(until);
    setOpen(false);
    onAction?.();
  }, [onAction]);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => null);
    } catch {
      // ignore
    } finally {
      setDeferredPrompt(null);
      setInstallable(false);
      setOpen(false);
      onAction?.();
    }
  }, [deferredPrompt, onAction]);

  if (shouldHide) return null;

  const effectiveLogoUrl = (logoUrl || "").trim() || "/icons/icon-192.png";

  if (variant === "menu") {
    return (
      <>
        <button
          type="button"
          className={
            className ??
            "w-full text-left px-4 py-2 text-sm text-[var(--nav-fg)] hover:bg-[var(--nav-surface)]"
          }
          onClick={openModal}
        >
          App installieren
        </button>
        {open ? (
          <InstallModal
            effectiveLogoUrl={effectiveLogoUrl}
            canInstall={Boolean(deferredPrompt)}
            canShowIOSInstructions={canShowIOSInstructions}
            canShowAndroidInstructions={canShowAndroidInstructions}
            canShowDesktopInstructions={canShowDesktopInstructions}
            onClose={closeModal}
            onInstall={triggerInstall}
            onLater={() => dismissForDays(14)}
            onNever={() => dismissForDays(365)}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className={className ?? "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow overflow-hidden sm:rounded-lg"}>
        <div className="px-6 pt-6 pb-5 [background-image:linear-gradient(135deg,rgba(199,100,60,0.18),rgba(231,191,115,0.10))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-2xl bg-[var(--primary)]/20 blur-md animate-[pulse_2.2s_ease-in-out_infinite]" />
                <div className="relative h-12 w-12 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
                  <Image src={effectiveLogoUrl} alt="TribeFinder" width={48} height={48} className="h-full w-full object-contain p-1.5" unoptimized />
                </div>
              </div>

              <div className="min-w-0">
                <div className="tf-display text-lg font-medium text-[var(--foreground)]">TribeFinder als App</div>
                <div className="mt-1 text-sm text-[var(--muted)]">
                  Installiere TribeFinder auf deinem Startbildschirm – schneller Zugriff und (wenn unterstützt) Badge für Nachrichten.
                </div>
              </div>
            </div>

            <div className="shrink-0 flex gap-2">
              <span className="inline-flex items-center justify-center text-[var(--muted)]" title="Android">
                <AndroidIcon className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center justify-center text-[var(--muted)]" title="iOS">
                <AppleIcon className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2 sm:items-center">
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold text-[var(--on-primary)] bg-[var(--primary)] hover:opacity-90 transition"
          >
            Anleitung / Install
          </button>
          <button
            type="button"
            onClick={() => dismissForDays(14)}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] transition"
          >
            Später erinnern
          </button>
        </div>
      </div>

      {open ? (
        <InstallModal
          effectiveLogoUrl={effectiveLogoUrl}
          canInstall={Boolean(deferredPrompt)}
          canShowIOSInstructions={canShowIOSInstructions}
          canShowAndroidInstructions={canShowAndroidInstructions}
          canShowDesktopInstructions={canShowDesktopInstructions}
          onClose={closeModal}
          onInstall={triggerInstall}
          onLater={() => dismissForDays(14)}
          onNever={() => dismissForDays(365)}
        />
      ) : null}
    </>
  );
}

function InstallModal({
  effectiveLogoUrl,
  canInstall,
  canShowIOSInstructions,
  canShowAndroidInstructions,
  canShowDesktopInstructions,
  onClose,
  onInstall,
  onLater,
  onNever,
}: {
  effectiveLogoUrl: string;
  canInstall: boolean;
  canShowIOSInstructions: boolean;
  canShowAndroidInstructions: boolean;
  canShowDesktopInstructions: boolean;
  onClose: () => void;
  onInstall: () => void;
  onLater: () => void;
  onNever: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1100]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Schließen"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl text-[var(--foreground)] border border-[var(--border)] shadow-2xl overflow-hidden bg-[var(--surface)]">
          <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] flex items-start gap-4">
            <div className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2">
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
              <div className="tf-display text-xl font-bold leading-tight break-words">TribeFinder installieren</div>
              <div className="mt-1 text-xs text-[var(--muted)]">Android + iOS</div>
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

          <div className="px-5 py-4 space-y-4">
            {canInstall ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="text-sm font-semibold">Android (Chrome/Edge)</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  Tippe auf „Installieren“, um TribeFinder zum Startbildschirm hinzuzufügen.
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onInstall}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold text-[var(--on-primary)] bg-[var(--primary)] hover:opacity-90 transition"
                  >
                    Installieren
                  </button>
                </div>
              </div>
            ) : null}

            {canShowIOSInstructions ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="text-sm font-semibold">iPhone / iPad (Safari)</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  iOS hat keinen direkten Install-Button. So geht’s:
                </div>
                <ol className="mt-3 list-decimal pl-5 space-y-1 text-sm">
                  <li>Unten auf „Teilen“ tippen</li>
                  <li>„Zum Home-Bildschirm“ auswählen</li>
                  <li>„Hinzufügen“ bestätigen</li>
                </ol>
              </div>
            ) : null}

            {canShowAndroidInstructions && !canInstall ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="text-sm font-semibold">Android (Chrome/Edge)</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  Wenn kein Install-Button angezeigt wird, kannst du TribeFinder trotzdem zum Startbildschirm hinzufügen:
                </div>
                <ol className="mt-3 list-decimal pl-5 space-y-1 text-sm">
                  <li>Oben rechts auf „⋮“ tippen</li>
                  <li>„Zum Startbildschirm hinzufügen“ oder „App installieren“ wählen</li>
                  <li>Bestätigen</li>
                </ol>
              </div>
            ) : null}

            {canShowDesktopInstructions && !canInstall ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="text-sm font-semibold">Desktop (Chrome/Edge)</div>
                <div className="mt-1 text-xs text-[var(--muted)]">So installierst du TribeFinder als App:</div>
                <ol className="mt-3 list-decimal pl-5 space-y-1 text-sm">
                  <li>In der Adressleiste nach einem Install-Icon (&quot;+&quot;) suchen und anklicken</li>
                  <li>Oder: Browser-Menü öffnen → „Installieren“ / „App installieren“</li>
                </ol>
              </div>
            ) : null}

            {!canInstall && !canShowIOSInstructions && !canShowAndroidInstructions && !canShowDesktopInstructions ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="text-sm font-semibold">Installation</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  In diesem Browser ist die Installation aktuell nicht verfügbar.
                </div>
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onLater}
                className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] transition"
              >
                Später erinnern
              </button>
              <button
                type="button"
                onClick={onNever}
                className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] transition"
              >
                Nicht mehr anzeigen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
