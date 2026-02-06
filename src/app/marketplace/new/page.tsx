"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

const categories = [
  { value: "KOSTUEME", label: "Kostüme" },
  { value: "SCHMUCK", label: "Schmuck" },
  { value: "ACCESSOIRES", label: "Accessoires" },
  { value: "SCHUHE", label: "Schuhe" },
  { value: "SONSTIGES", label: "Sonstiges" },
] as const;

type Category = (typeof categories)[number]["value"];

type UploadedImage = { url: string };

type ListingType = "OFFER" | "REQUEST";
type PriceType = "FIXED" | "NEGOTIABLE";

export default function NewMarketplaceListingPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("KOSTUEME");

  const [listingType, setListingType] = useState<ListingType>("OFFER");

  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  const [priceType, setPriceType] = useState<PriceType>("FIXED");
  const [priceEuro, setPriceEuro] = useState<string>("");

  const [shippingAvailable, setShippingAvailable] = useState(false);
  const [shippingCostEuro, setShippingCostEuro] = useState<string>("");
  const [images, setImages] = useState<UploadedImage[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const priceCents = useMemo(() => {
    const raw = priceEuro.trim().replace(",", ".");
    if (!raw) return null;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) return null;
    return Math.round(num * 100);
  }, [priceEuro]);

  const shippingCostCents = useMemo(() => {
    const raw = shippingCostEuro.trim().replace(",", ".");
    if (!raw) return null;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) return null;
    return Math.round(num * 100);
  }, [shippingCostEuro]);

  const uploadOne = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      throw new Error(data?.error || "Upload fehlgeschlagen");
    }
    return data.url;
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files);

    if (images.length + picked.length > 5) {
      showToast("Maximal 5 Bilder pro Inserat", "error");
      return;
    }

    setIsUploading(true);
    try {
      const next: UploadedImage[] = [];
      for (const f of picked) {
        const url = await uploadOne(f);
        next.push({ url });
      }
      setImages((prev) => [...prev, ...next]);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Upload fehlgeschlagen", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (title.trim().length < 2) {
      showToast("Titel ist zu kurz", "error");
      return;
    }
    if (description.trim().length < 10) {
      showToast("Beschreibung ist zu kurz", "error");
      return;
    }

    if (postalCode.trim().length < 4 || city.trim().length < 2) {
      showToast("Bitte PLZ und Ort angeben", "error");
      return;
    }

    if (priceType === "NEGOTIABLE" && (priceCents === null || typeof priceCents !== "number")) {
      showToast("Bei Verhandlungsbasis ist ein Preis erforderlich", "error");
      return;
    }

    if (shippingAvailable && (shippingCostCents === null || typeof shippingCostCents !== "number")) {
      showToast("Bitte Versandkosten angeben", "error");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          listingType,
          postalCode: postalCode.trim(),
          city: city.trim(),
          priceType,
          priceCents,
          currency: "EUR",
          shippingAvailable,
          shippingCostCents: shippingAvailable ? shippingCostCents : null,
          images: images.map((i) => ({ url: i.url })),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok || !data.id) {
        showToast(data?.message || "Konnte Inserat nicht speichern", "error");
        return;
      }

      showToast("Inserat erstellt", "success");
      router.push(`/marketplace/${data.id}`);
      router.refresh();
    } catch {
      showToast("Konnte Inserat nicht speichern", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="tf-display text-2xl font-bold text-[var(--foreground)]">Inserat erstellen</h1>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Typ</label>
          <select
            value={listingType}
            onChange={(e) => setListingType(e.target.value as ListingType)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          >
            <option value="OFFER">Ich biete</option>
            <option value="REQUEST">Ich suche</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Titel</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            placeholder="z.B. Tribal-Fusion Kostüm (Gr. M)"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">PLZ</label>
            <input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
              placeholder="z.B. 10115"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">Ort</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
              placeholder="z.B. Berlin"
            />
          </div>
        </div>
        <div className="text-xs text-[var(--muted)]">
          Standort-Hinweis: Für Entfernungen nutzen wir deinen gespeicherten Profil-Standort (falls vorhanden). Andernfalls wird PLZ/Ort automatisch geocodiert.
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Kategorie</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Preis (optional)</label>
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={priceType}
              onChange={(e) => setPriceType(e.target.value as PriceType)}
              className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            >
              <option value="FIXED">Festpreis</option>
              <option value="NEGOTIABLE">Verhandlungsbasis (VB)</option>
            </select>
            <input
              value={priceEuro}
              onChange={(e) => setPriceEuro(e.target.value)}
              inputMode="decimal"
              className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
              placeholder="z.B. 25,00"
            />
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">Leer lassen für „Preis auf Anfrage“.</div>
        </div>

        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={shippingAvailable}
              onChange={(e) => setShippingAvailable(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            Versand möglich
          </label>
          {shippingAvailable ? (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">Versandkosten</label>
              <input
                value={shippingCostEuro}
                onChange={(e) => setShippingCostEuro(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                placeholder="z.B. 5,49"
              />
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Beschreibung</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={7}
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            placeholder="Zustand, Maße, Besonderheiten…"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <label className="block text-sm font-medium text-[var(--foreground)]">Bilder (max 5)</label>
            <div className="text-xs text-[var(--muted)]">{images.length}/5</div>
          </div>

          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img, idx) => (
              <div key={img.url} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  title="Entfernen"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {images.length < 5 ? (
            <label className={`mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] rounded-md hover:bg-[var(--surface-hover)] transition cursor-pointer text-sm font-medium ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => void onPickFiles(e.target.files)}
                disabled={isUploading}
              />
              {isUploading ? "Lade hoch…" : "📷 Bilder hinzufügen"}
            </label>
          ) : null}
          <div className="mt-2 text-xs text-[var(--muted)]">Upload ist auf 5MB pro Bild begrenzt (Server-Check).</div>
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
            onClick={() => void submit()}
            disabled={isSaving || isUploading}
            className="px-4 py-2 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50 transition font-medium"
          >
            {isSaving ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
