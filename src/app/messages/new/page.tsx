"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function NewMessagePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { showToast } = useToast();

  const groupId = useMemo(() => params.get("groupId") || "", [params]);

  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const submit = async () => {
    if (!groupId) {
      showToast("Gruppe fehlt", "error");
      return;
    }
    if (!content.trim()) {
      showToast("Bitte eine Nachricht eingeben", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.message || "Konnte Nachricht nicht senden", "error");
        return;
      }

      if (data?.threadId) {
        router.push(`/messages/threads/${data.threadId}`);
        router.refresh();
        return;
      }

      showToast("Nachricht gesendet", "success");
      router.push("/messages");
      router.refresh();
    } catch {
      showToast("Konnte Nachricht nicht senden", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="tf-display text-2xl font-bold text-[var(--foreground)]">Nachricht an Gruppe</h1>

      <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-xl border border-[var(--border)] p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Nachricht</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            placeholder="Schreib kurz, worum es geht…"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={submit}
            disabled={isLoading}
            className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-md hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50 transition"
          >
            {isLoading ? "Wird gesendet…" : "Senden"}
          </button>
          <button
            onClick={() => router.back()}
            className="bg-[var(--surface)] text-[var(--foreground)] px-4 py-2 rounded-md border border-[var(--border)] hover:bg-[var(--surface-hover)] transition"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
