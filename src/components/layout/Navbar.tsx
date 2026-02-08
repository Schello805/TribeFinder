"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";
import { useTheme } from "next-themes";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { setTheme, resolvedTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  const [userAvatarUrl, setUserAvatarUrl] = useState<string>("");
  const userImageUrl = userAvatarUrl || (session?.user?.image ? (normalizeUploadedImageUrl(String(session.user.image)) ?? "") : "");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.logoUrl) setLogoUrl(normalizeUploadedImageUrl(String(data.logoUrl)) ?? "");
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!session?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserAvatarUrl("");
      return () => {
        cancelled = true;
      };
    }

    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const img = data?.image ? (normalizeUploadedImageUrl(String(data.image)) ?? "") : "";
        setUserAvatarUrl(img);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/direct-messages/unread-count", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { unreadCount?: number } | null;
        if (cancelled) return;
        const next = typeof data?.unreadCount === "number" ? data.unreadCount : 0;
        setUnreadCount(next);
      } catch {
        // ignore
      }
    };

    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      void load();
    }, 45_000);

    void load();

    const onFocus = () => load();
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("tribefinder:messages-read", onFocus as EventListener);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("tribefinder:messages-read", onFocus as EventListener);
    };
  }, [session?.user, pathname]);

  useEffect(() => {
    if (!session?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingRequestsCount(0);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/groups/pending-requests", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { pendingCount?: number } | null;
        if (cancelled) return;
        const next = typeof data?.pendingCount === "number" ? data.pendingCount : 0;
        setPendingRequestsCount(next);
      } catch {
        // ignore
      }
    };

    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      void load();
    }, 60_000);

    void load();

    const onFocus = () => load();
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session?.user, pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    const t = window.setTimeout(() => {
      setIsMenuOpen(false);
      setIsUserMenuOpen(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <nav className="bg-[var(--nav-bg)] text-[var(--nav-fg)] shadow-lg transition-colors sticky top-0 z-[1000]">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="text-xl font-bold flex items-center gap-2 tf-display">
            {logoUrl ? (
              <Image src={logoUrl} alt="TribeFinder" width={56} height={56} className="h-14 w-14 rounded" unoptimized />
            ) : (
              <span className="text-2xl">💃</span>
            )}
            TribeFinder
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/groups" className="text-[var(--nav-muted)] hover:text-[var(--nav-fg)] transition font-medium">
              Gruppen finden
            </Link>
            <Link href="/events" className="text-[var(--nav-muted)] hover:text-[var(--nav-fg)] transition font-medium">
              Events
            </Link>
            <Link href="/map" className="text-[var(--nav-muted)] hover:text-[var(--nav-fg)] transition font-medium">
              Karte
            </Link>
            <Link href="/marketplace" className="text-[var(--nav-muted)] hover:text-[var(--nav-fg)] transition font-medium">
              Second-Hand
            </Link>

            {session ? (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-2 bg-[var(--nav-surface)] border border-[var(--nav-border)] px-3 py-2 rounded-md hover:bg-[var(--nav-surface-hover)] transition font-medium"
                    aria-haspopup="menu"
                    aria-expanded={isUserMenuOpen}
                    title="Profil & Einstellungen"
                  >
                    {userImageUrl ? (
                      <Image src={userImageUrl} alt="Profil" width={28} height={28} className="h-7 w-7 rounded-full object-cover border border-[var(--nav-border-strong)]" unoptimized />
                    ) : (
                      <span className="h-7 w-7 rounded-full bg-[var(--nav-surface)] border border-[var(--nav-border-strong)] flex items-center justify-center text-sm">👤</span>
                    )}
                    <span className="hidden lg:inline">Konto</span>
                    <svg className="w-4 h-4 opacity-80" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold inline-flex items-center justify-center">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                    {pendingRequestsCount > 0 && (
                      <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-400 text-xs font-bold inline-flex items-center justify-center">
                        {pendingRequestsCount > 99 ? "99+" : pendingRequestsCount}
                      </span>
                    )}
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-lg border border-[var(--nav-border)] bg-[var(--nav-bg)] shadow-xl overflow-hidden z-50">
                      <Link
                        href="/direct-messages"
                        className="flex items-center justify-between px-4 py-2 text-sm text-[var(--nav-fg)] hover:bg-[var(--nav-surface)]"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <span>Nachrichten</span>
                        {unreadCount > 0 ? (
                          <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold inline-flex items-center justify-center">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        ) : null}
                      </Link>

                      <Link
                        href="/dashboard"
                        className="flex items-center justify-between px-4 py-2 text-sm text-[var(--nav-fg)] hover:bg-[var(--nav-surface)]"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <span>Profil</span>
                        {pendingRequestsCount > 0 ? (
                          <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-400 text-xs font-bold inline-flex items-center justify-center">
                            {pendingRequestsCount > 99 ? "99+" : pendingRequestsCount}
                          </span>
                        ) : null}
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          window.dispatchEvent(new Event("tribefinder:open-feedback"));
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--nav-fg)] hover:bg-[var(--nav-surface)]"
                      >
                        Feedback
                      </button>

                      <div className="px-3 py-3 border-t border-[var(--nav-border)]">
                        <div className="px-1 pb-2 text-xs font-semibold text-[var(--nav-muted)]">Design</div>
                        <div className="flex items-center rounded-md border border-[var(--nav-border)] bg-[var(--nav-surface-subtle)] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setTheme("light")}
                            className={`flex-1 px-2 py-1.5 text-xs font-medium text-[var(--nav-fg)] hover:bg-[var(--nav-surface)] ${
                              theme === "light" ? "bg-[var(--nav-surface-hover)]" : ""
                            }`}
                          >
                            Hell
                          </button>
                          <button
                            type="button"
                            onClick={() => setTheme("dark")}
                            className={`flex-1 px-2 py-1.5 text-xs font-medium text-[var(--nav-fg)] hover:bg-[var(--nav-surface)] ${
                              theme === "dark" ? "bg-[var(--nav-surface-hover)]" : ""
                            }`}
                          >
                            Dunkel
                          </button>
                          <button
                            type="button"
                            onClick={() => setTheme("system")}
                            className={`flex-1 px-2 py-1.5 text-xs font-medium text-[var(--nav-fg)] hover:bg-[var(--nav-surface)] ${
                              theme === "system" ? "bg-[var(--nav-surface-hover)]" : ""
                            }`}
                            title={`System (${resolvedTheme === "dark" ? "Dunkel" : "Hell"})`}
                          >
                            System
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          signOut({ callbackUrl: "/" });
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--nav-fg)] hover:bg-[var(--nav-surface)]"
                      >
                        Abmelden
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="text-[var(--nav-muted)] hover:text-[var(--nav-fg)] transition font-medium">
                  Anmelden
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-md hover:opacity-95 transition font-medium shadow-sm"
                >
                  Registrieren
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-[var(--nav-muted)] hover:text-[var(--nav-fg)] focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-[var(--nav-bg)] border-t border-[var(--nav-border)]">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link href="/groups" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-[var(--nav-muted)] hover:text-[var(--nav-fg)] hover:bg-[var(--nav-surface)] rounded-md">
              Gruppen finden
            </Link>
            <Link href="/events" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-[var(--nav-muted)] hover:text-[var(--nav-fg)] hover:bg-[var(--nav-surface)] rounded-md">
              Events
            </Link>
            <Link href="/map" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-[var(--nav-muted)] hover:text-[var(--nav-fg)] hover:bg-[var(--nav-surface)] rounded-md">
              Karte
            </Link>
            <Link href="/marketplace" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-[var(--nav-muted)] hover:text-[var(--nav-fg)] hover:bg-[var(--nav-surface)] rounded-md">
              Second-Hand
            </Link>
            <div className="px-3 py-2">
              <div className="text-xs font-semibold text-[var(--nav-muted)] mb-2">Design</div>
              <div className="inline-flex items-center rounded-md border border-[var(--nav-border)] bg-[var(--nav-surface)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`px-2 py-1.5 text-[var(--nav-fg)] hover:text-[var(--nav-fg)] transition-colors duration-200 focus:outline-none ${
                    theme === "light" ? "bg-[var(--nav-surface-hover)] text-[var(--nav-fg)]" : ""
                  }`}
                  disabled={!mounted}
                >
                  Hell
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`px-2 py-1.5 text-[var(--nav-fg)] hover:text-[var(--nav-fg)] transition-colors duration-200 focus:outline-none ${
                    theme === "dark" ? "bg-[var(--nav-surface-hover)] text-[var(--nav-fg)]" : ""
                  }`}
                  disabled={!mounted}
                >
                  Dunkel
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`px-2 py-1.5 text-[var(--nav-fg)] hover:text-[var(--nav-fg)] transition-colors duration-200 focus:outline-none ${
                    theme === "system" ? "bg-[var(--nav-surface-hover)] text-[var(--nav-fg)]" : ""
                  }`}
                  disabled={!mounted}
                >
                  System
                </button>
              </div>
            </div>
            {session ? (
              <>
                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between gap-3 px-3 py-2 text-[var(--nav-muted)] hover:text-[var(--nav-fg)] hover:bg-[var(--nav-surface)] rounded-md">
                  <span className="flex items-center gap-2">
                    {userImageUrl ? (
                      <Image src={userImageUrl} alt="Profil" width={24} height={24} className="h-6 w-6 rounded-full object-cover border border-[var(--nav-border-strong)]" unoptimized />
                    ) : (
                      <span className="h-6 w-6 rounded-full bg-[var(--nav-surface)] border border-[var(--nav-border-strong)] flex items-center justify-center text-xs">👤</span>
                    )}
                    Profil
                  </span>
                  {pendingRequestsCount > 0 && (
                    <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-400 text-xs font-bold inline-flex items-center justify-center">
                      {pendingRequestsCount > 99 ? "99+" : pendingRequestsCount}
                    </span>
                  )}
                </Link>

                <Link href="/direct-messages" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between gap-3 px-3 py-2 text-[var(--nav-muted)] hover:text-[var(--nav-fg)] hover:bg-[var(--nav-surface)] rounded-md">
                  <span>Nachrichten</span>
                  {unreadCount > 0 && (
                    <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold inline-flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>

                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full text-left block px-3 py-2 text-[var(--nav-fg)] hover:bg-[var(--nav-surface)] rounded-md"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-[var(--nav-muted)] hover:text-[var(--nav-fg)] hover:bg-[var(--nav-surface)] rounded-md">
                  Anmelden
                </Link>
                <Link href="/auth/register" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] font-bold hover:opacity-95 rounded-md">
                  Registrieren
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
