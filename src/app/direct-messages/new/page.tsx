"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";

export default function NewDirectMessagePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { showToast } = useToast();
  const { status } = useSession();

  const receiverId = useMemo(() => params.get("receiverId") || "", [params]);
  const listingId = useMemo(() => params.get("listingId") || "", [params]);

  const [content, setContent] = useState(listingId ? `Hallo! Ich interessiere mich für dein Inserat: /marketplace/${listingId}\n\n` : "");
  const [isLoading, setIsLoading] = useState(false);

  const submit = async () => {
    if (status !== "authenticated") {
      router.replace("/auth/signin");
      return;
    }
    if (!receiverId) {
      showToast("Empfänger fehlt", "error");
      return;
    }
    if (!content.trim()) {
      showToast("Bitte eine Nachricht eingeben", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/direct-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, content }),
      });

      const data = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) {
        const msg =
          data && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string"
            ? String((data as { message?: unknown }).message)
            : "Konnte Nachricht nicht senden";
        showToast(msg, "error");
        return;
      }

      showToast("Nachricht gesendet", "success");
      router.push(`/direct-messages/${receiverId}`);
      router.refresh();
    } catch {
      showToast("Konnte Nachricht nicht senden", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="tf-display text-2xl font-bold text-[var(--foreground)]">Direktnachricht</h1>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Nachricht</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            placeholder="Schreib eine Nachricht…"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void submit()}
            className="px-4 py-2 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50 transition font-medium"
          >
            {isLoading ? "Senden…" : "Senden"}
          </button>
        </div>
      </div>
    </div>
  );
}
