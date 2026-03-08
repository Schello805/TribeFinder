export type CookieConsent = {
  version: 1;
  necessary: true;
  analytics: boolean;
  externalMedia: boolean;
  updatedAt: number;
};

const STORAGE_KEY = "tf_cookie_consent_v1";

function isConsent(v: unknown): v is CookieConsent {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    o.version === 1 &&
    o.necessary === true &&
    typeof o.analytics === "boolean" &&
    typeof o.externalMedia === "boolean" &&
    typeof o.updatedAt === "number"
  );
}

export function getStoredConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isConsent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function storeConsent(next: Omit<CookieConsent, "updatedAt">): CookieConsent {
  if (typeof window === "undefined") {
    return { ...next, updatedAt: Date.now() };
  }

  const full: CookieConsent = { ...next, updatedAt: Date.now() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // ignore
  }

  try {
    window.dispatchEvent(new CustomEvent("tf-cookie-consent-changed", { detail: full }));
  } catch {
    // ignore
  }

  return full;
}

export function requestOpenCookieSettings() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event("tf-open-cookie-settings"));
  } catch {
    // ignore
  }
}

export function formatConsentSummary(consent: CookieConsent | null) {
  if (!consent) return "unset";
  const parts: string[] = [];
  if (consent.analytics) parts.push("analytics");
  if (consent.externalMedia) parts.push("externalMedia");
  return parts.length ? parts.join(",") : "necessary";
}
