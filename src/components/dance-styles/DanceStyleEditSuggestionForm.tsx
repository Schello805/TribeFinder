"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";

const CATEGORY_OPTIONS = ["Oriental", "Tribal", "Fusion", "Folklore", "Modern", "Sonstiges"] as const;

type Props = {
  styleId: string;
  styleName: string;
  initialCategory: string | null;
  initialFormerName: string | null;
  initialWebsiteUrl: string | null;
  initialVideoUrl: string | null;
  initialDescription: string | null;
};

export default function DanceStyleEditSuggestionForm(props: Props) {
  const { showToast } = useToast();
  const { data: session } = useSession();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [category, setCategory] = useState<string>(props.initialCategory ?? "");
  const [formerName, setFormerName] = useState(props.initialFormerName ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(props.initialWebsiteUrl ?? "");
  const [videoUrl, setVideoUrl] = useState(props.initialVideoUrl ?? "");
  const [description, setDescription] = useState(props.initialDescription ?? "");

  const submit = async () => {
    if (!session?.user?.id) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/dance-style-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: props.styleName,
          styleId: props.styleId,
          category: category.trim() || null,
          formerName: formerName.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
          videoUrl: videoUrl.trim() || null,
          description: description.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.message || data?.error || "Konnte Vorschlag nicht speichern", "error");
        return;
      }

      showToast("Danke! Änderungsvorschlag wurde eingereicht (wird vom Admin geprüft).", "success");
    } catch {
      showToast("Konnte Vorschlag nicht speichern", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session?.user?.id) {
    return (
      <div className="text-sm text-[var(--muted)]">
        Bitte <Link href="/auth/signin" className="text-[var(--link)] hover:underline">einloggen</Link>, um Änderungen vorzuschlagen.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Name</label>
        <input
          value={props.styleName}
          disabled
          className="mt-1 block w-full min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <label className="block text-sm font-medium text-[var(--foreground)]">Video-Link (optional)</label>
        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
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
          placeholder="Was sollte ergänzt/verbessert werden?"
          disabled={isSubmitting}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-[var(--primary)] py-2 px-4 text-sm font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50"
        >
          Änderung vorschlagen
        </button>
      </div>

      <div className="text-xs text-[var(--muted)]">Vorschläge werden erst nach Prüfung durch einen Admin übernommen.</div>
    </div>
  );
}
