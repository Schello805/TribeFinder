"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";

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

type ListingDTO = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: Category;
  listingType: ListingType;
  postalCode: string | null;
  city: string | null;
  priceCents: number | null;
  priceType: PriceType;
  shippingAvailable: boolean;
  shippingCostCents: number | null;
  images: Array<{ url: string }>;
};

export default function EditMarketplaceListingPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const router = useRouter();
  const { showToast } = useToast();
  const { data: session, status } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>("");
  const [locationWarning, setLocationWarning] = useState<string>("");
  const locSeq = useRef(0);

  const [listing, setListing] = useState<ListingDTO | null>(null);

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

  const setPostalCodeSafe = (v: string) => {
    setPostalCode(v.replace(/\D/g, "").slice(0, 5));
  };

  const setCitySafe = (v: string) => {
    setCity(v.replace(/[^\p{L}\s\-.'’]/gu, "").slice(0, 80));
  };

  const setMoneySafe = (setter: (v: string) => void) => (v: string) => {
    setter(v.replace(/[^0-9,\.]/g, ""));
  };

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

  useEffect(() => {
    setLocationWarning("");
    const pc = postalCode.trim();
    const c = city.trim();
    if (!/^\d{5}$/.test(pc) || c.length < 2) return;

    const seqId = ++locSeq.current;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          format: "json",
          q: `${pc} ${c}, Deutschland`,
          limit: "1",
          countrycodes: "de",
          "accept-language": "de",
          addressdetails: "1",
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as Array<{
          address?: { postcode?: string; city?: string; town?: string; village?: string };
        }> | null;
        if (locSeq.current !== seqId) return;
        const first = data && data[0];
        const addr = first?.address;
        const apiPostcode = (addr?.postcode || "").trim();
        const apiCity = (addr?.city || addr?.town || addr?.village || "").trim();
        if (!apiPostcode && !apiCity) return;

        const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
        const pcMismatch = apiPostcode && apiPostcode !== pc;
        const cityMismatch = apiCity && norm(apiCity) !== norm(c);

        if (pcMismatch || cityMismatch) {
          setLocationWarning("Hinweis: PLZ und Ort passen möglicherweise nicht zusammen. Bitte überprüfe deine Eingabe.");
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }, 800);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [postalCode, city]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/marketplace/${encodeURIComponent(id)}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as ListingDTO & { message?: string };
        if (!res.ok) {
          showToast(data?.message || "Inserat konnte nicht geladen werden", "error");
          return;
        }
        if (cancelled) return;
        setListing(data);

        setTitle(data.title || "");
        setDescription(data.description || "");
        setCategory(data.category || "KOSTUEME");
        setListingType(data.listingType || "OFFER");
        setPostalCode(data.postalCode || "");
        setCity(data.city || "");
        setPriceType(data.priceType || "FIXED");
        setPriceEuro(typeof data.priceCents === "number" ? String((data.priceCents / 100).toFixed(2)).replace(".", ",") : "");
        setShippingAvailable(!!data.shippingAvailable);
        setShippingCostEuro(typeof data.shippingCostCents === "number" ? String((data.shippingCostCents / 100).toFixed(2)).replace(".", ",") : "");
        setImages((data.images || []).map((i) => ({ url: i.url })));
      } catch {
        showToast("Inserat konnte nicht geladen werden", "error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, showToast]);

  const canEdit = useMemo(() => {
    if (!listing) return false;
    if (!session?.user?.id) return false;
    if (session.user.role === "ADMIN") return true;
    return session.user.id === listing.ownerId;
  }, [listing, session?.user?.id, session?.user?.role]);

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
    setFormError("");
    setFieldErrors({});

    if (status !== "authenticated") {
      showToast("Bitte zuerst einloggen, um ein Inserat zu bearbeiten", "error");
      router.push("/auth/signin");
      return;
    }

    if (!listing) {
      showToast("Inserat konnte nicht geladen werden", "error");
      return;
    }

    if (!canEdit) {
      showToast("Du darfst dieses Inserat nicht bearbeiten", "error");
      return;
    }

    const nextErrors: Record<string, string> = {};
    if (title.trim().length < 2) nextErrors.title = "Bitte einen Titel eingeben";
    if (!/^\d{5}$/.test(postalCode.trim())) nextErrors.postalCode = "Bitte eine gültige PLZ (5 Ziffern) angeben";
    if (city.trim().length < 2) nextErrors.city = "Bitte einen Ort angeben";
    if (description.trim().length < 10) nextErrors.description = "Bitte eine Beschreibung eingeben";
    if (typeof priceCents !== "number") nextErrors.priceCents = "Bitte einen gültigen Preis angeben";
    if (shippingAvailable && (shippingCostCents === null || typeof shippingCostCents !== "number")) {
      nextErrors.shippingCostCents = "Bitte Versandkosten angeben";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      showToast("Bitte Pflichtfelder prüfen", "error");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/marketplace/${encodeURIComponent(id)}`, {
        method: "PUT",
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

      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        errors?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
      };

      if (!res.ok) {
        const apiFieldErrors = data?.errors?.fieldErrors;
        if (apiFieldErrors && typeof apiFieldErrors === "object") {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(apiFieldErrors)) {
            if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") mapped[k] = v[0];
          }
          if (Object.keys(mapped).length > 0) setFieldErrors(mapped);
        }
        const formErrors = Array.isArray(data?.errors?.formErrors) ? data.errors.formErrors.filter((x) => typeof x === "string") : [];
        if (formErrors.length > 0) setFormError(formErrors.join("\n"));
        showToast(data?.message || "Konnte Inserat nicht speichern", "error");
        return;
      }

      showToast("Inserat gespeichert", "success");
      router.push(`/marketplace/${id}`);
      router.refresh();
    } catch {
      showToast("Konnte Inserat nicht speichern", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-[var(--muted)]">Lade…</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-[var(--muted)]">Inserat nicht gefunden.</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="tf-display text-2xl font-bold text-[var(--foreground)]">Inserat bearbeiten</h1>
        <button
          type="button"
          onClick={() => router.push(`/marketplace/${id}`)}
          className="px-4 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition"
        >
          Zurück
        </button>
      </div>

      {!canEdit ? (
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4 text-sm text-[var(--foreground)]">
          Du kannst dieses Inserat ansehen, aber nicht bearbeiten.
        </div>
      ) : null}

      {formError ? (
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-4 text-sm text-red-700 whitespace-pre-wrap">
          {formError}
        </div>
      ) : null}

      {locationWarning ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-900">
          {locationWarning}
        </div>
      ) : null}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Typ <span className="text-red-600">*</span>
          </label>
          <select
            value={listingType}
            onChange={(e) => setListingType(e.target.value as ListingType)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            disabled={!canEdit}
          >
            <option value="OFFER">Ich biete</option>
            <option value="REQUEST">Ich suche</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Titel <span className="text-red-600">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            placeholder="z.B. Tribal-Fusion Kostüm (Gr. M)"
            disabled={!canEdit}
          />
          {fieldErrors.title ? <div className="mt-1 text-xs text-red-700">{fieldErrors.title}</div> : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">
              PLZ <span className="text-red-600">*</span>
            </label>
            <input
              value={postalCode}
              onChange={(e) => setPostalCodeSafe(e.target.value)}
              inputMode="numeric"
              pattern="\\d{5}"
              className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
              placeholder="z.B. 10115"
              disabled={!canEdit}
            />
            {fieldErrors.postalCode ? <div className="mt-1 text-xs text-red-700">{fieldErrors.postalCode}</div> : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Ort <span className="text-red-600">*</span>
            </label>
            <input
              value={city}
              onChange={(e) => setCitySafe(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
              placeholder="z.B. Berlin"
              disabled={!canEdit}
            />
            {fieldErrors.city ? <div className="mt-1 text-xs text-red-700">{fieldErrors.city}</div> : null}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Kategorie <span className="text-red-600">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            disabled={!canEdit}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Preis <span className="text-red-600">*</span>
          </label>
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={priceType}
              onChange={(e) => setPriceType(e.target.value as PriceType)}
              className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
              disabled={!canEdit}
            >
              <option value="FIXED">Festpreis</option>
              <option value="NEGOTIABLE">Verhandlungsbasis (VB)</option>
            </select>
            <input
              value={priceEuro}
              onChange={(e) => setMoneySafe(setPriceEuro)(e.target.value)}
              inputMode="decimal"
              className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
              placeholder="z.B. 25,00"
              disabled={!canEdit}
            />
          </div>
          {fieldErrors.priceCents ? <div className="mt-1 text-xs text-red-700">{fieldErrors.priceCents}</div> : null}
        </div>

        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={shippingAvailable}
              onChange={(e) => setShippingAvailable(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
              disabled={!canEdit}
            />
            Versand möglich
          </label>
          {shippingAvailable ? (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)]">
                Versandkosten <span className="text-red-600">*</span>
              </label>
              <input
                value={shippingCostEuro}
                onChange={(e) => setMoneySafe(setShippingCostEuro)(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                placeholder="z.B. 5,49"
                disabled={!canEdit}
              />
              {fieldErrors.shippingCostCents ? <div className="mt-1 text-xs text-red-700">{fieldErrors.shippingCostCents}</div> : null}
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Beschreibung <span className="text-red-600">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={7}
            className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            placeholder="Zustand, Maße, Besonderheiten…"
            disabled={!canEdit}
          />
          {fieldErrors.description ? <div className="mt-1 text-xs text-red-700">{fieldErrors.description}</div> : null}
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <label className="block text-sm font-medium text-[var(--foreground)]">Bilder (max 5)</label>
            <div className="text-xs text-[var(--muted)]">{images.length}/5</div>
          </div>

          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img, idx) => (
              <div key={`${img.url}-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    title="Entfernen"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {canEdit && images.length < 5 ? (
            <label
              className={`mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] rounded-md hover:bg-[var(--surface-hover)] transition cursor-pointer text-sm font-medium ${
                isUploading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
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
            onClick={() => router.push(`/marketplace/${id}`)}
            className="px-4 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canEdit || isSaving || isUploading}
            className="px-4 py-2 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50 transition font-medium"
          >
            {isSaving ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
