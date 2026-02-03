"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { GroupFormData } from "@/lib/validations/group";
import TagInput from "@/components/ui/TagInput";

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import("@/components/map/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-[var(--surface-2)] animate-pulse rounded-md border border-[var(--border)] text-[var(--muted)] flex items-center justify-center">Karte wird geladen...</div>
});

interface GroupFormProps {
  initialData?: (Partial<GroupFormData> & {
    id?: string;
    location?: { lat: number; lng: number; address?: string | null } | null;
    tags?: Array<{ name: string } | string>;
  });
  isEditing?: boolean;
  isOwner?: boolean;
  canDelete?: boolean;
}

export default function GroupForm({ initialData, isEditing = false, isOwner = false, canDelete = false }: GroupFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [pendingHeaderFile, setPendingHeaderFile] = useState<File | null>(null);
  const [pendingHeaderPreviewUrl, setPendingHeaderPreviewUrl] = useState<string | null>(null);

  const groupId = initialData?.id;

  const initialTags: Array<string | { name: string }> = initialData?.tags ?? [];
  
  const [formData, setFormData] = useState<GroupFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    website: initialData?.website || "",
    contactEmail: initialData?.contactEmail || "",
    videoUrl: initialData?.videoUrl || "",
    size: initialData?.size || "SMALL",
    image: initialData?.image || "",
    headerImage: initialData?.headerImage || "",
    headerImageFocusY: typeof initialData?.headerImageFocusY === "number" ? initialData.headerImageFocusY : 50,
    headerGradientFrom: initialData?.headerGradientFrom || "",
    headerGradientTo: initialData?.headerGradientTo || "",
    
    trainingTime: initialData?.trainingTime || "",
    performances: initialData?.performances || false,
    foundingYear: initialData?.foundingYear || undefined,
    seekingMembers: initialData?.seekingMembers || false,

    location: initialData?.location ? {
      lat: initialData.location.lat,
      lng: initialData.location.lng,
      address: initialData.location.address || "",
    } : undefined,
    tags: initialTags.map((t) => (typeof t === 'string' ? t : t.name)), 
  });

  void isOwner;
  void canDelete;

  const handleDelete = async () => {
    if (!isEditing || !groupId) {
      setError("Fehlende Gruppen-ID");
      return;
    }

    const ok = window.confirm("Gruppe wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.");
    if (!ok) return;

    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Fehler beim Löschen der Gruppe");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-add https:// to URLs if missing
  const normalizeUrl = (url: string): string => {
    if (!url) return url;
    const trimmed = url.trim();
    if (trimmed && !trimmed.match(/^https?:\/\//i)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Normalize URL on blur (when user leaves the field)
  const handleUrlBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value) {
      setFormData(prev => ({ ...prev, [name]: normalizeUrl(value) }));
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        lat,
        lng,
        address: prev.location?.address || "" 
      }
    }));
  };
  
  const geocodeAddress = async () => {
    if (!formData.location?.address) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.location.address)}&limit=1`, {
        headers: {
          "User-Agent": "DanceConnect/1.0"
        }
      });
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        
        setFormData(prev => ({
          ...prev,
          location: {
            address: prev.location?.address,
            lat: lat,
            lng: lon
          }
        }));
      } else {
        setError("Adresse konnte nicht gefunden werden.");
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      setError("Fehler bei der Adresssuche.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setFormData(prev => ({
      ...prev,
      location: {
        lat: prev.location?.lat || 51.1657, // Default fallback
        lng: prev.location?.lng || 10.4515,
        address: address
      }
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload fehlgeschlagen');

      const data = await res.json();
      setFormData(prev => ({ ...prev, image: data.url }));
    } catch (err) {
      console.error(err);
      setError('Fehler beim Bild-Upload');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHeaderFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pendingHeaderPreviewUrl) {
      URL.revokeObjectURL(pendingHeaderPreviewUrl);
    }
    setPendingHeaderFile(file);
    const url = URL.createObjectURL(file);
    setPendingHeaderPreviewUrl(url);
    setFormData(prev => ({ ...prev, headerImageFocusY: typeof prev.headerImageFocusY === "number" ? prev.headerImageFocusY : 50 }));
  };

  const headerPreviewObjectPosition = useMemo(() => {
    const y = typeof formData.headerImageFocusY === "number" ? formData.headerImageFocusY : 50;
    return `50% ${y}%`;
  }, [formData.headerImageFocusY]);

  const uploadPendingHeader = async () => {
    if (!pendingHeaderFile) return;

    const body = new FormData();
    body.append('file', pendingHeaderFile);
    const focusY = typeof formData.headerImageFocusY === "number" ? String(formData.headerImageFocusY) : "50";
    body.append('focusY', focusY);

    try {
      setIsLoading(true);
      const res = await fetch('/api/upload/banner', {
        method: 'POST',
        body,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Upload fehlgeschlagen');

      setFormData(prev => ({ ...prev, headerImage: data.url }));
      setPendingHeaderFile(null);
      if (pendingHeaderPreviewUrl) {
        URL.revokeObjectURL(pendingHeaderPreviewUrl);
      }
      setPendingHeaderPreviewUrl(null);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Banner-Upload');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setFieldErrors({});

    try {
      if (isEditing && !groupId) {
        throw new Error("Fehlende Gruppen-ID");
      }

      const url = isEditing ? `/api/groups/${groupId}` : "/api/groups";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          // Handle Zod errors
          const errors: Record<string, string> = {};
          (data.errors as Array<{ path: Array<string | number>; message: string }>).forEach((err) => {
            const path = err.path.join(".");
            errors[path] = err.message;
          });
          setFieldErrors(errors);
          throw new Error("Bitte überprüfe die Eingaben.");
        }
        const errorMessage = data.details ? `${data.message}: ${data.details}` : (data.message || "Fehler beim Speichern");
        throw new Error(errorMessage);
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-[var(--surface)] text-[var(--foreground)] p-6 rounded-lg shadow transition-colors border border-[var(--border)]">
      {error && (
        <div className="bg-[var(--surface-2)] border border-[var(--border)] text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-[var(--surface-2)] p-4 rounded-md border border-[var(--border)]">
        <label className="block text-sm font-medium text-[var(--foreground)]">Header / Banner</label>
        <p className="mt-1 text-xs text-[var(--muted)]">Banner wird automatisch auf 1200×300 zugeschnitten.</p>

        <div className="mt-3 flex flex-col sm:flex-row gap-4 sm:items-center">
          {(pendingHeaderPreviewUrl || formData.headerImage) ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingHeaderPreviewUrl || formData.headerImage}
                alt="Banner Vorschau"
                className="h-16 w-64 object-cover rounded-md border border-[var(--border)]"
                style={pendingHeaderPreviewUrl ? { objectPosition: headerPreviewObjectPosition } : undefined}
              />
            </>
          ) : (
            <div className="h-16 w-64 rounded-md border border-dashed border-[var(--border)] flex items-center justify-center text-xs text-[var(--muted)]">
              Kein Banner gesetzt
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleHeaderFileSelect}
            className="block w-full text-sm text-[var(--foreground)]
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-[var(--surface)] file:text-[var(--foreground)]
              file:border file:border-[var(--border)]
              hover:file:bg-[var(--surface-hover)]"
          />
        </div>

        {pendingHeaderPreviewUrl ? (
          <div className="mt-4">
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Ausschnitt (oben/unten)</label>
            <input
              type="range"
              min={0}
              max={100}
              value={typeof formData.headerImageFocusY === "number" ? formData.headerImageFocusY : 50}
              onChange={(e) => setFormData(prev => ({ ...prev, headerImageFocusY: Number(e.target.value) }))}
              className="w-full"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={uploadPendingHeader}
                disabled={isLoading}
                className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-[var(--primary-foreground)] bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50"
              >
                {isLoading ? "Lade hoch..." : "Banner übernehmen"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Gradient von</label>
            <input
              type="color"
              value={formData.headerGradientFrom || "#6366f1"}
              onChange={(e) => setFormData(prev => ({ ...prev, headerGradientFrom: e.target.value }))}
              className="h-10 w-full rounded border border-[var(--border)] bg-[var(--surface)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Gradient zu</label>
            <input
              type="color"
              value={formData.headerGradientTo || "#ec4899"}
              onChange={(e) => setFormData(prev => ({ ...prev, headerGradientTo: e.target.value }))}
              className="h-10 w-full rounded border border-[var(--border)] bg-[var(--surface)]"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Bild / Logo</label>
        <div className="mt-1 flex items-center gap-4">
          {formData.image && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={formData.image} alt="Vorschau" className="h-20 w-20 object-cover rounded-md border border-[var(--border)]" />
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-sm text-[var(--foreground)]
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-[var(--surface)] file:text-[var(--foreground)]
              file:border file:border-[var(--border)]
              hover:file:bg-[var(--surface-hover)]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Name der Gruppe</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className={`mt-1 block w-full rounded-md border ${fieldErrors.name ? 'border-red-500' : 'border-[var(--border)]'} px-3 py-2 shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-[var(--primary)] text-[var(--foreground)] bg-[var(--surface)] placeholder:text-[var(--muted)]`}
          placeholder="z.B. Amaya Luna"
        />
        {fieldErrors.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Beschreibung</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          required
          className={`mt-1 block w-full rounded-md border ${fieldErrors.description ? 'border-red-500' : 'border-[var(--border)]'} px-3 py-2 shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-[var(--primary)] text-[var(--foreground)] bg-[var(--surface)] placeholder:text-[var(--muted)]`}
          placeholder="Beschreibe deine Gruppe..."
        />
        {fieldErrors.description && <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p>}
        <p className="mt-1 text-xs text-[var(--muted)]">Mindestens 10 Zeichen.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Gruppengröße</label>
          <div className="relative">
            <select
              name="size"
              value={formData.size}
              onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value as "SOLO" | "DUO" | "TRIO" | "SMALL" | "LARGE" }))}
              className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-[var(--primary)] text-[var(--foreground)] bg-[var(--surface)] appearance-none pr-10"
            >
              <option value="SOLO">Solo (1 Person)</option>
              <option value="DUO">Duo (2 Personen)</option>
              <option value="TRIO">Trio (3 Personen)</option>
              <option value="SMALL">Kleine Gruppe (4-10)</option>
              <option value="LARGE">Große Gruppe (&gt; 10)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 pt-1 text-[var(--muted)]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Gründungsjahr (Optional)</label>
          <input
            type="number"
            name="foundingYear"
            value={formData.foundingYear || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, foundingYear: e.target.value ? parseInt(e.target.value) : null }))}
            min="1900"
            max={new Date().getFullYear()}
            className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-[var(--primary)] text-[var(--foreground)] bg-[var(--surface)] placeholder:text-[var(--muted)]"
            placeholder="z.B. 2015"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Trainingszeiten (Optional)</label>
        <input
          type="text"
          name="trainingTime"
          value={formData.trainingTime || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-[var(--border)] px-3 py-2 shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-[var(--primary)] text-[var(--foreground)] bg-[var(--surface)] placeholder:text-[var(--muted)]"
          placeholder="z.B. Montags 18:00 - 20:00 Uhr"
        />
        <p className="mt-1 text-xs text-[var(--muted)]">Gib an, wann und wie oft ihr trainiert.</p>
      </div>

      <div className="flex flex-col gap-4 bg-[var(--surface-2)] p-4 rounded-md border border-[var(--border)]">
        <div className="flex items-center">
          <input
            id="seekingMembers"
            name="seekingMembers"
            type="checkbox"
            checked={formData.seekingMembers}
            onChange={(e) => setFormData(prev => ({ ...prev, seekingMembers: e.target.checked }))}
            className="h-4 w-4 text-[var(--primary)] focus:ring-[var(--primary)] border-[var(--border)] rounded"
          />
          <label htmlFor="seekingMembers" className="ml-2 block text-sm text-[var(--foreground)]">
            Wir suchen aktuell neue Mitglieder
          </label>
        </div>

        <div className="flex items-center">
          <input
            id="performances"
            name="performances"
            type="checkbox"
            checked={formData.performances}
            onChange={(e) => setFormData(prev => ({ ...prev, performances: e.target.checked }))}
            className="h-4 w-4 text-[var(--primary)] focus:ring-[var(--primary)] border-[var(--border)] rounded"
          />
          <label htmlFor="performances" className="ml-2 block text-sm text-[var(--foreground)]">
            Auftrittsanfragen erwünscht
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Video URL (YouTube)</label>
          <input
            type="url"
            name="videoUrl"
            value={formData.videoUrl}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border ${fieldErrors.videoUrl ? 'border-red-500' : 'border-[var(--border)]'} px-3 py-2 shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-[var(--primary)] text-[var(--foreground)] bg-[var(--surface)] placeholder:text-[var(--muted)]`}
            placeholder="https://youtube.com/..."
          />
          {fieldErrors.videoUrl && <p className="mt-1 text-sm text-red-600">{fieldErrors.videoUrl}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Webseite (Optional)</label>
          <input
            type="text"
            name="website"
            value={formData.website}
            onChange={handleChange}
            onBlur={handleUrlBlur}
            className={`mt-1 block w-full rounded-md border ${fieldErrors.website ? 'border-red-500' : 'border-[var(--border)]'} px-3 py-2 shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-[var(--primary)] text-[var(--foreground)] bg-[var(--surface)] placeholder:text-[var(--muted)]`}
            placeholder="www.beispiel.de"
          />
          {fieldErrors.website && <p className="mt-1 text-sm text-red-600">{fieldErrors.website}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">Kontakt E-Mail (Optional)</label>
          <input
            type="email"
            name="contactEmail"
            value={formData.contactEmail}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border ${fieldErrors.contactEmail ? 'border-red-500' : 'border-[var(--border)]'} px-3 py-2 shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-[var(--primary)] text-[var(--foreground)] bg-[var(--surface)] placeholder:text-[var(--muted)]`}
            placeholder="info@..."
          />
          {fieldErrors.contactEmail && <p className="mt-1 text-sm text-red-600">{fieldErrors.contactEmail}</p>}
        </div>
      </div>

      <div className="bg-[var(--surface-2)] p-4 rounded-md border border-[var(--border)]">
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Trainingsort</label>
        <p className="text-xs text-[var(--muted)] mb-3">Der Trainingsort wird in der Gruppenansicht unter den Trainingszeiten angezeigt und auf der Karte genutzt.</p>
        
        <div className="flex gap-2 mb-4">
          <input 
            type="text" 
            value={formData.location?.address || ""} 
            onChange={handleAddressChange}
            placeholder="Straße, PLZ, Stadt eingeben..." 
            className="block w-full rounded-md border border-[var(--border)] px-3 py-2 shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-[var(--primary)] text-[var(--foreground)] bg-[var(--surface)] placeholder:text-[var(--muted)]"
          />
          <button 
            type="button"
            onClick={geocodeAddress}
            disabled={!formData.location?.address || isLoading}
            className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-md hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition disabled:opacity-50 whitespace-nowrap"
          >
            Suchen
          </button>
        </div>

        <div className="mb-2">
           <p className="text-sm text-[var(--muted)] mb-2">Oder auf der Karte wählen:</p>
           <LocationPicker 
             initialLat={formData.location?.lat}
             initialLng={formData.location?.lng}
             onLocationSelect={handleLocationSelect} 
           />
        </div>
        
        {formData.location && (
          <div className="mt-2 text-sm text-[var(--muted)] flex justify-between">
            <span>Koordinaten: {formData.location.lat.toFixed(4)}, {formData.location.lng.toFixed(4)}</span>
            {formData.location.lat === 51.1657 && formData.location.lng === 10.4515 && (
               <span className="text-orange-600 font-medium">Bitte genauen Standort wählen!</span>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Tanzstile / Tags</label>
        <TagInput 
          selectedTags={formData.tags || []} 
          onChange={(tags) => setFormData(prev => ({ ...prev, tags }))} 
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="mr-3 px-4 py-2 border border-[var(--border)] rounded-md shadow-sm text-sm font-medium text-[var(--foreground)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          Abbrechen
        </button>

        {isEditing && canDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="mr-3 px-4 py-2 border border-[var(--border)] rounded-md shadow-sm text-sm font-medium text-red-700 bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            Gruppe löschen
          </button>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-[var(--primary-foreground)] bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
        >
          {isLoading ? "Speichere..." : (isEditing ? "Aktualisieren" : "Erstellen")}
        </button>
      </div>
    </form>
  );
}
