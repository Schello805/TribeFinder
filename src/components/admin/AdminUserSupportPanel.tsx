"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";

type ResetResponse =
  | { ok: true; resetUrl: string; resetTokenExpiry: string; emailed: boolean }
  | { message?: string; error?: string; details?: unknown };

type VerifyResponse =
  | { ok: true; alreadyVerified: true }
  | {
      ok: true;
      alreadyVerified: false;
      verifyUrl: string;
      verificationTokenExpiry: string;
      emailed: boolean;
    }
  | { message?: string; error?: string; details?: unknown };

export default function AdminUserSupportPanel({ userId }: { userId: string }) {
  const { showToast } = useToast();

  const [resetLink, setResetLink] = useState<string | null>(null);
  const [resetExpiry, setResetExpiry] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  const [verifyLink, setVerifyLink] = useState<string | null>(null);
  const [verifyExpiry, setVerifyExpiry] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  const resetExpiryText = useMemo(() => {
    if (!resetExpiry) return null;
    return new Date(resetExpiry).toLocaleString("de-DE");
  }, [resetExpiry]);

  const verifyExpiryText = useMemo(() => {
    if (!verifyExpiry) return null;
    return new Date(verifyExpiry).toLocaleString("de-DE");
  }, [verifyExpiry]);

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("In Zwischenablage kopiert", "success");
    } catch {
      showToast("Kopieren fehlgeschlagen", "error");
    }
  }

  const generateReset = async (sendEmail: boolean) => {
    setResetBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail }),
      });
      const data = (await res.json().catch(() => ({}))) as ResetResponse;
      if (!res.ok || !(data as { ok?: boolean }).ok) {
        throw new Error((data as { message?: string }).message || "Aktion fehlgeschlagen");
      }
      setResetLink((data as { resetUrl: string }).resetUrl);
      setResetExpiry((data as { resetTokenExpiry: string }).resetTokenExpiry);
      showToast(sendEmail ? "Reset-Link erstellt & E-Mail gesendet" : "Reset-Link erstellt", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Aktion fehlgeschlagen", "error");
    } finally {
      setResetBusy(false);
    }
  };

  const generateVerification = async (sendEmail: boolean) => {
    setVerifyBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail }),
      });
      const data = (await res.json().catch(() => ({}))) as VerifyResponse;
      if (!res.ok || !(data as { ok?: boolean }).ok) {
        throw new Error((data as { message?: string }).message || "Aktion fehlgeschlagen");
      }

      if ((data as { alreadyVerified?: boolean }).alreadyVerified) {
        setAlreadyVerified(true);
        setVerifyLink(null);
        setVerifyExpiry(null);
        showToast("User ist bereits verifiziert", "info");
        return;
      }

      setAlreadyVerified(false);
      setVerifyLink((data as { verifyUrl: string }).verifyUrl);
      setVerifyExpiry((data as { verificationTokenExpiry: string }).verificationTokenExpiry);
      showToast(sendEmail ? "Verifizierungs-Link erstellt & E-Mail gesendet" : "Verifizierungs-Link erstellt", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Aktion fehlgeschlagen", "error");
    } finally {
      setVerifyBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Support</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Reset- und Verifizierungslinks können jederzeit neu generiert werden. Alte Links werden dadurch ungültig.
        </p>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
        <div className="text-sm font-medium text-gray-900 dark:text-white">Passwort zurücksetzen</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={resetBusy}
            onClick={() => generateReset(true)}
            className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Link generieren + Mail senden
          </button>
          <button
            type="button"
            disabled={resetBusy}
            onClick={() => generateReset(false)}
            className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Nur Link generieren
          </button>
        </div>

        {resetLink ? (
          <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Reset-Link</div>
            <div className="mt-1 break-all text-sm text-gray-900 dark:text-gray-100 font-mono">{resetLink}</div>
            {resetExpiryText ? <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Gültig bis: {resetExpiryText}</div> : null}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => copyToClipboard(resetLink)}
                className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Kopieren
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
        <div className="text-sm font-medium text-gray-900 dark:text-white">E-Mail Verifizierung</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={verifyBusy}
            onClick={() => generateVerification(true)}
            className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Link generieren + Mail senden
          </button>
          <button
            type="button"
            disabled={verifyBusy}
            onClick={() => generateVerification(false)}
            className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Nur Link generieren
          </button>
        </div>

        {alreadyVerified ? (
          <div className="text-sm text-green-700 dark:text-green-300">Dieser User ist bereits verifiziert.</div>
        ) : null}

        {verifyLink ? (
          <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Verifizierungs-Link</div>
            <div className="mt-1 break-all text-sm text-gray-900 dark:text-gray-100 font-mono">{verifyLink}</div>
            {verifyExpiryText ? <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Gültig bis: {verifyExpiryText}</div> : null}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => copyToClipboard(verifyLink)}
                className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Kopieren
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
