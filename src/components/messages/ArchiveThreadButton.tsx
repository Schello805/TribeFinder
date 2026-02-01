"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function ArchiveThreadButton(props: { threadId: string; initialArchived: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [archived, setArchived] = useState(props.initialArchived);

  const toggle = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/messages/threads/${props.threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !archived }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.message || "Konnte nicht archivieren", "error");
        return;
      }
      const next = !archived;
      setArchived(next);
      window.dispatchEvent(new Event("tribefinder:messages-read"));
      showToast(next ? "Archiviert" : "Wiederhergestellt", "success");
      if (next) router.push("/messages?archived=1");
      else router.push("/messages");
      router.refresh();
    } catch {
      showToast("Konnte nicht archivieren", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="text-sm px-3 py-1.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
    >
      {archived ? "Entarchivieren" : "Archivieren"}
    </button>
  );
}
