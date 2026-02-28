"use client";

import { useState } from "react";

export default function DanceStyleAliasSuggestionForm({ styleId, styleName }: { styleId: string; styleName: string }) {
  const [aliasName, setAliasName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  const submit = async () => {
    const nextAlias = aliasName.trim();
    if (!nextAlias) return;

    setIsSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/dance-style-alias-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aliasName: nextAlias,
          styleId,
          sourceUrl: sourceUrl.trim(),
          comment: comment.trim(),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setMessage(data?.message || "Fehler beim Speichern");
        return;
      }

      setAliasName("");
      setSourceUrl("");
      setComment("");
      setMessage(data?.message || `Alias-Vorschlag für ${styleName} gespeichert.`);
    } catch {
      setMessage("Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-[var(--muted)] space-y-2">
        <div>Du kannst alternative Namen (Synonyme) für diesen Tanzstil vorschlagen. Ein Admin prüft den Vorschlag.</div>
        <div>
          Unterschied: Bei <span className="font-medium">„Änderung vorschlagen“</span> änderst du die Inhalte dieses Tanzstils (Beschreibung/Links/Kategorie).
          Bei <span className="font-medium">„Alias vorschlagen“</span> fügst du nur einen zusätzlichen Such-/Auswahl-Namen hinzu, der auf diesen Tanzstil zeigt.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Alias / Synonym</label>
          <input
            type="text"
            value={aliasName}
            onChange={(e) => setAliasName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm px-3 py-2"
            placeholder='z.B. "ATS"'
            disabled={isSaving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Quelle (optional)</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm px-3 py-2"
            placeholder="https://..."
            disabled={isSaving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Kommentar (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] sm:text-sm px-3 py-2"
            disabled={isSaving}
          />
        </div>
      </div>

      {message ? <div className="text-sm text-[var(--foreground)]">{message}</div> : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isSaving || !aliasName.trim()}
          className="px-4 py-2 rounded-md text-sm font-medium border border-[var(--border)] bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50"
        >
          {isSaving ? "Speichere..." : "Alias vorschlagen"}
        </button>
      </div>
    </div>
  );
}
