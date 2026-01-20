"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

interface UserProfile {
  firstName?: string | null;
  lastName?: string | null;
  dancerName?: string | null;
  bio?: string | null;
  image?: string | null;
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  email?: string | null;
}

export default function ProfileForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  
  const [formData, setFormData] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    dancerName: "",
    bio: "",
    image: "",
    youtubeUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
  });

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.status === 401) {
        router.push("/auth/signin");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || data?.error || "Fehler beim Laden des Profils");
      }
      const data = await res.json();
      setFormData(data);
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : "Profil konnte nicht geladen werden.";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      setFormData((prev) => ({ ...prev, image: normalizeUploadedImageUrl(data.url) ?? "" }));
    } catch (err) {
      console.error(err);
      const errorMsg = "Fehler beim Bild-Upload";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Speichern fehlgeschlagen");

      const successMsg = "Profil erfolgreich aktualisiert!";
      setMessage(successMsg);
      showToast(successMsg, "success");
      router.refresh();
    } catch (err) {
      console.error(err);
      const errorMsg = "Fehler beim Speichern des Profils.";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !formData.email) { // Show loading only on initial fetch
    return <div className="p-8 text-center text-gray-500">Lade Profil...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md border border-red-200 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-50 text-green-600 p-3 rounded-md border border-green-200 text-sm">
          {message}
        </div>
      )}

      {/* Basis-Informationen */}
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Persönliche Daten</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Diese Informationen werden auf deinem öffentlichen Profil angezeigt.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Vorname
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="firstName"
                id="firstName"
                value={formData.firstName || ""}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nachname
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="lastName"
                id="lastName"
                value={formData.lastName || ""}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
              />
            </div>
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="dancerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Künstlername / Tanzname
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="dancerName"
                id="dancerName"
                value={formData.dancerName || ""}
                onChange={handleChange}
                placeholder="Wie möchtest du genannt werden?"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Über mich (Bio)
            </label>
            <div className="mt-1">
              <textarea
                id="bio"
                name="bio"
                rows={4}
                value={formData.bio || ""}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
                placeholder="Erzähle etwas über deine Tanzerfahrung, Stile die du magst, etc."
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profilbild</label>
            <div className="mt-2 flex items-center space-x-6">
              <div className="shrink-0">
                {formData.image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="h-24 w-24 object-cover rounded-full border border-gray-200 dark:border-gray-600"
                      src={formData.image}
                      alt="Profilbild"
                    />
                  </>
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                    <span className="text-3xl">📷</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block">
                  <span className="sr-only">Wähle ein Profilbild</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100
                    "
                  />
                </label>
                {formData.image && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image: "" }))}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Bild entfernen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Social Media & Links</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Zeige anderen, wo sie dich finden können.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="instagramUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Instagram
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300">
                instagram.com/
              </span>
              <input
                type="text"
                name="instagramUrl"
                id="instagramUrl"
                value={formData.instagramUrl?.replace('https://instagram.com/', '') || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, instagramUrl: e.target.value ? `https://instagram.com/${e.target.value.replace('https://instagram.com/', '')}` : "" }))}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="username"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="tiktokUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              TikTok
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300">
                tiktok.com/@
              </span>
              <input
                type="text"
                name="tiktokUrl"
                id="tiktokUrl"
                value={formData.tiktokUrl?.replace('https://tiktok.com/@', '') || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, tiktokUrl: e.target.value ? `https://tiktok.com/@${e.target.value.replace('https://tiktok.com/@', '')}` : "" }))}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="username"
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              YouTube Video / Kanal
            </label>
            <div className="mt-1">
              <input
                type="url"
                name="youtubeUrl"
                id="youtubeUrl"
                value={formData.youtubeUrl || ""}
                onChange={handleChange}
                placeholder="https://youtube.com/..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="facebookUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Facebook
            </label>
            <div className="mt-1">
              <input
                type="url"
                name="facebookUrl"
                id="facebookUrl"
                value={formData.facebookUrl || ""}
                onChange={handleChange}
                placeholder="https://facebook.com/..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 border"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-5 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSaving ? "Speichere..." : "Speichern"}
        </button>
      </div>
    </form>
  );
}
