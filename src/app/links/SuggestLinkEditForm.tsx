"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";

type CategoryItem = { id: string; name: string };

type Props = {
  link: {
    id: string;
    url: string;
    title: string;
    category: string | null;
    postalCode: string | null;
    city: string | null;
  };
};

export default function SuggestLinkEditForm({ link }: Props) {
  const { data: session, status } = useSession();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [url, setUrl] = useState(link.url);
  const [title, setTitle] = useState(link.title);
  const [category, setCategory] = useState(link.category || "");
  const [postalCode, setPostalCode] = useState(link.postalCode || "");
  const [city, setCity] = useState(link.city || "");

  useEffect(() => {
    let alive = true;
    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const res = await fetch("/api/link-categories", { cache: "no-store" });
        const data = (await res.json().catch(() => [])) as unknown;
        if (!alive) return;
        setCategories(Array.isArray(data) ? (data as CategoryItem[]) : []);
      } catch {
        if (!alive) return;
        setCategories([]);
      } finally {
        if (!alive) return;
        setIsLoadingCategories(false);
      }
    };

    void loadCategories();
    return () => {
      alive = false;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return status === "authenticated" && url.trim().length > 0 && title.trim().length > 0;
  }, [status, title, url]);

  const submit = async () => {
    if (!session?.user?.id) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/link-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkId: link.id,
          url: url.trim(),
          title: title.trim(),
          category: category.trim() || null,
          postalCode: postalCode.trim() || null,
          city: city.trim() || null,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        showToast(data.message || "Konnte nicht gespeichert werden", "error");
        return;
      }

      showToast("Danke! Dein Änderungsvorschlag wurde eingereicht.", "success");
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="text-xs text-indigo-600 dark:text-indigo-300 hover:underline"
      >
        Änderung vorschlagen
      </button>

      {isOpen ? (
        <div className="mt-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3 space-y-2">
          {status !== "authenticated" ? (
            <div className="text-xs text-[var(--muted)]">Bitte logge dich ein, um Änderungen vorzuschlagen.</div>
          ) : null}

          <div className="grid grid-cols-1 gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] appearance-none"
                disabled={isLoadingCategories}
              >
                <option value="">Keine Kategorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="PLZ"
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ort"
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canSubmit || isSaving}
              onClick={() => void submit()}
              className={`tf-gothic-btn inline-flex items-center rounded-full px-4 py-2 text-sm font-medium border transition ${
                canSubmit && !isSaving
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]"
                  : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] cursor-not-allowed"
              }`}
            >
              {isSaving ? "Senden..." : "Vorschlag senden"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
