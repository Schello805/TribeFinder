"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type BackupItem = {
  filename: string;
  size: number;
  createdAt: number;
};

type BackupInspection = {
  filename: string;
  hasDb: boolean;
  uploadsFileCount: number;
  counts: Record<string, number>;
  warnings?: { hasVeryFewData?: boolean };
};

export default function AdminBackupsPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);

  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFilename, setRestoreFilename] = useState("");
  const [restoreConfirmText, setRestoreConfirmText] = useState("");

  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [isReloadingDb, setIsReloadingDb] = useState(false);
  const [inspection, setInspection] = useState<BackupInspection | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  const [backupIntervalHours, setBackupIntervalHours] = useState<number>(24);
  const [isSavingInterval, setIsSavingInterval] = useState(false);

  const [lastAutoBackupAt, setLastAutoBackupAt] = useState<number | null>(null);

  const allowedBackupIntervals = new Set([0, 24, 168, 720]);

  const loadBackups = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/backups");
      if (!res.ok) throw new Error("Backups konnten nicht geladen werden");
      const data = await res.json();
      setBackups(Array.isArray(data?.backups) ? data.backups : []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Fehler beim Laden der Backups", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      void loadBackups();
    }
  }, [status, session, router, loadBackups]);

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;

    let canceled = false;
    fetch("/api/admin/settings")
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (canceled) return;
        if (!ok) throw new Error(j?.message || "Einstellungen konnten nicht geladen werden");
        const raw = j?.BACKUP_INTERVAL_HOURS;
        const n = Number(raw);
        const v = Number.isFinite(n) ? n : 24;
        setBackupIntervalHours(allowedBackupIntervals.has(v) ? v : 24);

        const lastRaw = j?.LAST_AUTO_BACKUP_AT;
        const lastNum = Number(lastRaw);
        setLastAutoBackupAt(Number.isFinite(lastNum) && lastNum > 0 ? lastNum : null);
      })
      .catch(() => undefined);

    return () => {
      canceled = true;
    };
  }, [status, session]);

  const uploadBackup = useCallback(async () => {
    if (!uploadFile) {
      showToast("Bitte eine .tar.gz Datei auswählen", "error");
      return;
    }

    if (!uploadFile.name.endsWith(".tar.gz")) {
      showToast("Nur .tar.gz Backups sind erlaubt", "error");
      return;
    }

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      const res = await fetch("/api/admin/backups/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      showToast("Backup hochgeladen", "success");
      setUploadFile(null);
      await loadBackups();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Upload fehlgeschlagen", "error");
    } finally {
      setIsUploading(false);
    }
  }, [loadBackups, showToast, uploadFile]);

  const createBackup = useCallback(async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/backups", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      showToast("Backup erstellt", "success");
      await loadBackups();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Backup fehlgeschlagen", "error");
    } finally {
      setIsCreating(false);
    }
  }, [loadBackups, showToast]);

  const deleteBackup = useCallback(
    async (filename: string) => {
      if (!confirm(`Backup wirklich löschen?\n\n${filename}`)) return;
      try {
        const res = await fetch(`/api/admin/backups?file=${encodeURIComponent(filename)}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
        showToast("Backup gelöscht", "success");
        await loadBackups();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Löschen fehlgeschlagen", "error");
      }
    },
    [loadBackups, showToast]
  );

  const inspectSelectedBackup = useCallback(async () => {
    if (!restoreFilename) {
      showToast("Bitte ein Backup auswählen", "error");
      return;
    }

    setIsInspecting(true);
    setInspection(null);
    try {
      const res = await fetch(`/api/admin/backups/inspect?file=${encodeURIComponent(restoreFilename)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.details ? `${data?.message || "Inspect fehlgeschlagen"}: ${data.details}` : (data?.message || "Inspect fehlgeschlagen"));
      setInspection(data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Inspect fehlgeschlagen", "error");
    } finally {
      setIsInspecting(false);
    }
  }, [restoreFilename, showToast]);

  const restoreSelectedBackup = useCallback(async () => {
    setRestoreError(null);
    setRestoreSuccess(false);
    if (!restoreFilename) {
      showToast("Bitte ein Backup auswählen", "error");
      setRestoreError("Bitte ein Backup auswählen");
      return;
    }

    if (restoreConfirmText.trim() !== "RESTORE") {
      showToast("Bitte RESTORE eintippen, um zu bestätigen", "error");
      setRestoreError("Bitte RESTORE eintippen, um zu bestätigen");
      return;
    }

    setIsRestoring(true);
    try {
      const res = await fetch("/api/admin/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: restoreFilename }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.details ? `${data?.message || "Restore fehlgeschlagen"}: ${data.details}` : (data?.message || "Restore fehlgeschlagen"));
      showToast(data?.message || "Restore abgeschlossen", "success");
      setRestoreConfirmText("");
      setRestoreSuccess(true);
      await loadBackups();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Restore fehlgeschlagen";
      setRestoreError(msg);
      showToast(msg, "error");
    } finally {
      setIsRestoring(false);
    }
  }, [loadBackups, restoreConfirmText, restoreFilename, showToast]);

  const reloadDb = useCallback(async () => {
    setIsReloadingDb(true);
    try {
      const res = await fetch("/api/admin/reload-db", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      showToast("DB neu geladen. Seite wird aktualisiert…", "success");
      setTimeout(() => window.location.reload(), 300);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "DB neu laden fehlgeschlagen", "error");
    } finally {
      setIsReloadingDb(false);
    }
  }, [showToast]);

  async function saveBackupInterval() {
    setIsSavingInterval(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ BACKUP_INTERVAL_HOURS: String(backupIntervalHours) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      showToast("Backup-Intervall gespeichert", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Speichern fehlgeschlagen", "error");
    } finally {
      setIsSavingInterval(false);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  }

  function formatDate(ms: number) {
    return new Date(ms).toLocaleString();
  }

  if (status === "loading" || isLoading) {
    return <div className="p-8 text-center text-gray-900 dark:text-gray-100">Laden...</div>;
  }

  if (session?.user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Backup erstellen</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sichert Datenbank + Uploads als .tar.gz</p>
          </div>
          <button
            type="button"
            onClick={createBackup}
            disabled={isCreating}
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 min-h-11"
          >
            {isCreating ? "Erstelle..." : "Backup erstellen"}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Backup hochladen</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Lade ein .tar.gz Backup hoch, um es später zu prüfen oder zu restoren.</p>

          <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
            <label className="inline-flex items-center justify-center px-4 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
              Datei auswählen
              <input
                type="file"
                accept=".tar.gz"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
            <div className="flex-1 text-sm text-gray-700 dark:text-gray-200 truncate">{uploadFile ? uploadFile.name : "Keine Datei ausgewählt"}</div>
            <button
              type="button"
              onClick={uploadBackup}
              disabled={isUploading || !uploadFile}
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isUploading ? "Lade hoch..." : "Upload"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Automatische Backups</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Intervall für automatische Server-Backups. Der Server prüft stündlich, ob ein Backup fällig ist.</p>

          <div className="mt-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
            <div className="font-semibold text-gray-900 dark:text-white">Status</div>
            <div className="mt-1">
              <span className="font-medium">Letztes Auto-Backup:</span> {lastAutoBackupAt ? formatDate(lastAutoBackupAt) : "Noch keines erstellt"}
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Wenn keine Backups unten erscheinen: Stelle sicher, dass der Timer läuft (systemd: <code>tribefinder-auto-backup.timer</code>)
              und dass das Verzeichnis <code>~/TribeFinder/backups</code> beschreibbar ist.
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              value={backupIntervalHours}
              onChange={(e) => setBackupIntervalHours(Number(e.target.value))}
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-black dark:text-white"
            >
              <option value={0}>Deaktiviert</option>
              <option value={24}>Täglich</option>
              <option value={168}>Wöchentlich</option>
              <option value={720}>Monatlich</option>
            </select>

            <button
              type="button"
              onClick={saveBackupInterval}
              disabled={isSavingInterval}
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSavingInterval ? "Speichere..." : "Speichern"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Backups</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Server-Backups im Ordner <code>backups/</code>.</p>

          {backups.length === 0 ? (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">Keine Backups vorhanden.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400">
                    <th className="py-2 pr-6 whitespace-nowrap">Datei</th>
                    <th className="py-2 pr-6 whitespace-nowrap">Größe</th>
                    <th className="py-2 pr-6 whitespace-nowrap">Erstellt</th>
                    <th className="py-2 pr-2 whitespace-nowrap">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {backups.map((b) => (
                    <tr key={b.filename} className="text-gray-800 dark:text-gray-200">
                      <td className="py-2 pr-6 font-mono text-xs whitespace-nowrap">
                        <span className="block max-w-[520px] truncate" title={b.filename}>
                          {b.filename}
                        </span>
                      </td>
                      <td className="py-2 pr-6 whitespace-nowrap">{formatBytes(b.size)}</td>
                      <td className="py-2 pr-6 whitespace-nowrap">{formatDate(b.createdAt)}</td>
                      <td className="py-2 pr-2">
                        <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                          <a
                            className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 min-h-11"
                            href={`/api/admin/backups/download?file=${encodeURIComponent(b.filename)}`}
                          >
                            Download
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setRestoreFilename(b.filename);
                              setInspection(null);
                            }}
                            className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 min-h-11"
                          >
                            Auswählen
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteBackup(b.filename)}
                            className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 min-h-11"
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Restore aus Backup</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Achtung: Überschreibt Datenbank + Uploads. Danach musst du den Service neu starten.</p>

          {restoreSuccess ? (
            <div className="mt-3 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-4 py-3 text-sm flex items-center justify-between gap-3">
              <div>
                Restore erfolgreich. Empfehlung: Service neu starten (z.B. <code>systemctl restart tribefinder.service</code>). Wenn du ohne Neustart weiterarbeiten willst, kannst du auch die DB-Verbindung neu laden.
                <div className="mt-1 text-xs opacity-90">Hinweis: System-Einstellungen (z.B. Matomo/Banner/Logo) können bis zum Neustart oder bis zum Cache-Refresh kurz verzögert erscheinen.</div>
              </div>
              <button
                type="button"
                onClick={reloadDb}
                disabled={isReloadingDb}
                className="px-3 py-2 rounded bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
              >
                {isReloadingDb ? "Lade…" : "DB neu laden"}
              </button>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ausgewähltes Backup</label>
              <input
                value={restoreFilename}
                onChange={(e) => setRestoreFilename(e.target.value)}
                placeholder="Dateiname..."
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={inspectSelectedBackup}
                  disabled={isInspecting || !restoreFilename}
                  className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  {isInspecting ? "Prüfe..." : "Inspect"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bestätigung</label>
              <input
                value={restoreConfirmText}
                onChange={(e) => setRestoreConfirmText(e.target.value)}
                placeholder='Tippe "RESTORE"'
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
              />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={restoreSelectedBackup}
                  disabled={isRestoring}
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isRestoring ? "Restore läuft..." : "Restore starten"}
                </button>
              </div>
            </div>
          </div>

          {restoreError ? <div className="mt-3 text-sm text-red-600">{restoreError}</div> : null}

          {inspection ? (
            <div className="mt-4 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm">
              <div className="font-semibold text-gray-900 dark:text-white">Inspect</div>
              <div className="mt-1 text-gray-700 dark:text-gray-200">
                DB: {inspection.hasDb ? "ja" : "nein"} · Upload-Dateien: {inspection.uploadsFileCount}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                {Object.entries(inspection.counts || {}).map(([k, v]) => (
                  <div key={k}>
                    {k}: {v}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
