import Link from "next/link";
import prisma from "@/lib/prisma";
import Image from "next/image";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

export default async function Home() {
  // Fetch stats
  let groupCount = 0;
  let eventCount = 0;
  let userCount = 0;
  let brandingLogoUrl = "";
  try {
    const [g, e, u, settings] = await Promise.all([
      prisma.group.count(),
      prisma.event.count({ where: { startDate: { gte: new Date() } } }),
      prisma.user.count(),
      prisma.systemSetting.findMany({
        where: { key: { in: ["BRANDING_LOGO_URL"] } },
      }),
    ]);
    groupCount = g;
    eventCount = e;
    userCount = u;

    const map = settings.reduce((acc: Record<string, string>, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    brandingLogoUrl = normalizeUploadedImageUrl(map.BRANDING_LOGO_URL) ?? "";
  } catch {
    // Intentionally ignore to keep homepage functional even if Prisma is unhealthy.
  }
  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20 px-4">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0 text-center md:text-left">
            <h1 className="tf-display text-4xl md:text-5xl font-bold mb-6">
              Verbinde dich mit der Tanzwelt
            </h1>
            <p className="text-xl mb-8 text-indigo-100">
              Möchtest du wissen, ob es in deiner Nähe Gleichgesinnte gibt?
              Finde Tanzgruppen für Orientalischen Tanz, Tribal Style und mehr – und wachse gemeinsam.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link
                href="/groups"
                className="bg-white text-indigo-600 px-8 py-3 rounded-full font-bold text-lg hover:bg-indigo-50 transition shadow-lg"
              >
                Gruppen finden
              </Link>
              <Link
                href="/auth/register"
                className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-white/10 transition"
              >
                Gruppe erstellen
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="relative w-full max-w-md aspect-video bg-white/10 backdrop-blur-sm rounded-lg shadow-2xl flex items-center justify-center border border-white/20">
              {brandingLogoUrl ? (
                <Image src={brandingLogoUrl} alt="TribeFinder" width={256} height={256} className="max-h-40 w-auto" unoptimized />
              ) : (
                <span className="text-6xl">💃</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="tf-display text-3xl font-bold text-gray-900 dark:text-gray-100">Finde deine Tanz-Community</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Ob Bühnenprojekt, Training oder einfach Austausch: TribeFinder hilft dir, Menschen zu finden,
              mit denen du dich wohlfühlst und gemeinsam wachsen kannst.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-50 dark:bg-gray-800/60 p-7 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="text-3xl mb-3">💜</div>
              <div className="tf-display text-lg font-bold text-gray-900 dark:text-gray-100">Gemeinsam statt allein</div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Entdecke Gruppen in deiner Nähe und vernetze dich unkompliziert – ohne lange Suche.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/60 p-7 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="text-3xl mb-3">✨</div>
              <div className="tf-display text-lg font-bold text-gray-900 dark:text-gray-100">Inspiration & Events</div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Finde Workshops, Auftritte und Szene-Events – und trage deine eigenen Termine ein.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/60 p-7 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="text-3xl mb-3">🌙</div>
              <div className="tf-display text-lg font-bold text-gray-900 dark:text-gray-100">Dein Stil, dein Tempo</div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Von Orientalisch bis Tribal Fusion: Filter nach Tanzstil, Ort und Umkreis – so wie es zu dir passt.
              </p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Schon dabei</div>
              <div className="mt-1 text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{groupCount}</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Tanzgruppen</div>
            </div>
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Aktuell geplant</div>
              <div className="mt-1 text-3xl font-extrabold text-purple-600 dark:text-purple-400">{eventCount}</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Events</div>
            </div>
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Mitglieder</div>
              <div className="mt-1 text-3xl font-extrabold text-pink-600 dark:text-pink-400">{userCount}</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">in der Community</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="tf-display text-3xl font-bold text-center mb-16 text-gray-800 dark:text-gray-100">Was bietet TribeFinder?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 dark:border-gray-700">
              <div className="text-4xl mb-4">🗺️</div>
              <h3 className="tf-display text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">Interaktive Karte</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Entdecke Tanzgruppen direkt auf der Karte. Finde schnell heraus, wer in deiner Umgebung tanzt und trainiert.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 dark:border-gray-700">
              <div className="text-4xl mb-4">👯‍♀️</div>
              <h3 className="tf-display text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">Gruppen-Profile</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Erstelle einen detaillierten Steckbrief für deine Gruppe mit Beschreibung, Fotos, Tags und Kontaktmöglichkeiten.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 dark:border-gray-700">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="tf-display text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">Vernetzung</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Werde Mitglied in Gruppen, vernetze dich mit anderen Tänzern und bleibe über die Szene informiert.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="tf-display text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Bereit, sichtbar zu werden?</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10">
            Registriere dich jetzt kostenlos und trage deine Tanzgruppe ein.
          </p>
          <Link
            href="/auth/register"
            className="bg-indigo-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-indigo-700 transition shadow-xl"
          >
            Jetzt registrieren
          </Link>
        </div>
      </section>
    </div>
  );
}
