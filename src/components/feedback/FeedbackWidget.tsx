"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";

type SpeechRecognitionType = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionResultLike = { transcript?: string };
type SpeechRecognitionAlternativeListLike = { 0?: SpeechRecognitionResultLike };
type SpeechRecognitionEventLike = {
  results?: ArrayLike<SpeechRecognitionAlternativeListLike>;
  resultIndex?: number;
};

export default function FeedbackWidget() {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [inlineError, setInlineError] = useState("");

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  const speechSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    const w = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    if (!speechSupported) return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionType;
      webkitSpeechRecognition?: new () => SpeechRecognitionType;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;

    const recognition: SpeechRecognitionType = new SR();
    recognition.lang = "de-DE";
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onresult = (event: unknown) => {
      const e = event as SpeechRecognitionEventLike;
      const results = e?.results;
      if (!results || results.length === 0) return;

      let text = "";
      for (let i = e.resultIndex ?? 0; i < results.length; i++) {
        const r = results[i];
        const t = r?.[0]?.transcript;
        if (typeof t === "string") text += t;
      }

      const cleaned = text.trim();
      if (!cleaned) return;
      setMessage((prev) => (prev ? `${prev.trim()} ${cleaned}` : cleaned));
    };

    recognition.onerror = () => {
      setIsRecording(false);
      showToast("Sprachaufnahme fehlgeschlagen", "error");
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [showToast, speechSupported]);

  const toggleRecording = () => {
    const rec = recognitionRef.current;
    if (!rec) return;

    if (isRecording) {
      rec.stop();
      setIsRecording(false);
      return;
    }

    try {
      rec.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  };

  const close = () => {
    setOpen(false);
    setIsSending(false);
    setIsRecording(false);
    setInlineError("");
    recognitionRef.current?.stop();
  };

  const submit = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      setInlineError("Bitte ein kurzes Feedback schreiben");
      return;
    }

    const email = reporterEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInlineError("Bitte eine gültige E-Mail eingeben oder das Feld leer lassen");
      return;
    }

    setInlineError("");

    setIsSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          reporterName: reporterName.trim() ? reporterName.trim() : undefined,
          reporterEmail: email ? email : undefined,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const details =
          data?.details?.message ||
          data?.details ||
          (Array.isArray(data?.errors) && data.errors.length > 0
            ? `${data.errors[0]?.path?.join?.(".") || "field"}: ${data.errors[0]?.message || "Ungültig"}`
            : null) ||
          data?.message ||
          `HTTP ${res.status}`;
        throw new Error(String(details));
      }

      showToast("Danke! Feedback gespeichert.", "success");
      setMessage("");
      setReporterName("");
      setReporterEmail("");
      close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Feedback konnte nicht gespeichert werden";
      setInlineError(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[60] rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition px-5 py-3 font-semibold"
      >
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            onClick={close}
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
          />

          <div className="absolute bottom-6 right-6 w-[min(520px,calc(100vw-48px))] rounded-xl bg-[var(--surface)] text-[var(--foreground)] shadow-2xl border border-[var(--border)]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="font-bold">Feedback senden</div>
              <button
                type="button"
                onClick={close}
                className="text-[var(--muted)] hover:text-[var(--foreground)] transition"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-sm text-[var(--muted)]">
                Schreibe kurz, was gut/schlecht ist oder was fehlt. Optional kannst du diktieren.
              </div>

              {inlineError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                  {inlineError}
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="Name (optional)"
                />
                <input
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="E-Mail (optional)"
                  type="email"
                />
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="Dein Feedback…"
              />

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={!speechSupported}
                    className={`px-3 py-2 rounded-md text-sm font-medium border transition ${
                      speechSupported
                        ? isRecording
                          ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                          : "bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                        : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isRecording ? "Stop" : "Sprechen"}
                  </button>

                  {speechSupported && (
                    <div className="text-xs text-gray-500">
                      {isRecording ? "Aufnahme läuft…" : "Diktieren"}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMessage("")}
                    className="px-3 py-2 rounded-md text-sm font-medium border border-[var(--border)] hover:bg-[var(--surface-2)] transition"
                  >
                    Leeren
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={isSending}
                    className="px-4 py-2 rounded-md text-sm font-semibold bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50 transition"
                  >
                    {isSending ? "Sende…" : "Absenden"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
