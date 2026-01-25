"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
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

export default function AdminBackupsPage() {
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
      loadBackups();
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
      })
      .catch(() => undefined);

    return () => {
      canceled = true;
    };
  }, [status, session]);

  useEffect(() => {
    if (!restoreFilename) {
      setInspection(null);
      return;
    }

    let canceled = false;
    setIsInspecting(true);
    fetch(`/api/admin/backups/inspect?file=${encodeURIComponent(restoreFilename)}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (canceled) return;
        if (!ok) throw new Error(j?.message || "Backup konnte nicht geprüft werden");
        setInspection(j as BackupInspection);
      })
      .catch((e) => {
        if (!canceled) {
          setInspection(null);
          showToast(e instanceof Error ? e.message : "Backup konnte nicht geprüft werden", "error");
        }
      })
      .finally(() => {
        if (!canceled) setIsInspecting(false);
      });

    return () => {
      canceled = true;
    };
  }, [restoreFilename, showToast]);

  async function createBackup() {
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/backups", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Backup fehlgeschlagen");
      showToast("Backup erstellt", "success");
      await loadBackups();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Backup fehlgeschlagen", "error");
    } finally {
      setIsCreating(false);
    }
  }

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Backups</h1>
      <AdminNav />

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Manueller Umzug (Server A → Server B)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ziel: Backup auf Server A erstellen, herunterladen, auf Server B hochladen und dort restoren.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3">
              <div className="font-semibold text-gray-900 dark:text-white">Schritte</div>
              <ol className="mt-2 list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-200">
                <li>Auf Server A: Backup erstellen → Download (.tar.gz)</li>
                <li>Auf Server B: Backup hochladen</li>
                <li>Backup auswählen und Inhalt prüfen (Users/Gruppen/Uploads)</li>
                <li>Restore starten (überschreibt DB + Uploads)</li>
                <li>Danach Service neu starten (empfohlen)</li>
              </ol>
            </div>

            <div className="rounded-md border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-yellow-900 dark:text-yellow-200">
              <div className="font-semibold">Wichtige Hinweise</div>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Server B sollte möglichst die gleiche App-Version wie Server A haben.</li>
                <li>Wenn <code>NEXTAUTH_SECRET</code> auf Server B anders ist, müssen sich Nutzer neu einloggen (Daten bleiben korrekt).</li>
                <li>Nach Restore ist ein Neustart des Dienstes am sichersten, damit alle Prozesse die neue DB nutzen.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Automatische Backups</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Intervall für automatische Server-Backups. Der Server prüft stündlich, ob ein Backup fällig ist.
          </p>

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
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Backup erstellen</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sichert Datenbank + Uploads als .tar.gz</p>
          </div>
          <button
            onClick={createBackup}
            disabled={isCreating}
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
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
            <input
              type="file"
              accept=".tar.gz"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-700 dark:text-gray-200"
            />
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
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Restore aus Backup</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Achtung: Überschreibt Datenbank + Uploads. Danach musst du den Service neu starten.
          </p>

          {restoreSuccess ? (
            <div className="mt-3 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-4 py-3 text-sm flex items-center justify-between gap-3">
              <div>
                Restore erfolgreich. Empfehlung: Service neu starten (z.B. <code>systemctl restart tribefinder.service</code>).
                Wenn du ohne Neustart weiterarbeiten willst, kannst du auch die DB-Verbindung neu laden.
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

          {restoreError ? (
            <div className="mt-3 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 px-4 py-3 text-sm">
              {restoreError}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              value={restoreFilename}
              onChange={(e) => setRestoreFilename(e.target.value)}
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-black dark:text-white"
            >
              <option value="">Backup auswählen...</option>
              {backups.map((b) => (
                <option key={b.filename} value={b.filename}>
                  {b.filename}
                </option>
              ))}
            </select>

            <input
              value={restoreConfirmText}
              onChange={(e) => setRestoreConfirmText(e.target.value)}
              placeholder='Tippe RESTORE'
              className="px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-black dark:text-white"
            />

            <button
              onClick={restoreSelectedBackup}
              disabled={isRestoring}
              className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50"
            >
              {isRestoring ? "Restore..." : "Restore starten"}
            </button>
          </div>

          <div className="mt-4 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
            {isInspecting ? (
              <div>Backup wird geprüft…</div>
            ) : inspection ? (
              <div className="space-y-2">
                {inspection.warnings?.hasVeryFewData ? (
                  <div className="rounded-md border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-200 px-3 py-2">
                    Warnung: Dieses Backup enthält sehr wenig Daten (z.B. keine Events/Gruppen/Fotos). Prüfe, ob du das richtige Backup gewählt hast.
                  </div>
                ) : null}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div><span className="font-semibold">Users:</span> {inspection.counts.User ?? 0}</div>
                  <div><span className="font-semibold">Groups:</span> {inspection.counts.Group ?? 0}</div>
                  <div><span className="font-semibold">Events:</span> {inspection.counts.Event ?? 0}</div>
                  <div><span className="font-semibold">Uploads:</span> {inspection.uploadsFileCount}</div>
                  <div><span className="font-semibold">DanceStyles:</span> {inspection.counts.DanceStyle ?? 0}</div>
                  <div><span className="font-semibold">UserStyles:</span> {inspection.counts.UserDanceStyle ?? 0}</div>
                  <div><span className="font-semibold">Gallery:</span> {inspection.counts.GalleryImage ?? 0}</div>
                  <div><span className="font-semibold">Settings:</span> {inspection.counts.SystemSetting ?? 0}</div>
                </div>
              </div>
            ) : (
              <div>Wähle ein Backup aus, um den Inhalt zu prüfen.</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Vorhandene Backups</h2>
        </div>
        <div className="px-4 pb-5 sm:px-6">
          {isLoading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Lade...</div>
          ) : backups.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Keine Backups vorhanden.</div>
          ) : (
            <div className="space-y-2">
              {backups.map((b) => (
                <div
                  key={b.filename}
                  className="flex items-center justify-between rounded border border-gray-200 dark:border-gray-700 px-3 py-2"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{b.filename}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(b.createdAt)} · {formatBytes(b.size)}
                    </div>
                  </div>
                  <a
                    className="text-indigo-600 dark:text-indigo-300 hover:underline"
                    href={`/api/admin/backups/download?file=${encodeURIComponent(b.filename)}`}
                  >
                    Download
                  </a>

                  <button
                    type="button"
                    onClick={() => deleteBackup(b.filename)}
                    className="ml-3 text-red-600 dark:text-red-300 hover:underline"
                  >
                    Löschen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
