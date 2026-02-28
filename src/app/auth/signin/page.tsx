"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const registered = searchParams.get("registered");
    if (registered === "true") {
      const msg = "Fast geschafft: Bitte bestätige zuerst deine E-Mail-Adresse (Link in der E-Mail). Danach kannst du dich anmelden.";
      setSuccess(msg);
      showToast(msg, "success");
      return;
    }

    const verified = searchParams.get("verified");
    if (verified === "true") {
      const msg = "E-Mail-Adresse bestätigt. Du kannst dich jetzt anmelden.";
      setSuccess(msg);
      showToast(msg, "success");
    }
  }, [searchParams, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        const errorMsg =
          result.error === "EMAIL_NOT_VERIFIED"
            ? "Bitte bestätige zuerst deine E-Mail-Adresse (Link in deiner E-Mail)."
            : result.error === "LOGIN_LOCKED"
              ? "Zu viele Fehlversuche. Bitte warte 5 Minuten und versuche es erneut."
            : "Ungültige E-Mail oder Passwort";
        setError(errorMsg);
        showToast(errorMsg, "error");
      } else {
        showToast("Erfolgreich angemeldet!", "success");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      const errorMsg = "Ein unerwarteter Fehler ist aufgetreten";
      setError(errorMsg);
      showToast(errorMsg, "error");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-lg shadow-md">
      <h1 className="tf-display text-2xl font-bold text-center mb-6 text-[var(--foreground)]">Anmelden</h1>

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{success}</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-[var(--foreground)] font-medium mb-1">E-Mail</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border-2 border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] [&:-webkit-autofill]:bg-[var(--surface)] [&:-webkit-autofill]:shadow-[0_0_0_30px_var(--surface)_inset]"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-[var(--foreground)] font-medium mb-1">Passwort</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border-2 border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] [&:-webkit-autofill]:bg-[var(--surface)] [&:-webkit-autofill]:shadow-[0_0_0_30px_var(--surface)_inset]"
          />
          <div className="text-right mt-1">
            <Link href="/auth/forgot-password" className="text-sm text-[var(--link)] hover:underline">
              Passwort vergessen?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] py-2 px-4 rounded-md hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition disabled:opacity-50"
        >
          {isLoading ? "Wird geladen..." : "Anmelden"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-[var(--muted)]">
          Noch kein Konto?{" "}
          <Link href="/auth/register" className="text-[var(--link)] hover:underline">
            Hier registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
