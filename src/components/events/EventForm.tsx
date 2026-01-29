"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EventFormData } from "@/lib/validations/event";
import { useToast } from "@/components/ui/Toast";
import { normalizeUploadedImageUrl } from '@/lib/normalizeUploadedImageUrl';

interface EventFormProps {
  initialData?: Partial<EventFormData> & { id?: string; flyerImage?: string | null };
  groupId?: string;
  isEditing?: boolean;
}

type NominatimSearchResult = {
  lat: string;
  lon: string;
  display_name?: string;
};

const DEFAULT_EVENT_DURATION_MINUTES = 90;

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

const normalizeDatetimeLocal = (value: string) => {
  const v = value.trim();
  if (!v) return "";

  // Already compatible with datetime-local
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return v;

  // Some browsers / autofill may provide seconds/milliseconds
  // e.g. 2026-01-28T18:30:00 or 2026-01-28T18:30:00.000
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{1,3})?$/.test(v)) {
    return v.slice(0, 16);
  }

  // If we get a full ISO string with timezone, convert it to local datetime-local format
  // e.g. 2026-01-28T17:30:00.000Z or 2026-01-28T18:30:00+01:00
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return toLocalISOString(d);
  }

  const m = v.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:,?\s*(\d{1,2}):(\d{2}))?$/
  );
  if (!m) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return toLocalISOString(d);
    return "";
  }

  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3];
  const hh = (m[4] ?? "00").padStart(2, "0");
  const min = (m[5] ?? "00").padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const splitLocalDateTime = (value: string) => {
  const normalized = normalizeDatetimeLocal(value);
  if (!normalized) return { date: "", time: "" };
  const [date, time] = normalized.split("T");
  return { date: date || "", time: time || "" };
};

const joinLocalDateTime = (date: string, time: string) => {
  const d = (date || "").trim();
  const t = (time || "").trim();
  if (!d || !t) return "";
  return `${d}T${t}`;
};

const normalizeDateOnly = (value: string) => {
  const v = (value || "").trim();
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const normalizeTimeOnly = (value: string) => {
  const v = (value || "").trim();
  if (!v) return "";
  if (/^\d{2}:\d{2}$/.test(v)) return v;
  if (/^\d{2}:\d{2}:\d{2}/.test(v)) return v.slice(0, 5);
  return "";
};

const toDisplayDate = (isoDate: string) => {
  const v = (isoDate || "").trim();
  if (!v) return "";
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return v;
  return `${m[3]}.${m[2]}.${m[1]}`;
};

export default function EventForm({ initialData, groupId, isEditing = false }: EventFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  const [geocodeResults, setGeocodeResults] = useState<NominatimSearchResult[]>([]);
  const geocodeControllerRef = useRef<AbortController | null>(null);
  const lastGeocodeQueryRef = useRef<string>("");
  const didInitClearRef = useRef(false);
  const startFieldRef = useRef<HTMLDivElement | null>(null);
  const endFieldRef = useRef<HTMLDivElement | null>(null);
  const lastStartRef = useRef<Date | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const onError = (e: ErrorEvent) => {
      // eslint-disable-next-line no-console
      console.error("[EventForm] window.error", e.message, e.error);
    };

    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      // eslint-disable-next-line no-console
      console.error("[EventForm] window.unhandledrejection", e.reason);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined") return;

    const origFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : (input instanceof URL ? input.toString() : input.url);
      const method = (init?.method || (typeof input === "string" ? "GET" : (input instanceof URL ? "GET" : input.method)) || "GET").toUpperCase();
      const start = performance.now();
      try {
        const res = await origFetch(input as any, init);
        const ms = Math.round(performance.now() - start);
        // eslint-disable-next-line no-console
        console.warn("[fetch]", method, url, res.status, `${ms}ms`);
        return res;
      } catch (e) {
        const ms = Math.round(performance.now() - start);
        // eslint-disable-next-line no-console
        console.error("[fetch]", method, url, "FAILED", `${ms}ms`, e);
        throw e;
      }
    };

    return () => {
      window.fetch = origFetch;
    };
  }, []);
 
  const buildNominatimUrl = (rawQuery: string, limit = 1) => {
    const q = (rawQuery || "").trim();
    if (!q) return "";
    const normalizedQuery = /\bdeutschland\b/i.test(q) ? q : `${q}, Deutschland`;
    const params = new URLSearchParams({
      format: "json",
      q: normalizedQuery,
      limit: String(limit),
      countrycodes: "de",
      "accept-language": "de",
      addressdetails: "1",
    });
    return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  };
  const [formData, setFormData] = useState<EventFormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    eventType: initialData?.eventType || "EVENT",
    startDate: isEditing && initialData?.startDate ? toLocalISOString(initialData.startDate) : "",
    endDate: isEditing && initialData?.endDate ? toLocalISOString(initialData.endDate) : "",
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

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const q = (formData.address || "").trim();
    if (q.length < 6) {
      setGeocodeResults([]);
      setGeocodeError("");
      lastGeocodeQueryRef.current = "";
      geocodeControllerRef.current?.abort();
      geocodeControllerRef.current = null;
      return;
    }

    const normalized = q;
    if (normalized === lastGeocodeQueryRef.current) return;

    const t = window.setTimeout(async () => {
      geocodeControllerRef.current?.abort();
      const controller = new AbortController();
      geocodeControllerRef.current = controller;

      setIsGeocoding(true);
      setGeocodeError("");

      try {
        const url = buildNominatimUrl(normalized, 5);
        if (!url) return;
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn("[EventForm] geocode (debounced)", { query: normalized, url });
        }
        const res = await fetch(url, { signal: controller.signal });
        const data = (await res.json()) as NominatimSearchResult[];
        if (controller.signal.aborted) return;

        lastGeocodeQueryRef.current = normalized;

        if (data && data.length === 1 && data[0]) {
          setFormData((prev) => ({
            ...prev,
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          }));
          setGeocodeResults([]);
        } else if (data && data.length > 1) {
          setGeocodeResults(data);
        } else {
          setGeocodeResults([]);
          setGeocodeError("Adresse nicht gefunden. Bitte überprüfen.");
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setGeocodeResults([]);
        setGeocodeError("Fehler bei der Adresssuche");
      } finally {
        if (!controller.signal.aborted) {
          setIsGeocoding(false);
        }
      }
    }, 650);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.address]);

  const initialStartParts = splitLocalDateTime(isEditing ? (formData.startDate || "") : "");
  const initialEndParts = splitLocalDateTime(isEditing ? (formData.endDate || "") : "");
  const [startDateOnly, setStartDateOnly] = useState(normalizeDateOnly(initialStartParts.date));
  const [startTimeOnly, setStartTimeOnly] = useState(normalizeTimeOnly(initialStartParts.time));
  const [endDateOnly, setEndDateOnly] = useState(normalizeDateOnly(initialEndParts.date));
  const [endTimeOnly, setEndTimeOnly] = useState(normalizeTimeOnly(initialEndParts.time));
  const [startDateTouched, setStartDateTouched] = useState(isEditing);
  const [startTimeTouched, setStartTimeTouched] = useState(isEditing);
  const [endDateTouched, setEndDateTouched] = useState(isEditing);
  const [endTimeTouched, setEndTimeTouched] = useState(isEditing);
  const [fieldErrors, setFieldErrors] = useState<{ startDate?: string; endDate?: string }>({});
  const [endShiftHint, setEndShiftHint] = useState<string>("");
  const [browserTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "");

  useEffect(() => {
    const clearAll = () => {
      setFormData((prev) => ({
        ...prev,
        startDate: "",
        endDate: "",
      }));
      setStartDateOnly("");
      setStartTimeOnly("");
      setEndDateOnly("");
      setEndTimeOnly("");
      setStartDateTouched(false);
      setStartTimeTouched(false);
      setEndDateTouched(false);
      setEndTimeTouched(false);
      setFieldErrors({});
      setEndShiftHint("");
      lastStartRef.current = null;
    };

    if (isEditing) return;

    // Initial clear (create mode)
    if (!didInitClearRef.current) {
      didInitClearRef.current = true;
      clearAll();
    }

    // Safari/Browser bfcache restore can re-show previous form values without remounting.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) clearAll();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    const sp = splitLocalDateTime(formData.startDate || "");
    const ep = splitLocalDateTime(formData.endDate || "");
    setStartDateOnly(normalizeDateOnly(sp.date));
    setStartTimeOnly(normalizeTimeOnly(sp.time));
    setEndDateOnly(normalizeDateOnly(ep.date));
    setEndTimeOnly(normalizeTimeOnly(ep.time));
    setStartDateTouched(true);
    setStartTimeTouched(true);
    setEndDateTouched(true);
    setEndTimeTouched(true);
    const initialStart = joinLocalDateTime(normalizeDateOnly(sp.date), normalizeTimeOnly(sp.time));
    lastStartRef.current = initialStart ? new Date(initialStart) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

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
    return end < start ? "" : endDate;
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

      if (process.env.NODE_ENV !== "production" && (name === "startDate" || name === "endDate")) {
        // eslint-disable-next-line no-console
        console.warn(`[EventForm] ${name} changed:`, { value });
      }

      if (name === "startDate") {
        next.endDate = normalizeEndDate(next.startDate, next.endDate || "");
      }

      return next;
    });
  };

  const setEndFromDate = (end: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const d = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
    const t = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
    setEndDateOnly(d);
    setEndTimeOnly(t);
    const combined = joinLocalDateTime(d, t);
    setFormData((prev) => ({ ...prev, endDate: combined } as EventFormData));
  };

  const applyStartChange = (nextDate: string, nextTime: string) => {
    const d = normalizeDateOnly(nextDate);
    const t = normalizeTimeOnly(nextTime);
    setStartDateOnly(d);
    setStartTimeOnly(t);

    const combinedStart = joinLocalDateTime(d, t);
    setFormData((prev) => {
      const next = { ...prev, startDate: combinedStart } as EventFormData;
      next.endDate = normalizeEndDate(next.startDate, next.endDate || "");
      return next;
    });

    const nextStartDateObj = combinedStart ? new Date(combinedStart) : null;
    if (!nextStartDateObj || Number.isNaN(nextStartDateObj.getTime())) {
      lastStartRef.current = null;
      return;
    }

    const endIsManual = endDateTouched || endTimeTouched;
    const currentEndCombined = joinLocalDateTime(normalizeDateOnly(endDateOnly), normalizeTimeOnly(endTimeOnly));
    const currentEndObj = currentEndCombined ? new Date(currentEndCombined) : null;

    if (isEditing && lastStartRef.current && currentEndObj && !Number.isNaN(currentEndObj.getTime())) {
      const deltaMs = nextStartDateObj.getTime() - lastStartRef.current.getTime();
      if (deltaMs !== 0) {
        const shiftedEnd = new Date(currentEndObj.getTime() + deltaMs);
        setEndShiftHint("Endzeit wurde passend zum neuen Start mitverschoben.");
        setEndFromDate(shiftedEnd);
      }
    } else if (!endIsManual) {
      const autoEnd = new Date(nextStartDateObj.getTime() + DEFAULT_EVENT_DURATION_MINUTES * 60 * 1000);
      setEndShiftHint("");
      setEndFromDate(autoEnd);
    }

    lastStartRef.current = nextStartDateObj;
  };

  const handleStartDateOnlyChange = (value: string) => {
    setStartDateTouched(true);
    applyStartChange(value, startTimeOnly);
  };

  const handleStartTimeOnlyChange = (value: string) => {
    setStartTimeTouched(true);
    applyStartChange(startDateOnly, value);
  };

  const handleEndDateOnlyChange = (value: string) => {
    const d = normalizeDateOnly(value);
    setEndDateOnly(d);
    setEndDateTouched(true);
    setEndShiftHint("");
    const combined = joinLocalDateTime(d, normalizeTimeOnly(endTimeOnly));
    setFormData((prev) => ({ ...prev, endDate: combined } as EventFormData));
  };

  const handleEndTimeOnlyChange = (value: string) => {
    const t = normalizeTimeOnly(value);
    setEndTimeOnly(t);
    setEndTimeTouched(true);
    setEndShiftHint("");
    const combined = joinLocalDateTime(normalizeDateOnly(endDateOnly), t);
    setFormData((prev) => ({ ...prev, endDate: combined } as EventFormData));
  };

  const handleStartDateBlur = () => {
    const d = normalizeDateOnly(startDateOnly);
    setStartDateOnly(d);
    const combined = joinLocalDateTime(d, normalizeTimeOnly(startTimeOnly));
    setFormData((prev) => {
      const next = { ...prev, startDate: combined } as EventFormData;
      next.endDate = normalizeEndDate(next.startDate, next.endDate || "");
      return next;
    });
  };

  const handleStartTimeBlur = () => {
    const t = normalizeTimeOnly(startTimeOnly);
    setStartTimeOnly(t);
    const combined = joinLocalDateTime(normalizeDateOnly(startDateOnly), t);
    setFormData((prev) => {
      const next = { ...prev, startDate: combined } as EventFormData;
      next.endDate = normalizeEndDate(next.startDate, next.endDate || "");
      return next;
    });
  };

  const handleEndDateBlur = () => {
    const d = normalizeDateOnly(endDateOnly);
    setEndDateOnly(d);
    const combined = joinLocalDateTime(d, normalizeTimeOnly(endTimeOnly));
    setFormData((prev) => ({ ...prev, endDate: combined } as EventFormData));
  };

  const handleEndTimeBlur = () => {
    const t = normalizeTimeOnly(endTimeOnly);
    setEndTimeOnly(t);
    const combined = joinLocalDateTime(normalizeDateOnly(endDateOnly), t);
    setFormData((prev) => ({ ...prev, endDate: combined } as EventFormData));
  };

  const handleDateBlur = (field?: "startDate" | "endDate") => {
    setFormData((prev) => {
      const normalizedStart = normalizeDatetimeLocal(prev.startDate);
      const normalizedEnd = prev.endDate ? normalizeDatetimeLocal(prev.endDate) : "";
      const next = {
        ...prev,
        startDate: normalizedStart,
        endDate: normalizedEnd,
      };

      if (field === "startDate" || field === "endDate") {
        const candidateEnd = next.endDate || "";
        next.endDate = normalizeEndDate(next.startDate, candidateEnd);
      }

      if (process.env.NODE_ENV !== "production" && field) {
        // eslint-disable-next-line no-console
        console.warn(`[EventForm] ${field} blur normalized:`, {
          startDate: next.startDate,
          endDate: next.endDate,
        });
      }

      return next;
    });
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
    setGeocodeResults([]);
    
    try {
      const url = buildNominatimUrl(address, 5);
      if (!url) return;
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn("[EventForm] geocodeAddress", { address, url });
      }
      const res = await fetch(url);
      const data = (await res.json()) as NominatimSearchResult[];
      
      if (data && data.length === 1 && data[0]) {
        setFormData(prev => ({
          ...prev,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        }));
        setGeocodeResults([]);
      } else if (data && data.length > 1) {
        setGeocodeResults(data);
      } else {
        setGeocodeError("Adresse nicht gefunden. Bitte überprüfen.");
      }
    } catch {
      setGeocodeError("Fehler bei der Adresssuche");
    } finally {
      setIsGeocoding(false);
    }
  };

  const applyGeocodeSelection = (result: NominatimSearchResult) => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[EventForm] applyGeocodeSelection", {
        lat: result.lat,
        lon: result.lon,
        display_name: result.display_name,
      });
    }

    const selectedAddress = (result.display_name || "").trim();
    if (selectedAddress) {
      lastGeocodeQueryRef.current = selectedAddress;
      geocodeControllerRef.current?.abort();
      geocodeControllerRef.current = null;
    }

    setGeocodeResults([]);
    setGeocodeError("");
    setFormData((prev) => ({
      ...prev,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: selectedAddress || prev.address,
    }));
  };

  const handleAddressBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (geocodeResults.length > 0) return;
    if (value.trim()) {
      geocodeAddress(value);
    }
  };

  const handleGeocode = async () => {
    const query = formData.address || formData.locationName;
    if (!query) return;
    
    setIsGeocoding(true);
    setGeocodeError("");
    setGeocodeResults([]);
    try {
      const url = buildNominatimUrl(query, 5);
      if (!url) return;
      const res = await fetch(url);
      const data = (await res.json()) as NominatimSearchResult[];
      
      if (data && data.length === 1) {
        const { lat, lon } = data[0];
        setFormData(prev => ({
          ...prev,
          lat: parseFloat(lat),
          lng: parseFloat(lon)
        }));
        setError("");
      } else if (data && data.length > 1) {
        setGeocodeResults(data);
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
    setFieldErrors({});

    const eventId = initialData?.id;

    try {

      if (isEditing && !eventId) {
        throw new Error("Fehlende Event-ID");
      }

      const url = isEditing ? `/api/events/${eventId}` : "/api/events";
      const method = isEditing ? "PUT" : "POST";

      const errors: { startDate?: string; endDate?: string } = {};

      if (!formData.startDate) {
        errors.startDate = "Bitte Startdatum und Startuhrzeit auswählen.";
      }

      const start = formData.startDate ? new Date(formData.startDate) : null;
      if (start && Number.isNaN(start.getTime())) {
        errors.startDate = "Bitte Startdatum und Startuhrzeit auswählen.";
      }

      if (!formData.endDate) {
        errors.endDate = "Bitte Enddatum und Enduhrzeit auswählen.";
      }

      const end = formData.endDate ? new Date(formData.endDate) : null;
      if (end && Number.isNaN(end.getTime())) {
        errors.endDate = "Bitte Enddatum und Enduhrzeit auswählen.";
      }

      if (start && end && end <= start) {
        errors.endDate = "Ende muss nach dem Start liegen.";
      }

      if (errors.startDate || errors.endDate) {
        setFieldErrors(errors);
        const target = errors.startDate ? startFieldRef.current : endFieldRef.current;
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        throw new Error(errors.startDate || errors.endDate || "Bitte überprüfe die Eingaben.");
      }

      if (!start || !end) {
        throw new Error("Bitte überprüfe die Eingaben.");
      }

      // Prepare data for submission: Convert local datetime strings to UTC ISO strings
      const submitData = {
        ...formData,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const ct = response.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const data = (await response.json()) as unknown;
          if (
            data &&
            typeof data === "object" &&
            "errors" in data &&
            Array.isArray((data as { errors?: unknown }).errors)
          ) {
            const errors = (data as { errors: Array<{ message?: unknown }> }).errors;
            const first = errors[0]?.message;
            const errorMessage = typeof first === "string" ? first : "Bitte überprüfe die Eingaben.";
            throw new Error(errorMessage);
          }

          if (data && typeof data === "object" && "message" in data) {
            const msg = (data as { message?: unknown }).message;
            const details = (data as { details?: unknown }).details;
            const messagePart = typeof msg === "string" ? msg : "Fehler beim Speichern";
            const detailsPart = typeof details === "string" ? details : "";
            throw new Error(detailsPart ? `${messagePart}: ${detailsPart}` : messagePart);
          }

          throw new Error("Fehler beim Speichern");
        }

        const text = (await response.text()) || "";
        const snippet = text.replace(/\s+/g, " ").trim().slice(0, 180);
        throw new Error(
          snippet
            ? `Fehler beim Speichern (HTTP ${response.status}): ${snippet}`
            : `Fehler beim Speichern (HTTP ${response.status})`
        );
      }

      showToast(isEditing ? "Event erfolgreich aktualisiert!" : "Event erfolgreich erstellt!", "success");
      router.push(groupId ? `/groups/${groupId}/events` : "/events");
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ein Fehler ist aufgetreten";
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error("[EventForm] submit error", err);
      }
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="off" noValidate className="space-y-6 max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow transition-colors">
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
        <div ref={startFieldRef}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Start-Zeitpunkt</label>
          {browserTimeZone ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Zeitzone: {browserTimeZone}</p>
          ) : null}
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div className="relative">
              <input
                type="text"
                readOnly
                value={startDateOnly ? toDisplayDate(startDateOnly) : ""}
                autoComplete="off"
                placeholder="Datum auswählen"
                className={`block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white placeholder:text-gray-600 dark:bg-gray-700 dark:placeholder:text-gray-400 pointer-events-none ${startDateOnly && !startDateTouched ? "text-gray-400 dark:text-gray-400" : "text-black dark:text-white"}`}
              />
              <input
                type="date"
                value={startDateOnly}
                onChange={(e) => handleStartDateOnlyChange(e.target.value)}
                onBlur={handleStartDateBlur}
                autoComplete="off"
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </div>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={startTimeOnly ? startTimeOnly : ""}
                autoComplete="off"
                placeholder="Uhrzeit auswählen"
                className={`block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white placeholder:text-gray-600 dark:bg-gray-700 dark:placeholder:text-gray-400 pointer-events-none ${startTimeOnly && !startTimeTouched ? "text-gray-400 dark:text-gray-400" : "text-black dark:text-white"}`}
              />
              <input
                type="time"
                value={startTimeOnly}
                onChange={(e) => handleStartTimeOnlyChange(e.target.value)}
                onBlur={handleStartTimeBlur}
                autoComplete="off"
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </div>
          </div>
          {fieldErrors.startDate ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-300">{fieldErrors.startDate}</p>
          ) : null}
        </div>

        <div ref={endFieldRef}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">End-Zeitpunkt</label>
          {browserTimeZone ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 invisible">Zeitzone: {browserTimeZone}</p>
          ) : null}
          {endShiftHint ? (
            <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-200">{endShiftHint}</p>
          ) : null}
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div className="relative">
              <input
                type="text"
                readOnly
                value={endDateOnly ? toDisplayDate(endDateOnly) : ""}
                autoComplete="off"
                placeholder="Datum auswählen"
                className={`block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white placeholder:text-gray-600 dark:bg-gray-700 dark:placeholder:text-gray-400 pointer-events-none ${endDateOnly && !endDateTouched ? "text-gray-400 dark:text-gray-400" : "text-black dark:text-white"}`}
              />
              <input
                type="date"
                value={endDateOnly}
                min={startDateOnly || undefined}
                onChange={(e) => handleEndDateOnlyChange(e.target.value)}
                onBlur={handleEndDateBlur}
                autoComplete="off"
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </div>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={endTimeOnly ? endTimeOnly : ""}
                autoComplete="off"
                placeholder="Uhrzeit auswählen"
                className={`block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white placeholder:text-gray-600 dark:bg-gray-700 dark:placeholder:text-gray-400 pointer-events-none ${endTimeOnly && !endTimeTouched ? "text-gray-400 dark:text-gray-400" : "text-black dark:text-white"}`}
              />
              <input
                type="time"
                value={endTimeOnly}
                onChange={(e) => handleEndTimeOnlyChange(e.target.value)}
                onBlur={handleEndTimeBlur}
                autoComplete="off"
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </div>
          </div>
          {fieldErrors.endDate ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-300">{fieldErrors.endDate}</p>
          ) : null}
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

      <div className="space-y-6">
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                  <img src={normalizeUploadedImageUrl(formData.flyer1) ?? ""} alt="Flyer 1" className="h-20 w-20 object-cover rounded-md border border-gray-200 dark:border-gray-600" />
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
                  <img src={normalizeUploadedImageUrl(formData.flyer2) ?? ""} alt="Flyer 2" className="h-20 w-20 object-cover rounded-md border border-gray-200 dark:border-gray-600" />
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
            {!isGeocoding && geocodeResults.length > 0 && (
              <div className="mt-2 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden">
                {geocodeResults.slice(0, 5).map((r, idx) => (
                  <button
                    key={`${r.lat}-${r.lon}-${idx}`}
                    type="button"
                    onClick={() => applyGeocodeSelection(r)}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {r.display_name || `${r.lat}, ${r.lon}`}
                  </button>
                ))}
              </div>
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
