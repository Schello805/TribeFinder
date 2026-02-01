"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function NewMessagePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { showToast } = useToast();

  const groupId = useMemo(() => params.get("groupId") || "", [params]);

  const [subject, setSubject] = useState("");
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
        body: JSON.stringify({ subject: subject.trim() || undefined, content }),
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nachricht an Gruppe</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Betreff (optional)</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            placeholder="z.B. Auftritt / Training / Frage"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Nachricht</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="mt-1 w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            placeholder="Schreib kurz, worum es geht…"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={submit}
            disabled={isLoading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? "Wird gesendet…" : "Senden"}
          </button>
          <button
            onClick={() => router.back()}
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
