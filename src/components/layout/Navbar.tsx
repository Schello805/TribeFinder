"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");

  const [unreadCount, setUnreadCount] = useState<number>(0);

  const [userAvatarUrl, setUserAvatarUrl] = useState<string>("");
  const userImageUrl = userAvatarUrl || (session?.user?.image ? (normalizeUploadedImageUrl(String(session.user.image)) ?? "") : "");

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
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const load = async () => {
      try {
        const res = await fetch("/api/messages/unread-count", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { unreadCount?: number } | null;
        if (cancelled) return;
        const next = typeof data?.unreadCount === "number" ? data.unreadCount : 0;
        setUnreadCount(next);
      } catch {
        // ignore
      }
    };

    load();
    interval = setInterval(load, 45_000);

    const onFocus = () => load();
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session?.user, pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <nav className="bg-indigo-600 dark:bg-indigo-950 shadow-lg transition-colors sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="text-xl font-bold text-white flex items-center gap-2">
            {logoUrl ? (
              <Image src={logoUrl} alt="TribeFinder" width={56} height={56} className="h-14 w-14 rounded" unoptimized />
            ) : (
              <span className="text-2xl">💃</span>
            )}
            TribeFinder
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/groups" className="text-indigo-100 hover:text-white transition font-medium">
              Gruppen finden
            </Link>
            <Link href="/events" className="text-indigo-100 hover:text-white transition font-medium">
              Events
            </Link>
            <Link href="/map" className="text-indigo-100 hover:text-white transition font-medium">
              Karte
            </Link>
            
            <ThemeToggle />

            {session ? (
              <>
                <Link href="/messages" className="text-indigo-100 hover:text-white transition font-medium inline-flex items-center gap-2">
                  Nachrichten
                  {unreadCount > 0 && (
                    <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold inline-flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
                <Link href="/dashboard" className="text-indigo-100 hover:text-white transition font-medium flex items-center gap-2">
                  {userImageUrl ? (
                    <Image src={userImageUrl} alt="Profil" width={28} height={28} className="h-7 w-7 rounded-full object-cover border border-white/20" unoptimized />
                  ) : (
                    <span className="h-7 w-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm">👤</span>
                  )}
                  Profil
                </Link>
                <button
                  onClick={() => signOut()}
                  className="bg-white/10 text-white border border-white/20 px-4 py-2 rounded-md hover:bg-white hover:text-indigo-600 transition font-medium"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="text-indigo-100 hover:text-white transition font-medium">
                  Anmelden
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-white text-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-50 transition font-medium shadow-sm"
                >
                  Registrieren
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-indigo-100 hover:text-white focus:outline-none"
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
        <div className="md:hidden bg-indigo-700 dark:bg-indigo-900 border-t border-indigo-500">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link href="/groups" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-indigo-100 hover:text-white hover:bg-indigo-600 rounded-md">
              Gruppen finden
            </Link>
            <Link href="/events" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-indigo-100 hover:text-white hover:bg-indigo-600 rounded-md">
              Events
            </Link>
            <Link href="/map" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-indigo-100 hover:text-white hover:bg-indigo-600 rounded-md">
              Karte
            </Link>
            {session ? (
              <>
                <Link href="/messages" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between gap-3 px-3 py-2 text-indigo-100 hover:text-white hover:bg-indigo-600 rounded-md">
                  <span>Nachrichten</span>
                  {unreadCount > 0 && (
                    <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold inline-flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-indigo-100 hover:text-white hover:bg-indigo-600 rounded-md">
                  {userImageUrl ? (
                    <Image src={userImageUrl} alt="Profil" width={24} height={24} className="h-6 w-6 rounded-full object-cover border border-white/20" unoptimized />
                  ) : (
                    <span className="h-6 w-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs">👤</span>
                  )}
                  Profil
                </Link>
                <button
                  onClick={() => signOut()}
                  className="w-full text-left block px-3 py-2 text-red-200 hover:bg-indigo-600 hover:text-white rounded-md"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-indigo-100 hover:text-white hover:bg-indigo-600 rounded-md">
                  Anmelden
                </Link>
                <Link href="/auth/register" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-white font-bold hover:bg-indigo-600 rounded-md">
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
