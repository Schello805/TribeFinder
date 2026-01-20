"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EventFormData } from "@/lib/validations/event";
import { useToast } from "@/components/ui/Toast";

interface EventFormProps {
  initialData?: Partial<EventFormData> & { id?: string; flyerImage?: string | null };
  groupId?: string;
  isEditing?: boolean;
}

// Helper to format date for datetime-local input (YYYY-MM-DDThh:mm) in Local Time
const toLocalISOString = (dateString: string | Date) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const pad = (num: number) => num.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function EventForm({ initialData, groupId, isEditing = false }: EventFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  
  const [formData, setFormData] = useState<EventFormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    eventType: initialData?.eventType || "EVENT",
    startDate: initialData?.startDate ? toLocalISOString(initialData.startDate) : "",
    endDate: initialData?.endDate ? toLocalISOString(initialData.endDate) : "",
    locationName: initialData?.locationName || "",
    address: initialData?.address || "",
    lat: initialData?.lat || 51.1657,
    lng: initialData?.lng || 10.4515,
    flyer1: initialData?.flyer1 || "",
    flyer2: initialData?.flyer2 || "",
    website: initialData?.website || "",
    ticketLink: initialData?.ticketLink || "",
    ticketPrice: initialData?.ticketPrice || "",
    organizer: initialData?.organizer || "",
    groupId: groupId,
    maxParticipants: initialData?.maxParticipants || undefined,
    requiresRegistration: initialData?.requiresRegistration || false,
  });

  // Auto-add https:// to URLs if missing
  const normalizeUrl = (url: string): string => {
    if (!url) return url;
    const trimmed = url.trim();
    if (trimmed && !trimmed.match(/^https?:\/\//i)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const normalizeEndDate = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return endDate;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return endDate;
    return end < start ? startDate : endDate;
  };

  useEffect(() => {
    if (!formData.startDate || !formData.endDate) return;
    const normalized = normalizeEndDate(formData.startDate, formData.endDate);
    if (normalized !== formData.endDate) {
      setFormData((prev) => ({ ...prev, endDate: normalized }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value } as EventFormData;
      if (name === "startDate" || name === "endDate") {
        next.endDate = normalizeEndDate(next.startDate, next.endDate || "");
      }
      return next;
    });
  };

  const handleDateBlur = () => {
    setFormData((prev) => ({
      ...prev,
      endDate: normalizeEndDate(prev.startDate, prev.endDate || ""),
    }));
  };

  const handleUrlBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value) {
      setFormData(prev => ({ ...prev, [name]: normalizeUrl(value) }));
    }
  };

  const handleFlyerUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'flyer1' | 'flyer2') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      setIsLoading(true);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!res.ok) throw new Error('Upload fehlgeschlagen');

      const data = await res.json();
      setFormData(prev => ({ ...prev, [field]: data.url }));
    } catch (err) {
      console.error(err);
      const errorMsg = 'Fehler beim Bild-Upload';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Geocode address to get lat/lng
  const geocodeAddress = async (address: string) => {
    if (!address.trim()) return;
    
    setIsGeocoding(true);
    setGeocodeError("");
    
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        { headers: { "User-Agent": "TribeFinder/1.0" } }
      );
      const data = await res.json();
      
      if (data && data[0]) {
        setFormData(prev => ({
          ...prev,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        }));
      } else {
        setGeocodeError("Adresse nicht gefunden. Bitte überprüfen.");
      }
    } catch {
      setGeocodeError("Fehler bei der Adresssuche");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleAddressBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (value.trim()) {
      geocodeAddress(value);
    }
  };

  const handleGeocode = async () => {
    const query = formData.address || formData.locationName;
    if (!query) return;
    
    setIsGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setFormData(prev => ({
          ...prev,
          lat: parseFloat(lat),
          lng: parseFloat(lon)
        }));
        setError("");
      } else {
        setError(`Die Adresse "${query}" konnte nicht gefunden werden.`);
      }
    } catch (e) {
      console.error(e);
      setError("Verbindungsfehler beim Abrufen der Koordinaten.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const eventId = initialData?.id;

    try {
      if (isEditing && !eventId) {
        throw new Error("Fehlende Event-ID");
      }

      const url = isEditing ? `/api/events/${eventId}` : "/api/events";
      const method = isEditing ? "PUT" : "POST";

      // Prepare data for submission: Convert local datetime strings to UTC ISO strings
      const submitData = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.errors) {
          // You might want to handle specific field errors here if your validation returns them
          // For now, let's just show a general message or the first error
          const errorMessage = data.errors[0]?.message || "Bitte überprüfe die Eingaben.";
          throw new Error(errorMessage);
        }
        const errorMessage = data.details ? `${data.message}: ${data.details}` : (data.message || "Fehler beim Speichern");
        throw new Error(errorMessage);
      }

      showToast(isEditing ? "Event erfolgreich aktualisiert!" : "Event erfolgreich erstellt!", "success");
      router.push(`/groups/${groupId}/events`);
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ein Fehler ist aufgetreten";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow transition-colors">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-900/30 dark:border-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Titel des Events</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Start-Zeitpunkt</label>
          <input
            type="datetime-local"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            onBlur={handleDateBlur}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">End-Zeitpunkt (Optional)</label>
          <input
            type="datetime-local"
            name="endDate"
            value={formData.endDate}
            min={formData.startDate}
            onChange={handleChange}
            onBlur={handleDateBlur}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Beschreibung</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
         <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Webseite (Optional)</label>
            <input
              type="text"
              name="website"
              value={formData.website || ""}
              onChange={handleChange}
              onBlur={handleUrlBlur}
              placeholder="www.beispiel.de"
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
            />
         </div>
         <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Ticket-Link</label>
                <input
                  type="text"
                  name="ticketLink"
                  value={formData.ticketLink || ""}
                  onChange={handleChange}
                  onBlur={handleUrlBlur}
                  placeholder="tickets.beispiel.de"
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Preis</label>
                <input
                  type="text"
                  name="ticketPrice"
                  value={formData.ticketPrice || ""}
                  onChange={handleChange}
                  placeholder="z.B. 15€ / Kostenlos"
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
                />
             </div>
         </div>
      </div>

      {/* Workshop Booking Section */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800">
        <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-4">Workshop-Buchung</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requiresRegistration || false}
              onChange={(e) => setFormData(prev => ({ ...prev, requiresRegistration: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">Anmeldung erforderlich</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Teilnehmer müssen sich für dieses Event anmelden</p>
            </div>
          </label>

          {formData.requiresRegistration && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Maximale Teilnehmerzahl (optional)
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxParticipants || ""}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  maxParticipants: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                placeholder="Unbegrenzt"
                className="mt-1 block w-48 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Leer lassen für unbegrenzte Teilnehmer. Bei Limit werden weitere auf Warteliste gesetzt.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Flyer / Logo</label>
            <div className="mt-1 flex flex-col gap-2">
              {formData.flyer1 && (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.flyer1} alt="Flyer 1" className="h-20 w-20 object-cover rounded-md border border-gray-200 dark:border-gray-600" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, flyer1: "" }))}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Entfernen
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFlyerUpload(e, 'flyer1')}
                className="block w-full text-sm text-black dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-200"
              />
            </div>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Weiteres Bild (Optional)</label>
            <div className="mt-1 flex flex-col gap-2">
              {formData.flyer2 && (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.flyer2} alt="Flyer 2" className="h-20 w-20 object-cover rounded-md border border-gray-200 dark:border-gray-600" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, flyer2: "" }))}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Entfernen
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFlyerUpload(e, 'flyer2')}
                className="block w-full text-sm text-black dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-200"
              />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Veranstaltungsort</label>
          <input
            type="text"
            name="locationName"
            value={formData.locationName || ""}
            onChange={handleChange}
            onBlur={handleGeocode}
            placeholder="z.B. Stadthalle, Open Air Bühne..."
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Veranstalter (Optional)</label>
          <input
            type="text"
            name="organizer"
            value={formData.organizer || ""}
            onChange={handleChange}
            placeholder="Name des Veranstalters"
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Adresse *</label>
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <input
              type="text"
              name="address"
              value={formData.address || ""}
              onChange={handleChange}
              onBlur={handleAddressBlur}
              placeholder="Straße, Hausnummer, PLZ, Ort"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
            />
            {isGeocoding && (
              <p className="mt-1 text-sm text-indigo-600 dark:text-indigo-400">🔍 Suche Adresse...</p>
            )}
            {geocodeError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">⚠️ {geocodeError}</p>
            )}
            {!isGeocoding && !geocodeError && formData.lat !== 51.1657 && (
              <p className="mt-1 text-sm text-green-600 dark:text-green-400">✓ Standort gefunden</p>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Die Adresse wird automatisch auf der Karte verortet.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="mr-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? "Speichere..." : (isEditing ? "Aktualisieren" : "Event erstellen")}
        </button>
      </div>
    </form>
  );
}
