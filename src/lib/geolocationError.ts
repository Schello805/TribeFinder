export function getGeolocationErrorToast(error: unknown): { message: string; level: "error" | "warning" } {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "number"
      ? (error as { code: number }).code
      : null;

  if (code === 1) {
    return {
      level: "warning",
      message:
        "Standort-Berechtigung verweigert. Bitte Standortfreigabe im Browser für diese Website erlauben (z.B. Chrome: Schloss-Symbol → Standort → Zulassen; Safari: Einstellungen → Websites → Standort).",
    };
  }

  if (code === 2) {
    return {
      level: "error",
      message:
        "Standort ist aktuell nicht verfügbar. Bitte Ortungsdienste (macOS) aktivieren, WLAN/Internet prüfen und die Standortfreigabe im Browser erlauben.",
    };
  }

  if (code === 3) {
    return {
      level: "error",
      message:
        "Standort-Abfrage hat zu lange gedauert (Timeout). Bitte erneut versuchen oder die Ortungsdienste prüfen.",
    };
  }

  return {
    level: "error",
    message: "Standort konnte nicht ermittelt werden. Bitte Standortfreigabe/Ortungsdienste prüfen.",
  };
}
