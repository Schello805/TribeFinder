"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

const CATEGORY_OPTIONS = ["Oriental", "Tribal", "Fusion", "Folklore", "Modern", "Sonstiges"] as const;

export default function DanceStyleSuggestionForm() {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [formerName, setFormerName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");

  const submit = async () => {
    const n = name.trim();
    if (!n) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/dance-style-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          category: category || null,
          formerName: formerName.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
          description: description.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.message || data?.error || "Konnte Vorschlag nicht speichern", "error");
        return;
      }

      setName("");
      setCategory("");
      setFormerName("");
      setWebsiteUrl("");
      setDescription("");
      showToast("Danke! Vorschlag wurde eingereicht (wird vom Admin geprüft).", "success");
    } catch {
      showToast("Konnte Vorschlag nicht speichern", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2"
            placeholder="z.B. ITS"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Kategorie (optional)</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 appearance-none"
            disabled={isSubmitting}
          >
            <option value="">Keine Kategorie</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Früherer Name (optional)</label>
          <input
            value={formerName}
            onChange={(e) => setFormerName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2"
            placeholder="z.B. ITS Unmata"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Offizielle Website (optional)</label>
        <input
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2"
          placeholder="https://…"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Kurzbeschreibung / Hinweis (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full min-h-[100px] rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2"
          placeholder="Wofür steht der Stil, ggf. Link/Info warum hinzufügen?"
          disabled={isSubmitting}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isSubmitting || !name.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-[var(--primary)] py-2 px-4 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50"
        >
          Vorschlag senden
        </button>
      </div>

      <div className="text-xs text-[var(--muted)]">
        Vorschläge werden erst nach Prüfung durch einen Admin in die Liste aufgenommen.
      </div>
    </div>
  );
}
