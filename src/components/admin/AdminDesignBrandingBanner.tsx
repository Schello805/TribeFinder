"use client";

import { useEffect, useState } from "react";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";
import { useToast } from "@/components/ui/Toast";

function getStringProp(obj: unknown, key: string): string | null {
  if (typeof obj !== "object" || obj === null) return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

export default function AdminDesignBrandingBanner() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isLogoSaving, setIsLogoSaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isThemeSaving, setIsThemeSaving] = useState(false);
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);

  const [themePreset, setThemePreset] = useState<string>("default");
  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string>("");
  const [bannerEnabled, setBannerEnabled] = useState<boolean>(false);
  const [bannerText, setBannerText] = useState<string>("");
  const [bannerBg, setBannerBg] = useState<string>("#f59e0b");
  const [bannerTextColor, setBannerTextColor] = useState<string>("#ffffff");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(getStringProp(data, "message") || `HTTP ${res.status}`);
        if (cancelled) return;

        const logo = getStringProp(data, "BRANDING_LOGO_URL") || "";
        const enabledRaw = getStringProp(data, "SITE_BANNER_ENABLED") || "false";
        const text = getStringProp(data, "SITE_BANNER_TEXT") || "";
        const bg = getStringProp(data, "SITE_BANNER_BG") || "#f59e0b";
        const textColor = getStringProp(data, "SITE_BANNER_TEXT_COLOR") || "#ffffff";
        const preset = (getStringProp(data, "SITE_THEME_PRESET") || "default").trim().toLowerCase();

        setBrandingLogoUrl(logo);
        setThemePreset(preset === "sahara" || preset === "copper" ? preset : "default");
        setBannerEnabled(String(enabledRaw).toLowerCase() === "true");
        setBannerText(text);
        setBannerBg(bg || "#f59e0b");
        setBannerTextColor(textColor || "#ffffff");

        const resMaint = await fetch("/api/admin/maintenance", { cache: "no-store" }).catch(() => null);
        if (resMaint && resMaint.ok) {
          const maint = await resMaint.json().catch(() => null);
          if (!cancelled && maint) {
            setMaintenanceEnabled(Boolean((maint as { enabled?: unknown }).enabled));
          }
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Fehler beim Laden", "error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const saveThemePreset = async (nextPreset: string) => {
    const normalized = String(nextPreset || "default").trim().toLowerCase();
    const value = normalized === "sahara" || normalized === "copper" ? normalized : "default";
    setIsThemeSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SITE_THEME_PRESET: value === "default" ? "" : value }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getStringProp(data, "message") || `HTTP ${res.status}`);
      setThemePreset(value);
      document.documentElement.setAttribute("data-tf-theme", value);
      showToast("Theme gespeichert", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Fehler beim Speichern", "error");
    } finally {
      setIsThemeSaving(false);
    }
  };

  const setMaintenance = async (enabled: boolean) => {
    setIsMaintenanceLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data: unknown = await res.json().catch(() => null);
      const errMsg =
        getStringProp(data, "message") ||
        getStringProp(data, "error") ||
        `HTTP ${res.status}`;
      if (!res.ok) throw new Error(errMsg);
      setMaintenanceEnabled(enabled);
      showToast(
        getStringProp(data, "message") ||
          "Gespeichert. Bitte Service neu starten (sudo systemctl restart tribefinder).",
        "success"
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Fehler beim Umschalten", "error");
    } finally {
      setIsMaintenanceLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setIsLogoSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/branding/logo", { method: "POST", body: fd });
      const data: unknown = await res.json().catch(() => null);
      const errMsg = getStringProp(data, "error") || getStringProp(data, "message") || "Fehler beim Logo-Upload";
      if (!res.ok) throw new Error(errMsg);

      const next = getStringProp(data, "logoUrl") || "";
      setBrandingLogoUrl(next);
      showToast("Logo gespeichert", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Fehler beim Logo-Upload", "error");
    } finally {
      setIsLogoSaving(false);
    }
  };

  const handleLogoRemove = async () => {
    setIsLogoSaving(true);
    try {
      const res = await fetch("/api/admin/branding/logo", { method: "DELETE" });
      const data: unknown = await res.json().catch(() => null);
      const errMsg = getStringProp(data, "error") || getStringProp(data, "message") || "Fehler beim Entfernen";
      if (!res.ok) throw new Error(errMsg);
      setBrandingLogoUrl("");
      showToast("Logo entfernt", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Fehler beim Entfernen", "error");
    } finally {
      setIsLogoSaving(false);
    }
  };

  const saveBanner = async () => {
    setIsSaving(true);
    try {
      const payload = {
        SITE_BANNER_ENABLED: bannerEnabled ? "true" : "false",
        SITE_BANNER_TEXT: bannerText,
        SITE_BANNER_BG: bannerBg || "#f59e0b",
        SITE_BANNER_TEXT_COLOR: bannerTextColor || "#ffffff",
      };

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getStringProp(data, "message") || `HTTP ${res.status}`);
      showToast("Gespeichert", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Fehler beim Speichern", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-900 dark:text-gray-100">Laden...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Theme</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Wähle ein Farbschema für die gesamte Webapp (Light &amp; Dark).</p>
        </div>
        <div className="p-6 space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Theme Preset</label>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={themePreset}
              disabled={isThemeSaving}
              onChange={(e) => {
                const v = e.target.value;
                void saveThemePreset(v);
              }}
              className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-700"
            >
              <option value="default">Standard</option>
              <option value="sahara">Sahara (warm &amp; hell)</option>
              <option value="copper">Copper (warm &amp; kräftig)</option>
            </select>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Tipp: nach Auswahl ggf. einmal neu laden (Cache: 10s).
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Branding</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Webapp Logo (Navbar/Footer).</p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="w-16 h-16 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {brandingLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={normalizeUploadedImageUrl(brandingLogoUrl) ?? ""} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">💃</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {isLogoSaving ? "Wird hochgeladen..." : "Logo hochladen"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={isLogoSaving}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleLogoUpload(f);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isLogoSaving || !brandingLogoUrl}
                  onClick={() => void handleLogoRemove()}
                  className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition"
                >
                  Entfernen
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Empfohlen: quadratisches Bild, max. 5MB (PNG/JPG/WebP/GIF). Wird in <code>public/uploads</code> gespeichert.
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Wartungsmodus</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Blockiert Schreibaktionen (POST/PUT/PATCH/DELETE) für Nicht-Admins, Lesen und Suche bleibt möglich.
          </p>
        </div>
        <div className="p-6 space-y-3">
          <label className="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-200">
            <span>Wartungsmodus aktiv</span>
            <input
              type="checkbox"
              checked={maintenanceEnabled}
              disabled={isMaintenanceLoading}
              onChange={(e) => void setMaintenance(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Hinweis: Nach dem Umschalten muss der Service neu gestartet werden (z.B. <code>sudo systemctl restart tribefinder</code>).
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Banner</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Seitenübergreifender Hinweis ganz oben (z.B. Wartungen ankündigen).</p>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={bannerEnabled}
              disabled={maintenanceEnabled}
              onChange={(e) => setBannerEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            Banner aktivieren
          </label>

          {maintenanceEnabled ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Während der Wartungsmodus aktiv ist, wird der Banner automatisch erzwungen.
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Text</label>
            <input
              type="text"
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              placeholder="Wartung heute 22:00-22:10"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hintergrundfarbe</label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="color"
                value={bannerBg || "#f59e0b"}
                onChange={(e) => setBannerBg(e.target.value)}
                className="h-10 w-14 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
              <input
                type="text"
                value={bannerBg}
                onChange={(e) => setBannerBg(e.target.value)}
                placeholder="#f59e0b"
                className="block w-40 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Textfarbe</label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="color"
                value={bannerTextColor || "#ffffff"}
                onChange={(e) => setBannerTextColor(e.target.value)}
                className="h-10 w-14 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
              <input
                type="text"
                value={bannerTextColor}
                onChange={(e) => setBannerTextColor(e.target.value)}
                placeholder="#ffffff"
                className="block w-40 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void saveBanner()}
              disabled={isSaving}
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSaving ? "Speichere..." : "Speichern"}
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Vorschau: wird direkt nach dem Speichern oben auf jeder Seite angezeigt.
          </div>
        </div>
      </div>
    </div>
  );
}
