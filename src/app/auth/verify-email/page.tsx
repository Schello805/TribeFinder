"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const hasVerifiedRef = useRef(false);

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Ungültiger Link. Bitte fordere eine neue Bestätigungs-E-Mail an.");
      return;
    }

    if (hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;

    let cancelled = false;

    const run = async () => {
      setStatus("loading");
      setMessage("");

      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = (await res.json().catch(() => null)) as { message?: string } | null;

        if (!res.ok) {
          throw new Error(data?.message || "Bestätigung fehlgeschlagen");
        }

        if (cancelled) return;
        setStatus("success");
        setMessage(data?.message || "E-Mail-Adresse erfolgreich bestätigt.");

        setTimeout(() => {
          router.replace("/auth/signin?verified=true");
        }, 1200);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Bestätigung fehlgeschlagen");
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [router, token]);

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-lg shadow-md">
      <h1 className="tf-display text-2xl font-bold text-center mb-3 text-[var(--foreground)]">E-Mail bestätigen</h1>
      <p className="text-sm text-center text-[var(--muted)] mb-6">
        Der Bestätigungslink ist aus Sicherheitsgründen nur 24 Stunden gültig.
      </p>

      {status === "loading" ? (
        <div className="text-center text-[var(--muted)]">Bitte warten...</div>
      ) : status === "success" ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded">
          {message}
        </div>
      ) : status === "error" ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
          {message}
        </div>
      ) : null}

      <div className="mt-6 text-center">
        <Link href="/auth/signin" className="text-[var(--link)] hover:underline">
          Zum Login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
