"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function ReplyBox({ threadId }: { threadId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const submit = async () => {
    if (!content.trim()) {
      showToast("Bitte eine Nachricht eingeben", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/messages/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data?.message || "Konnte Nachricht nicht senden", "error");
        return;
      }

      setContent("");
      router.refresh();
    } catch {
      showToast("Konnte Nachricht nicht senden", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-xl border border-[var(--border)] p-6 space-y-3">
      <label className="block text-sm font-medium text-[var(--foreground)]">Antwort</label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        placeholder="Deine Nachricht…"
      />
      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={isLoading}
          className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-md hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50 transition"
        >
          {isLoading ? "Wird gesendet…" : "Antwort senden"}
        </button>
      </div>
    </div>
  );
}
