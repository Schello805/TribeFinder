"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";

export default function SubmitLinkForm() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = status === "authenticated" && url.trim().length > 0 && title.trim().length > 0;

  const submit = async () => {
    if (!session?.user) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          title,
          category: category.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          city: city.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        showToast(data.message || "Konnte nicht gespeichert werden", "error");
        return;
      }
      setUrl("");
      setTitle("");
      setCategory("");
      setPostalCode("");
      setCity("");
      showToast("Danke! Dein Link wurde zur Prüfung eingereicht.", "success");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
      <div className="tf-display text-lg font-semibold text-[var(--foreground)]">Link vorschlagen</div>
      {status !== "authenticated" ? (
        <div className="text-sm text-[var(--muted)]">Bitte logge dich ein, um Links vorzuschlagen.</div>
      ) : null}

      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Titel</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name der Website"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Kategorie (optional)</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="z.B. Tanzschule"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">PLZ (optional)</label>
            <input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="12345"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">Ort (optional)</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value.replace(/[^\p{L}\s\-.'’]/gu, "").slice(0, 80))}
              placeholder="Berlin"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)]"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canSubmit || isSaving}
          onClick={submit}
          className={`tf-gothic-btn inline-flex items-center rounded-full px-4 py-2 text-sm font-medium border transition ${
            canSubmit && !isSaving
              ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]"
              : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)] cursor-not-allowed"
          }`}
        >
          {isSaving ? "Senden..." : "Vorschlag senden"}
        </button>
      </div>

      <div className="text-xs text-[var(--muted)]">
        Hinweis: Links werden vor Veröffentlichung geprüft. Websites werden automatisch regelmäßig auf Erreichbarkeit geprüft.
      </div>
    </div>
  );
}
