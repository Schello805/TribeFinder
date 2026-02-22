"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type Action = "skip" | "overwrite" | "copy";

type TransferArchiveItem = {
  filename: string;
  size: number;
  createdAt: number;
};

type TransferInspect = {
  filename: string;
  hasDataJson: boolean;
  uploadsFileCount: number;
  counts: { users: number; groups: number; events: number; memberships: number };
  items?: {
    users: { email: string; name: string | null }[];
    groups: { sourceId: string; name: string }[];
    events: { sourceId: string; title: string; startDate: string }[];
    memberships: { key: string; userEmail: string; groupSourceId: string; role: string; status: string }[];
  };
  missingUploads: string[];
};

function ActionSelect({ value, onChange }: { value: Action; onChange: (v: Action) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Action)}
      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-black dark:text-white"
    >
      <option value="skip">überspringen</option>
      <option value="overwrite">erstellen / überschreiben</option>
      <option value="copy">duplizieren (kopieren)</option>
    </select>
  );
}

export default function AdminTransferPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [groupIdsText, setGroupIdsText] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<TransferArchiveItem | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState<TransferArchiveItem | null>(null);

  const [inspectFilename, setInspectFilename] = useState<string>("");
  const [inspection, setInspection] = useState<TransferInspect | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  const [actionsUsers, setActionsUsers] = useState<Record<string, Action>>({});
  const [actionsGroups, setActionsGroups] = useState<Record<string, Action>>({});
  const [actionsEvents, setActionsEvents] = useState<Record<string, Action>>({});
  const [actionsMemberships, setActionsMemberships] = useState<Record<string, Action>>({});

  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<unknown>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [router, session, status]);

  const groupIds = useMemo(() => {
    return groupIdsText
      .split(/\s|,|;|\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [groupIdsText]);

  const exportNow = useCallback(async () => {
    if (groupIds.length === 0) {
      showToast("Bitte mindestens eine Gruppen-ID angeben", "error");
      return;
    }

    setIsExporting(true);
    setExportResult(null);
    try {
      const res = await fetch("/api/admin/transfer/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.details ? `${data?.message || "Export fehlgeschlagen"}: ${data.details}` : (data?.message || `HTTP ${res.status}`));
      setExportResult(data);
      showToast("Export erstellt", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Export fehlgeschlagen", "error");
    } finally {
      setIsExporting(false);
    }
  }, [groupIds, showToast]);

  const uploadArchive = useCallback(async () => {
    if (!uploadFile) {
      showToast("Bitte eine .tar.gz Datei auswählen", "error");
      return;
    }

    setIsUploading(true);
    setUploaded(null);
    setInspection(null);
    setApplyResult(null);

    try {
      const form = new FormData();
      form.append("file", uploadFile);
      const res = await fetch("/api/admin/transfer/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.details ? `${data?.message || "Upload fehlgeschlagen"}: ${data.details}` : (data?.message || `HTTP ${res.status}`));
      setUploaded(data);
      setInspectFilename(data.filename);
      showToast("Archiv hochgeladen", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Upload fehlgeschlagen", "error");
    } finally {
      setIsUploading(false);
    }
  }, [showToast, uploadFile]);

  const inspect = useCallback(async () => {
    const f = inspectFilename.trim();
    if (!f) {
      showToast("Bitte Dateiname angeben", "error");
      return;
    }

    setIsInspecting(true);
    setInspection(null);
    setApplyResult(null);

    try {
      const res = await fetch(`/api/admin/transfer/inspect?file=${encodeURIComponent(f)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.details ? `${data?.message || "Inspect fehlgeschlagen"}: ${data.details}` : (data?.message || `HTTP ${res.status}`));
      setInspection(data);

      const nextUsers: Record<string, Action> = {};
      for (const u of data?.items?.users || []) nextUsers[u.email] = "skip";
      setActionsUsers(nextUsers);

      const nextGroups: Record<string, Action> = {};
      for (const g of data?.items?.groups || []) nextGroups[g.sourceId] = "skip";
      setActionsGroups(nextGroups);

      const nextEvents: Record<string, Action> = {};
      for (const ev of data?.items?.events || []) nextEvents[ev.sourceId] = "skip";
      setActionsEvents(nextEvents);

      const nextMemberships: Record<string, Action> = {};
      for (const m of data?.items?.memberships || []) nextMemberships[m.key] = "skip";
      setActionsMemberships(nextMemberships);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Inspect fehlgeschlagen", "error");
    } finally {
      setIsInspecting(false);
    }
  }, [inspectFilename, showToast]);

  const apply = useCallback(async () => {
    const f = inspectFilename.trim();
    if (!inspection?.hasDataJson) {
      showToast("Bitte zuerst Inspect ausführen (data.json fehlt)", "error");
      return;
    }

    setIsApplying(true);
    setApplyResult(null);
    try {
      const res = await fetch("/api/admin/transfer/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: f,
          actions: {
            users: actionsUsers,
            groups: actionsGroups,
            events: actionsEvents,
            memberships: actionsMemberships,
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.details ? `${data?.message || "Import fehlgeschlagen"}: ${data.details}` : (data?.message || `HTTP ${res.status}`));
      setApplyResult(data);
      showToast("Import abgeschlossen", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Import fehlgeschlagen", "error");
    } finally {
      setIsApplying(false);
    }
  }, [actionsEvents, actionsGroups, actionsMemberships, actionsUsers, inspectFilename, inspection, showToast]);

  if (status === "loading" || !session?.user || session.user.role !== "ADMIN") return null;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Transfer Export (Gruppen)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Exportiert Gruppen + Events + Memberships + benötigte User (Mapping via Email) + Upload-Dateien.</p>

          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gruppen-IDs</label>
            <textarea
              value={groupIdsText}
              onChange={(e) => setGroupIdsText(e.target.value)}
              rows={3}
              placeholder="g1 g2 g3 ..."
              className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={exportNow}
              disabled={isExporting}
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isExporting ? "Exportiere..." : "Export erstellen"}
            </button>

            {exportResult ? (
              <div className="text-sm text-gray-700 dark:text-gray-200">
                Export: <code className="text-xs">{exportResult.filename}</code>{" "}
                <a
                  className="ml-2 underline"
                  href={`/api/admin/transfer/download?file=${encodeURIComponent(exportResult.filename)}`}
                >
                  Download
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Transfer Import</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Upload → Inspect → pro Datensatz skip/overwrite/copy → Apply.</p>

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
              onClick={uploadArchive}
              disabled={isUploading || !uploadFile}
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isUploading ? "Lade hoch..." : "Upload"}
            </button>
          </div>

          {uploaded ? (
            <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">
              Uploaded: <code className="text-xs">{uploaded.filename}</code>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dateiname</label>
              <input
                value={inspectFilename}
                onChange={(e) => setInspectFilename(e.target.value)}
                placeholder="transfer-upload-...tar.gz"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={inspect}
                  disabled={isInspecting || !inspectFilename.trim()}
                  className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  {isInspecting ? "Prüfe..." : "Inspect"}
                </button>
              </div>
            </div>
          </div>

          {inspection ? (
            <div className="mt-4 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm">
              <div className="font-semibold text-gray-900 dark:text-white">Inspect</div>
              <div className="mt-1 text-gray-700 dark:text-gray-200">
                Users: {inspection.counts.users} · Gruppen: {inspection.counts.groups} · Events: {inspection.counts.events} · Memberships: {inspection.counts.memberships} · Uploads: {inspection.uploadsFileCount}
              </div>
              {inspection.missingUploads?.length ? (
                <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Hinweis: {inspection.missingUploads.length} Upload-Dateien fehlen im Zielsystem (werden bei Apply kopiert, wenn im Archiv enthalten).
                </div>
              ) : null}
            </div>
          ) : null}

          {inspection?.items ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="font-semibold text-gray-900 dark:text-white mb-2">User</div>
                <div className="space-y-2">
                  {inspection.items.users.map((u) => (
                    <div key={u.email} className="flex items-center justify-between gap-3 text-sm">
                      <div className="truncate">
                        <code className="text-xs">{u.email}</code> {u.name ? <span className="opacity-80">({u.name})</span> : null}
                      </div>
                      <ActionSelect
                        value={actionsUsers[u.email] || "skip"}
                        onChange={(v) => setActionsUsers((prev) => ({ ...prev, [u.email]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-semibold text-gray-900 dark:text-white mb-2">Gruppen</div>
                <div className="space-y-2">
                  {inspection.items.groups.map((g) => (
                    <div key={g.sourceId} className="flex items-center justify-between gap-3 text-sm">
                      <div className="truncate">
                        <code className="text-xs">{g.sourceId}</code> {g.name}
                      </div>
                      <ActionSelect
                        value={actionsGroups[g.sourceId] || "skip"}
                        onChange={(v) => setActionsGroups((prev) => ({ ...prev, [g.sourceId]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-semibold text-gray-900 dark:text-white mb-2">Events</div>
                <div className="space-y-2">
                  {inspection.items.events.map((ev) => (
                    <div key={ev.sourceId} className="flex items-center justify-between gap-3 text-sm">
                      <div className="truncate">
                        <code className="text-xs">{ev.sourceId}</code> {ev.title} <span className="opacity-70">({new Date(ev.startDate).toLocaleString()})</span>
                      </div>
                      <ActionSelect
                        value={actionsEvents[ev.sourceId] || "skip"}
                        onChange={(v) => setActionsEvents((prev) => ({ ...prev, [ev.sourceId]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-semibold text-gray-900 dark:text-white mb-2">Memberships</div>
                <div className="space-y-2">
                  {inspection.items.memberships.map((m) => (
                    <div key={m.key} className="flex items-center justify-between gap-3 text-sm">
                      <div className="truncate">
                        <code className="text-xs">{m.userEmail}</code> → <code className="text-xs">{m.groupSourceId}</code> ({m.role}/{m.status})
                      </div>
                      <ActionSelect
                        value={actionsMemberships[m.key] || "skip"}
                        onChange={(v) => setActionsMemberships((prev) => ({ ...prev, [m.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {applyResult ? (
            <div className="mt-4 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-4 py-3 text-sm">
              <div className="font-semibold">Import Ergebnis</div>
              <pre className="mt-2 text-xs overflow-x-auto">{JSON.stringify(applyResult, null, 2)}</pre>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col items-start gap-2">
            <button
              type="button"
              onClick={apply}
              disabled={isApplying || !inspection?.hasDataJson}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isApplying ? "Import läuft..." : "Apply (Import)"}
            </button>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Upload-Dateien werden nur kopiert, wenn sie im Zielsystem noch nicht existieren.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
