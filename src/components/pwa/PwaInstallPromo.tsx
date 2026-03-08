"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

  useEffect(() => {
    Promise.resolve().then(() => {
      setMounted(true);
      setDismissUntil(readDismissUntil());
    });
  }, []);

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

  const shouldHide = useMemo(() => {
    if (!mounted) return true;
    if (isInstalled) return true;
    if (dismissUntil > nowMs()) return true;
    if (installable) return false;
    if (canShowIOSInstructions) return false;
    return true;
  }, [mounted, isInstalled, dismissUntil, installable, canShowIOSInstructions]);

  const openModal = useCallback(() => {
    setOpen(true);
    onAction?.();
  }, [onAction]);

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
            canInstall={Boolean(deferredPrompt)}
            canShowIOSInstructions={canShowIOSInstructions}
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
      <div className={className ?? "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow overflow-hidden sm:rounded-lg p-6"}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="tf-display text-lg font-medium text-[var(--foreground)]">TribeFinder als App</div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              Installiere TribeFinder auf deinem Startbildschirm – schneller Zugriff und (wenn unterstützt) Badge für Nachrichten.
            </div>
          </div>
          <div className="shrink-0 flex gap-2">
            <span className="text-xl" title="Android">
              🤖
            </span>
            <span className="text-xl" title="iOS">
              🍎
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
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
          canInstall={Boolean(deferredPrompt)}
          canShowIOSInstructions={canShowIOSInstructions}
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
  canInstall,
  canShowIOSInstructions,
  onClose,
  onInstall,
  onLater,
  onNever,
}: {
  canInstall: boolean;
  canShowIOSInstructions: boolean;
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

            {!canInstall && !canShowIOSInstructions ? (
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
