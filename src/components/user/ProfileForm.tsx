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
  isDancerProfileEnabled?: boolean;
  isDancerProfilePrivate?: boolean;
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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmPassword: "" });
  
  const [formData, setFormData] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    dancerName: "",
    bio: "",
    image: "",
    isDancerProfileEnabled: false,
    isDancerProfilePrivate: false,
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
      setFormData({
        ...data,
        image: normalizeUploadedImageUrl(data?.image) ?? "",
      });
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

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);

    if (passwordForm.password.length < 8) {
      showToast("Passwort muss mindestens 8 Zeichen lang sein", "error");
      setIsChangingPassword(false);
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      showToast("Passwörter stimmen nicht überein", "error");
      setIsChangingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordForm.password }),
      });

      const data = (await res.json().catch(() => null)) as { message?: string } | null;

      if (!res.ok) {
        throw new Error(data?.message || "Passwort ändern fehlgeschlagen");
      }

      showToast(data?.message || "Passwort erfolgreich geändert", "success");
      setPasswordForm({ password: "", confirmPassword: "" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Passwort ändern fehlgeschlagen";
      showToast(msg, "error");
    } finally {
      setIsChangingPassword(false);
    }
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
    return <div className="p-8 text-center text-[var(--muted)]">Lade Profil...</div>;
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-8 bg-[var(--surface)] text-[var(--foreground)] p-6 rounded-lg border border-[var(--border)] shadow">
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
        <h3 className="tf-display text-lg font-medium leading-6 text-[var(--foreground)]">Persönliche Daten</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Diese Informationen werden auf deinem öffentlichen Profil angezeigt.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="firstName" className="block text-sm font-medium text-[var(--foreground)]">
              Vorname
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="firstName"
                id="firstName"
                value={formData.firstName || ""}
                onChange={handleChange}
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] sm:text-sm px-3 py-2"
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="flex items-start gap-3">
                <input
                  id="isDancerProfileEnabled"
                  name="isDancerProfileEnabled"
                  type="checkbox"
                  checked={Boolean(formData.isDancerProfileEnabled)}
                  onChange={handleCheckboxChange}
                  className="mt-1 h-4 w-4 rounded border-[var(--border)]"
                />
                <div className="min-w-0">
                  <label htmlFor="isDancerProfileEnabled" className="block text-sm font-semibold text-[var(--foreground)]">
                    Als Tänzerin eintragen
                  </label>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Wenn aktiv, erscheinst du in der Tänzerinnen-Übersicht und kannst von anderen gefunden werden.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3">
                <input
                  id="isDancerProfilePrivate"
                  name="isDancerProfilePrivate"
                  type="checkbox"
                  checked={Boolean(formData.isDancerProfilePrivate)}
                  onChange={handleCheckboxChange}
                  className="mt-1 h-4 w-4 rounded border-[var(--border)]"
                />
                <div className="min-w-0">
                  <label htmlFor="isDancerProfilePrivate" className="block text-sm font-semibold text-[var(--foreground)]">
                    Profil privat lassen
                  </label>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Privat bedeutet: Dein Profil ist nur für eingeloggte Besucher sichtbar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="lastName" className="block text-sm font-medium text-[var(--foreground)]">
              Nachname
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="lastName"
                id="lastName"
                value={formData.lastName || ""}
                onChange={handleChange}
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] sm:text-sm px-3 py-2"
              />
            </div>
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="dancerName" className="block text-sm font-medium text-[var(--foreground)]">
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
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] sm:text-sm px-3 py-2"
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="bio" className="block text-sm font-medium text-[var(--foreground)]">
              Über mich (Bio)
            </label>
            <div className="mt-1">
              <textarea
                id="bio"
                name="bio"
                rows={4}
                value={formData.bio || ""}
                onChange={handleChange}
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] sm:text-sm px-3 py-2"
                placeholder="Erzähle etwas über deine Tanzerfahrung, Stile die du magst, etc."
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label className="block text-sm font-medium text-[var(--foreground)]">Profilbild</label>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="shrink-0">
                {formData.image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="h-24 w-24 object-cover rounded-full border border-[var(--border)]"
                      src={normalizeUploadedImageUrl(formData.image) ?? ""}
                      alt="Profilbild"
                    />
                  </>
                ) : (
                  <div className="h-24 w-24 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
                    <span className="text-3xl">📷</span>
                  </div>
                )}
              </div>
              <div className="w-full sm:w-auto min-w-0">
                <label className="block">
                  <span className="sr-only">Wähle ein Profilbild</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full min-w-0 text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border file:border-[var(--border)]
                      file:text-sm file:font-semibold
                      file:bg-[var(--surface-2)] file:text-[var(--foreground)]
                      hover:file:bg-[var(--surface-hover)]
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
      <div className="pt-8 border-t border-[var(--border)]">
        <h3 className="tf-display text-lg font-medium leading-6 text-[var(--foreground)]">Social Media & Links</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Zeige anderen, wo sie dich finden können.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="instagramUrl" className="block text-sm font-medium text-[var(--foreground)]">
              Instagram
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] sm:text-sm">
                instagram.com/
              </span>
              <input
                type="text"
                name="instagramUrl"
                id="instagramUrl"
                value={formData.instagramUrl?.replace('https://instagram.com/', '') || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, instagramUrl: e.target.value ? `https://instagram.com/${e.target.value.replace('https://instagram.com/', '')}` : "" }))}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] sm:text-sm"
                placeholder="username"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="tiktokUrl" className="block text-sm font-medium text-[var(--foreground)]">
              TikTok
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] sm:text-sm">
                tiktok.com/@
              </span>
              <input
                type="text"
                name="tiktokUrl"
                id="tiktokUrl"
                value={formData.tiktokUrl?.replace('https://tiktok.com/@', '') || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, tiktokUrl: e.target.value ? `https://tiktok.com/@${e.target.value.replace('https://tiktok.com/@', '')}` : "" }))}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] sm:text-sm"
                placeholder="username"
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="youtubeUrl" className="block text-sm font-medium text-[var(--foreground)]">
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
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] sm:text-sm px-3 py-2"
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="facebookUrl" className="block text-sm font-medium text-[var(--foreground)]">
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
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] sm:text-sm px-3 py-2"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-5 border-t border-[var(--border)] flex justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-[var(--surface)] py-2 px-4 border border-[var(--border)] rounded-md shadow-sm text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] mr-3 transition"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-[var(--primary-foreground)] bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50 transition"
        >
          {isSaving ? "Speichere..." : "Speichern"}
        </button>
      </div>
      </form>

      <form onSubmit={handlePasswordChange} className="space-y-4 bg-[var(--surface)] text-[var(--foreground)] p-6 rounded-lg border border-[var(--border)] shadow">
        <div>
          <h3 className="tf-display text-lg font-medium leading-6 text-[var(--foreground)]">Passwort ändern</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Setze ein neues Passwort für dein Konto.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-[var(--foreground)]">
              Neues Passwort
            </label>
            <div className="mt-1">
              <input
                id="newPassword"
                type="password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, password: e.target.value }))}
                minLength={8}
                required
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] sm:text-sm px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-[var(--foreground)]">
              Neues Passwort bestätigen
            </label>
            <div className="mt-1">
              <input
                id="confirmNewPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                minLength={8}
                required
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] sm:text-sm px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isChangingPassword}
            className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50 transition"
          >
            {isChangingPassword ? "Speichere..." : "Passwort ändern"}
          </button>
        </div>
      </form>
    </div>
  );
}
