"use client";

import { requestOpenCookieSettings } from "@/lib/cookieConsent";

type Props = {
  className?: string;
};

export default function CookieSettingsLink({ className }: Props) {
  return (
    <button
      type="button"
      onClick={() => requestOpenCookieSettings()}
      className={className}
    >
      Cookie-Einstellungen
    </button>
  );
}
