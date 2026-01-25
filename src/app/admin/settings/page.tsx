'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import AdminEmailTest from '@/components/admin/AdminEmailTest';
import AdminNav from '@/components/admin/AdminNav';
import AdminEmbedMode from '@/components/admin/AdminEmbedMode';
import { normalizeUploadedImageUrl } from '@/lib/normalizeUploadedImageUrl';

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get('embed') === '1';
  const section = searchParams.get('section') || '';
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLogoSaving, setIsLogoSaving] = useState(false);
  const [formData, setFormData] = useState({
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_USER: '',
    SMTP_PASSWORD: '',
    SMTP_FROM: '"TribeFinder" <noreply@tribefinder.de>',
    SMTP_SECURE: 'false',
    MATOMO_URL: '',
    MATOMO_SITE_ID: '',
    MATOMO_TRACKING_CODE: '',
    BRANDING_LOGO_URL: '',
    SITE_BANNER_ENABLED: 'false',
    SITE_BANNER_TEXT: '',
    SITE_BANNER_BG: '#f59e0b',
    SITE_BANNER_TEXT_COLOR: '#ffffff',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    } else if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchSettings();
    }
  }, [status, session, router]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        // Merge mit Defaults, falls keys existieren
        setFormData(prev => ({
          ...prev,
          ...data
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setIsLogoSaving(true);
    setMessage('');

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/admin/branding/logo', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data?.error || 'Fehler beim Logo-Upload.');
        return;
      }

      setFormData(prev => ({ ...prev, BRANDING_LOGO_URL: data.logoUrl || '' }));
      setMessage('Logo gespeichert!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error uploading logo:', error);
      setMessage('Fehler beim Logo-Upload.');
    } finally {
      setIsLogoSaving(false);
    }
  };

  const handleLogoRemove = async () => {
    setIsLogoSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/branding/logo', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data?.error || 'Fehler beim Entfernen.');
        return;
      }

      setFormData(prev => ({ ...prev, BRANDING_LOGO_URL: '' }));
      setMessage('Logo entfernt.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error removing logo:', error);
      setMessage('Fehler beim Entfernen.');
    } finally {
      setIsLogoSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked ? 'true' : 'false' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setMessage('Einstellungen gespeichert!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Fehler beim Speichern.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Ein Fehler ist aufgetreten.');
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return <div className="p-8 text-center text-gray-900 dark:text-gray-100">Laden...</div>;
  }

  if (session?.user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <AdminEmbedMode />

      {!isEmbed ? (
        <>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">System Einstellungen</h1>

          <div className="mb-6">
            <AdminNav />
          </div>
        </>
      ) : null}

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-8 border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Branding</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Webapp Logo (Navbar/Footer).</p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="w-16 h-16 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {formData.BRANDING_LOGO_URL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={normalizeUploadedImageUrl(formData.BRANDING_LOGO_URL) ?? ""} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">💃</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {isLogoSaving ? 'Wird hochgeladen...' : 'Logo hochladen'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={isLogoSaving}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoUpload(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isLogoSaving || !formData.BRANDING_LOGO_URL}
                  onClick={handleLogoRemove}
                  className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition"
                >
                  Entfernen
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Empfohlen: quadratisches Bild, max. 5MB (PNG/JPG/WebP/GIF). Wird in <code>public/uploads</code> gespeichert.
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Banner</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Seitenübergreifender Hinweis ganz oben (z.B. Wartungen ankündigen).</p>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              name="SITE_BANNER_ENABLED"
              checked={String(formData.SITE_BANNER_ENABLED).toLowerCase() === 'true'}
              onChange={handleCheckboxChange}
              className="h-4 w-4"
            />
            Banner aktivieren
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Text</label>
            <input
              type="text"
              name="SITE_BANNER_TEXT"
              value={formData.SITE_BANNER_TEXT}
              onChange={handleChange}
              placeholder="Wartung heute 22:00-22:10"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hintergrundfarbe</label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="color"
                name="SITE_BANNER_BG"
                value={formData.SITE_BANNER_BG || '#f59e0b'}
                onChange={handleChange}
                className="h-10 w-14 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
              <input
                type="text"
                name="SITE_BANNER_BG"
                value={formData.SITE_BANNER_BG}
                onChange={handleChange}
                placeholder="#f59e0b"
                className="block w-40 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Textfarbe</label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="color"
                name="SITE_BANNER_TEXT_COLOR"
                value={formData.SITE_BANNER_TEXT_COLOR || '#ffffff'}
                onChange={handleChange}
                className="h-10 w-14 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
              <input
                type="text"
                name="SITE_BANNER_TEXT_COLOR"
                value={formData.SITE_BANNER_TEXT_COLOR}
                onChange={handleChange}
                placeholder="#ffffff"
                className="block w-40 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Vorschau: wird direkt nach dem Speichern oben auf jeder Seite angezeigt.
          </div>
        </div>
      </div>

      {isEmbed && section === 'design' ? null : (
        <>

      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Email Konfiguration (SMTP)</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Diese Einstellungen überschreiben die Umgebungsvariablen (.env).
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              
              <div className="sm:col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SMTP Host</label>
                <input
                  type="text"
                  name="SMTP_HOST"
                  value={formData.SMTP_HOST}
                  onChange={handleChange}
                  placeholder="smtp.example.com"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Port</label>
                <input
                  type="text"
                  name="SMTP_PORT"
                  value={formData.SMTP_PORT}
                  onChange={handleChange}
                  placeholder="587"
                  inputMode="numeric"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Benutzername</label>
                <input
                  type="text"
                  name="SMTP_USER"
                  value={formData.SMTP_USER}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Passwort</label>
                <input
                  type="password"
                  name="SMTP_PASSWORD"
                  value={formData.SMTP_PASSWORD}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Absender Adresse (From)</label>
                <input
                  type="text"
                  name="SMTP_FROM"
                  value={formData.SMTP_FROM}
                  onChange={handleChange}
                  placeholder='"TribeFinder" <noreply@tribefinder.de>'
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SSL/TLS</label>
                <select
                  name="SMTP_SECURE"
                  value={formData.SMTP_SECURE}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
                >
                  <option value="false">Nein (STARTTLS)</option>
                  <option value="true">Ja (SSL/TLS)</option>
                </select>
              </div>

            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-8 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-green-600 h-6">
            {message}
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSaving ? 'Speichere...' : 'Einstellungen speichern'}
          </button>
        </div>
      </form>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-8 border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Verbindung testen</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Sende eine Test-Email, um die gespeicherte Konfiguration zu prüfen.
          </p>
          <AdminEmailTest currentUserEmail={session?.user?.email || ""} />
        </div>
      </div>

      {/* Analytics / Matomo Section */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-transparent dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Analytics (Matomo)</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Füge deinen Matomo-Tracking-Code ein, um Besucher zu analysieren.
          </p>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Matomo URL</label>
                <input
                  type="text"
                  name="MATOMO_URL"
                  value={formData.MATOMO_URL}
                  onChange={handleChange}
                  placeholder="https://analytics.example.com/"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Site ID</label>
                <input
                  type="text"
                  name="MATOMO_SITE_ID"
                  value={formData.MATOMO_SITE_ID}
                  onChange={handleChange}
                  placeholder="1"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Oder: Tracking Code (kopiere den gesamten Code aus Matomo)
                </label>
                <textarea
                  name="MATOMO_TRACKING_CODE"
                  value={formData.MATOMO_TRACKING_CODE}
                  onChange={handleChange}
                  rows={6}
                  placeholder="<!-- Matomo -->
<script>
  var _paq = window._paq = window._paq || [];
  ...
</script>
<!-- End Matomo Code -->"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-gray-700 font-mono text-xs"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Falls du den kompletten Tracking-Code einfügst, werden URL und Site ID ignoriert.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSaving ? 'Speichere...' : 'Speichern'}
              </button>
            </div>
          </form>
        </div>
      </div>

        </>
      )}
    </div>
  );
}
