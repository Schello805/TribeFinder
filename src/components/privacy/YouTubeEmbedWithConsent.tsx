"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CookieConsent, getStoredConsent } from "@/lib/cookieConsent";
import CookieSettingsLink from "@/components/privacy/CookieSettingsLink";

type Props = {
  embedUrl: string;
};

export default function YouTubeEmbedWithConsent({ embedUrl }: Props) {
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    const read = () => setConsent(getStoredConsent());
    read();

    const onChanged = () => read();
    window.addEventListener("tf-cookie-consent-changed", onChanged);
    return () => window.removeEventListener("tf-cookie-consent-changed", onChanged);
  }, []);

  if (!consent?.externalMedia) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center p-6 bg-[var(--surface)] text-[var(--foreground)]">
        <div className="max-w-md text-center">
          <div className="tf-display text-lg font-bold">YouTube-Video</div>
          <div className="mt-2 text-sm text-[var(--muted)]">
            Dieses Video ist ein externer Inhalt. Zum Laden benötigen wir deine Zustimmung für "Externe Medien".
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <CookieSettingsLink className="inline-flex items-center px-4 py-2 rounded-md text-sm font-semibold text-[var(--on-primary)] bg-[var(--primary)] hover:opacity-90 transition" />
            <Link href="/datenschutz" className="text-sm font-semibold text-[var(--link)] hover:opacity-90 transition">
              Datenschutz
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={embedUrl}
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="w-full h-full min-h-[400px]"
    />
  );
}
