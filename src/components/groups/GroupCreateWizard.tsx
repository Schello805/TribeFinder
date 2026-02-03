"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import TagInput from "@/components/ui/TagInput";
import { useToast } from "@/components/ui/Toast";

const LocationPicker = dynamic(() => import("@/components/map/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-48 w-full bg-[var(--surface-2)] animate-pulse rounded-md flex items-center justify-center text-[var(--muted)]">
      Karte wird geladen...
    </div>
  )
});

interface FormData {
  name: string;
  description: string;
  size: "SOLO" | "DUO" | "TRIO" | "SMALL" | "LARGE";
  image?: string;
  website?: string;
  contactEmail?: string;
  videoUrl?: string;
  trainingTime?: string;
  performances: boolean;
  foundingYear?: number | null;
  seekingMembers: boolean;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  tags: string[];
}

type WizardStep = "basics" | "details";

const STEPS: { id: WizardStep; label: string; icon: string }[] = [
  { id: "basics", label: "Pflicht: Name & Ort", icon: "1" },
  { id: "details", label: "Optional & Erstellen", icon: "2" },
];

export default function GroupCreateWizard() {
  const router = useRouter();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState<WizardStep>("basics");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    size: "SMALL",
    performances: false,
    seekingMembers: false,
    tags: [],
  });

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const validateStep = (): boolean => {
    switch (currentStep) {
      case "basics":
        if (!formData.name.trim()) {
          setError("Bitte gib einen Namen für deine Gruppe ein.");
          return false;
        }
        if (formData.description.length < 10) {
          setError("Die Beschreibung muss mindestens 10 Zeichen lang sein.");
          return false;
        }
        if (!formData.location?.address || !formData.location.address.trim()) {
          setError("Bitte gib einen Trainingsort (Adresse oder Stadt/PLZ) ein.");
          return false;
        }
        if (!Number.isFinite(formData.location?.lat) || !Number.isFinite(formData.location?.lng)) {
          setError("Bitte wähle einen Standort auf der Karte oder nutze die Suche.");
          return false;
        }
        return true;
      case "details":
        return true; // All optional
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (!validateStep()) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      setIsLoading(true);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      if (!res.ok) throw new Error("Upload fehlgeschlagen");

      const data = await res.json();
      updateField("image", data.url);
    } catch {
      setError("Fehler beim Bild-Upload");
    } finally {
      setIsLoading(false);
    }
  };

  const geocodeAddress = async () => {
    if (!formData.location?.address) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          formData.location.address
        )}&limit=1`,
        { headers: { "User-Agent": "TribeFinder/1.0" } }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        updateField("location", {
          address: formData.location.address,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        });
      } else {
        setError("Adresse konnte nicht gefunden werden.");
      }
    } catch {
      setError("Fehler bei der Adresssuche.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Fehler beim Erstellen der Gruppe");
      }

      showToast("Gruppe erfolgreich erstellt!", "success");
      router.push(`/groups/${data.id}`);
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ein Fehler ist aufgetreten";
      setError(errorMessage);
      showToast(errorMessage, "error");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold text-sm transition-all ${
                  index < currentStepIndex
                    ? "bg-[var(--primary)] border-[var(--primary)] text-[var(--primary-foreground)]"
                    : index === currentStepIndex
                    ? "bg-[var(--surface)] border-[var(--primary)] text-[var(--link)]"
                    : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {index < currentStepIndex ? "✓" : step.icon}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-full h-1 mx-2 rounded ${
                    index < currentStepIndex
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--border)]"
                  }`}
                  style={{ width: "60px" }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((step) => (
            <span
              key={step.id}
              className={`text-xs font-medium ${
                step.id === currentStep
                  ? "text-[var(--link)]"
                  : "text-[var(--muted)]"
              }`}
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-[var(--surface-2)] border border-[var(--border)] text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-xl shadow-sm border border-[var(--border)] p-6 mb-6">
        {currentStep === "basics" && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="tf-display text-xl font-bold text-[var(--foreground)]">
                Pflichtfelder
              </h2>
              <p className="text-[var(--muted)] text-sm mt-1">
                Name, Beschreibung und Trainingsort sind Pflicht. Alles andere kommt im nächsten Schritt.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Name der Gruppe *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="z.B. Amaya Luna"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Beschreibung *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="Erzähle etwas über eure Gruppe, euren Stil, eure Geschichte..."
              />
              <p className="text-xs text-[var(--muted)] mt-1">
                {formData.description.length}/10 Zeichen (Minimum)
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--border)]">
              <div className="mb-2">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Trainingsort (Adresse oder Stadt/PLZ) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.location?.address || ""}
                    onChange={(e) =>
                      updateField("location", {
                        lat: formData.location?.lat || 51.1657,
                        lng: formData.location?.lng || 10.4515,
                        address: e.target.value,
                      })
                    }
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="z.B. 10115 Berlin"
                  />
                  <button
                    type="button"
                    onClick={geocodeAddress}
                    disabled={!formData.location?.address || isLoading}
                    className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50 transition"
                  >
                    Suchen
                  </button>
                </div>
              </div>

              <div className="rounded-lg overflow-hidden border border-[var(--border)]">
                <LocationPicker
                  initialLat={formData.location?.lat}
                  initialLng={formData.location?.lng}
                  onLocationSelect={(lat, lng) =>
                    updateField("location", {
                      ...formData.location,
                      lat,
                      lng,
                    })
                  }
                />
              </div>

              {formData.location?.lat && formData.location?.lng && (
                <p className="text-sm text-[var(--muted)] text-center mt-2">
                  📍 Koordinaten: {formData.location.lat.toFixed(4)}, {formData.location.lng.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        )}

        {currentStep === "details" && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="tf-display text-xl font-bold text-[var(--foreground)]">
                Optional
              </h2>
              <p className="text-[var(--muted)] text-sm mt-1">
                Diese Angaben sind optional – du kannst sie auch später im Profil ergänzen.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Gruppengröße (optional)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { value: "SOLO", label: "Solo", icon: "👤" },
                  { value: "DUO", label: "Duo", icon: "👥" },
                  { value: "TRIO", label: "Trio", icon: "👥" },
                  { value: "SMALL", label: "4-10", icon: "👨‍👩‍👧" },
                  { value: "LARGE", label: ">10", icon: "👨‍👩‍👧‍👦" },
                ].map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => updateField("size", size.value as FormData["size"])}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      formData.size === size.value
                        ? "border-[var(--primary)] bg-[var(--surface-2)]"
                        : "border-[var(--border)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <span className="text-xl block">{size.icon}</span>
                    <span className="text-xs font-medium text-[var(--muted)]">
                      {size.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Bild / Logo
              </label>
              <div className="flex items-center gap-4">
                {formData.image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.image}
                      alt="Vorschau"
                      className="h-16 w-16 object-cover rounded-lg border"
                    />
                  </>
                ) : (
                  <div className="h-16 w-16 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex items-center justify-center text-2xl">
                    📷
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-[var(--border)] file:bg-[var(--surface-2)] file:text-[var(--foreground)] hover:file:bg-[var(--surface-hover)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Tanzstile
              </label>
              <TagInput
                selectedTags={formData.tags}
                onChange={(tags) => updateField("tags", tags)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Trainingszeiten
                </label>
                <input
                  type="text"
                  value={formData.trainingTime || ""}
                  onChange={(e) => updateField("trainingTime", e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="z.B. Mo 18-20 Uhr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Gründungsjahr
                </label>
                <input
                  type="number"
                  value={formData.foundingYear || ""}
                  onChange={(e) =>
                    updateField("foundingYear", e.target.value ? parseInt(e.target.value) : null)
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="z.B. 2015"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.seekingMembers}
                  onChange={(e) => updateField("seekingMembers", e.target.checked)}
                  className="h-5 w-5 text-[var(--primary)] rounded"
                />
                <span className="text-sm text-[var(--foreground)]">
                  👋 Suchen Mitglieder
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.performances}
                  onChange={(e) => updateField("performances", e.target.checked)}
                  className="h-5 w-5 text-[var(--primary)] rounded"
                />
                <span className="text-sm text-[var(--foreground)]">
                  🎭 Auftritte möglich
                </span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Webseite
                </label>
                <input
                  type="url"
                  value={formData.website || ""}
                  onChange={(e) => updateField("website", e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Kontakt E-Mail
                </label>
                <input
                  type="email"
                  value={formData.contactEmail || ""}
                  onChange={(e) => updateField("contactEmail", e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="info@..."
                />
              </div>
            </div>
          </div>
        )}

        {/* details step doubles as review + submit */}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={currentStepIndex === 0 ? () => router.back() : prevStep}
          className="px-6 py-3 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition font-medium"
        >
          {currentStepIndex === 0 ? "Abbrechen" : "Zurück"}
        </button>

        {currentStep === "details" ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-8 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Erstelle...
              </>
            ) : (
              <>✓ Gruppe erstellen</>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={nextStep}
            className="px-8 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition font-medium"
          >
            Weiter →
          </button>
        )}
      </div>
    </div>
  );
}
