"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export default function GroupFreshnessActions({ groupId, groupName, canManage, verifiedAt }: { groupId: string; groupName: string; canManage: boolean; verifiedAt: string | null }) {
  const { showToast } = useToast();
  const [date, setDate] = useState(verifiedAt);
  const [busy, setBusy] = useState(false);
  const formatted = date ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(date)) : "noch nicht bestätigt";

  const verify = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/verify`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Bestätigung fehlgeschlagen");
      setDate(data.profileVerifiedAt);
      showToast("Die Gruppenangaben wurden als aktuell bestätigt", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Bestätigung fehlgeschlagen", "error");
    } finally {
      setBusy(false);
    }
  };

  const report = () => {
    window.dispatchEvent(new CustomEvent("tribefinder:open-feedback", { detail: { initialMessage: `Die Angaben der Gruppe „${groupName}“ scheinen veraltet oder falsch zu sein.\n\nBetroffen ist:` } }));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
      <span>Angaben zuletzt bestätigt: {formatted}</span>
      {canManage ? <button type="button" onClick={verify} disabled={busy} className="text-[var(--link)] hover:underline disabled:opacity-50">{busy ? "Bestätige…" : "Angaben sind aktuell"}</button> : <button type="button" onClick={report} className="text-[var(--link)] hover:underline">Veraltete Angaben melden</button>}
    </div>
  );
}
