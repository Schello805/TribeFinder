"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type DuplicateResponse = {
  id: string;
  groupId: string | null;
};

export default function DuplicateEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const onDuplicate = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/duplicate`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as DuplicateResponse | null;
      if (!res.ok || !data?.id) {
        showToast((data as unknown as { message?: string })?.message || "Duplizieren fehlgeschlagen", "error");
        return;
      }

      showToast("Duplikat erstellt", "success");
      const target = data.groupId ? `/groups/${data.groupId}/events/${data.id}/edit` : `/events/${data.id}/edit`;
      router.push(target);
    } catch {
      showToast("Duplizieren fehlgeschlagen", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onDuplicate()}
      disabled={busy}
      className="inline-flex items-center rounded-md bg-[var(--surface)] px-3 py-2 text-base font-semibold text-[var(--foreground)] shadow-sm hover:bg-[var(--surface-hover)] disabled:opacity-50 border border-[var(--border)]"
    >
      {busy ? "Dupliziere…" : "Duplizieren"}
    </button>
  );
}
