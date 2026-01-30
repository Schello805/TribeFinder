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
    <div className="max-w-md mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">Anmelden</h1>

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
          <label htmlFor="email" className="block text-gray-700 dark:text-gray-200 font-medium mb-1">E-Mail</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-black placeholder:text-gray-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder:text-gray-400 [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:shadow-[0_0_0_30px_white_inset] dark:[&:-webkit-autofill]:shadow-[0_0_0_30px_#374151_inset]"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-gray-700 dark:text-gray-200 font-medium mb-1">Passwort</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-black placeholder:text-gray-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder:text-gray-400 [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:shadow-[0_0_0_30px_white_inset] dark:[&:-webkit-autofill]:shadow-[0_0_0_30px_#374151_inset]"
          />
          <div className="text-right mt-1">
            <Link href="/auth/forgot-password" className="text-sm text-indigo-600 hover:underline">
              Passwort vergessen?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {isLoading ? "Wird geladen..." : "Anmelden"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Noch kein Konto?{" "}
          <Link href="/auth/register" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Hier registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
