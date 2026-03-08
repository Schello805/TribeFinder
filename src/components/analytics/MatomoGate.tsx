"use client";

import { useEffect, useState } from "react";
import MatomoTracker from "@/components/analytics/MatomoTracker";
import { CookieConsent, getStoredConsent } from "@/lib/cookieConsent";

type Props = {
  url: string;
  siteId: string;
  trackingCode?: string;
};

export default function MatomoGate({ url, siteId, trackingCode }: Props) {
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    const read = () => setConsent(getStoredConsent());
    read();

    const onChanged = () => read();
    window.addEventListener("tf-cookie-consent-changed", onChanged);
    return () => window.removeEventListener("tf-cookie-consent-changed", onChanged);
  }, []);

  if (!consent?.analytics) return null;

  return <MatomoTracker url={url} siteId={siteId} trackingCode={trackingCode} />;
}
