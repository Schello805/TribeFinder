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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Antwort</label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        placeholder="Deine Nachricht…"
      />
      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={isLoading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? "Wird gesendet…" : "Antwort senden"}
        </button>
      </div>
    </div>
  );
}
