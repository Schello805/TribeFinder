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

      showToast("Registrierung erfolgreich! Du kannst dich jetzt anmelden.", "success");
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
    <div className="max-w-md mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h1 className="tf-display text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">Registrieren</h1>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-gray-700 dark:text-gray-200 font-medium mb-1">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            minLength={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder:text-gray-400"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-gray-700 dark:text-gray-200 font-medium mb-1">E-Mail</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder:text-gray-400"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-gray-700 dark:text-gray-200 font-medium mb-1">Passwort</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder:text-gray-400"
          />
          <p className="text-xs text-gray-500 mt-1">Mindestens 8 Zeichen</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-gray-700 dark:text-gray-200 font-medium mb-1">Passwort bestätigen</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black placeholder:text-gray-600 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder:text-gray-400"
          />
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-300">
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
              <Link href="/datenschutz" className="text-indigo-600 hover:underline">Datenschutzerklärung</Link>
              {" "}und im{" "}
              <Link href="/impressum" className="text-indigo-600 hover:underline">Impressum</Link>
              {" "}zur Kenntnis genommen habe.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {isLoading ? "Wird geladen..." : "Registrieren"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Bereits ein Konto?{" "}
          <Link href="/auth/signin" className="text-indigo-600 hover:underline">
            Hier anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
