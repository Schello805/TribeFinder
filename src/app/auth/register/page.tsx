"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!acceptedTerms) {
      showToast("Bitte bestätige die Hinweise zur Nutzung und zu Uploads.", "error");
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast("Passwörter stimmen nicht überein", "error");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registrierung fehlgeschlagen");
      }

      showToast("Registrierung erfolgreich! Bitte bestätige zuerst deine E-Mail-Adresse (Link in der E-Mail), dann kannst du dich anmelden.", "success");
      router.push("/auth/signin?registered=true");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Ein unerwarteter Fehler ist aufgetreten";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-lg shadow-md">
      <h1 className="tf-display text-2xl font-bold text-center mb-6 text-[var(--foreground)]">Registrieren</h1>
      
      {error && (
        <div className="bg-[var(--surface-2)] border border-[var(--border)] text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--muted)]">
        Deine detaillierten Tänzerinnen-Infos (Bio, Social Links, Unterricht/Workshops, Buchbarkeit usw.) kannst du nach dem ersten Login unter
        <span className="font-medium text-[var(--foreground)]"> Dashboard → Profil bearbeiten</span> ausfüllen.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-[var(--foreground)] font-medium mb-1">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            minLength={2}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-[var(--foreground)] font-medium mb-1">E-Mail</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-[var(--foreground)] font-medium mb-1">Passwort</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={8}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
          />
          <p className="text-xs text-[var(--muted)] mt-1">Mindestens 8 Zeichen</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-[var(--foreground)] font-medium mb-1">Passwort bestätigen</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
          />
        </div>

        <div className="text-sm text-[var(--muted)]">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1"
              required
            />
            <span>
              Ich bestätige, dass ich nur Inhalte hochlade, an denen ich die nötigen Rechte habe (z. B. Urheberrechte, Persönlichkeitsrechte) und dass ich die Hinweise in der{" "}
              <Link href="/datenschutz" className="text-[var(--link)] hover:underline">Datenschutzerklärung</Link>
              {" "}und im{" "}
              <Link href="/impressum" className="text-[var(--link)] hover:underline">Impressum</Link>
              {" "}zur Kenntnis genommen habe.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] py-2 px-4 rounded-md hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition disabled:opacity-50"
        >
          {isLoading ? "Wird geladen..." : "Registrieren"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-[var(--muted)]">
          Bereits ein Konto?{" "}
          <Link href="/auth/signin" className="text-[var(--link)] hover:underline">
            Hier anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
