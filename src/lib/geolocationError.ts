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
        "Standort-Berechtigung verweigert. Bitte in Safari die Standortfreigabe für diese Website erlauben (Safari → Einstellungen → Websites → Standort).",
    };
  }

  if (code === 2) {
    return {
      level: "error",
      message:
        "Standort ist aktuell nicht verfügbar. Prüfe macOS Ortungsdienste, WLAN/Internet und die Safari-Standortfreigabe.",
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
