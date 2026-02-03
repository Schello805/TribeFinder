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
      <section className="bg-[var(--primary)] text-[var(--primary-foreground)] py-20 px-4">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0 text-center md:text-left">
            <h1 className="tf-display text-4xl md:text-5xl font-bold mb-6">
              Verbinde dich mit der Tanzwelt
            </h1>
            <p className="text-xl mb-8 text-[var(--primary-foreground)]/90">
              Möchtest du wissen, ob es in deiner Nähe Gleichgesinnte gibt?
              Finde Tanzgruppen für Orientalischen Tanz, Tribal Style und mehr – und wachse gemeinsam.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link
                href="/groups"
                className="bg-[var(--surface)] text-[var(--foreground)] px-8 py-3 rounded-full font-bold text-lg hover:bg-[var(--surface-hover)] transition shadow-lg border border-[var(--border)]"
              >
                Gruppen finden
              </Link>
              <Link
                href="/auth/register"
                className="bg-transparent border-2 border-[var(--primary-foreground)] text-[var(--primary-foreground)] px-8 py-3 rounded-full font-bold text-lg hover:bg-[var(--primary-foreground)]/10 transition"
              >
                Gruppe erstellen
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="relative w-full max-w-md aspect-video bg-[var(--primary-foreground)]/10 backdrop-blur-sm rounded-lg shadow-2xl flex items-center justify-center border border-[var(--primary-foreground)]/20">
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
      <section className="py-14 bg-[var(--surface)] text-[var(--foreground)] border-b border-[var(--border)]">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="tf-display text-3xl font-bold text-[var(--foreground)]">Finde deine Tanz-Community</h2>
            <p className="mt-3 text-[var(--muted)] max-w-2xl mx-auto">
              Ob Bühnenprojekt, Training oder einfach Austausch: TribeFinder hilft dir, Menschen zu finden,
              mit denen du dich wohlfühlst und gemeinsam wachsen kannst.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[var(--surface-2)] p-7 rounded-xl border border-[var(--border)]">
              <div className="text-3xl mb-3">💜</div>
              <div className="tf-display text-lg font-bold text-[var(--foreground)]">Gemeinsam statt allein</div>
              <p className="mt-2 text-[var(--muted)]">
                Entdecke Gruppen in deiner Nähe und vernetze dich unkompliziert – ohne lange Suche.
              </p>
            </div>

            <div className="bg-[var(--surface-2)] p-7 rounded-xl border border-[var(--border)]">
              <div className="text-3xl mb-3">✨</div>
              <div className="tf-display text-lg font-bold text-[var(--foreground)]">Inspiration & Events</div>
              <p className="mt-2 text-[var(--muted)]">
                Finde Workshops, Auftritte und Szene-Events – und trage deine eigenen Termine ein.
              </p>
            </div>

            <div className="bg-[var(--surface-2)] p-7 rounded-xl border border-[var(--border)]">
              <div className="text-3xl mb-3">🌙</div>
              <div className="tf-display text-lg font-bold text-[var(--foreground)]">Dein Stil, dein Tempo</div>
              <p className="mt-2 text-[var(--muted)]">
                Von Orientalisch bis Tribal Fusion: Filter nach Tanzstil, Ort und Umkreis – so wie es zu dir passt.
              </p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center">
              <div className="text-sm text-[var(--muted)]">Schon dabei</div>
              <div className="mt-1 text-3xl font-extrabold text-[var(--primary)]">{groupCount}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">Tanzgruppen</div>
            </div>
            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center">
              <div className="text-sm text-[var(--muted)]">Aktuell geplant</div>
              <div className="mt-1 text-3xl font-extrabold text-[var(--primary)]">{eventCount}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">Events</div>
            </div>
            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center">
              <div className="text-sm text-[var(--muted)]">Mitglieder</div>
              <div className="mt-1 text-3xl font-extrabold text-[var(--primary)]">{userCount}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">in der Community</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[var(--bg)] text-[var(--foreground)]">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="tf-display text-3xl font-bold text-center mb-16 text-[var(--foreground)]">Was bietet TribeFinder?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[var(--surface)] p-8 rounded-xl shadow-sm hover:shadow-md transition border border-[var(--border)]">
              <div className="text-4xl mb-4">🗺️</div>
              <h3 className="tf-display text-xl font-bold mb-3 text-[var(--foreground)]">Interaktive Karte</h3>
              <p className="text-[var(--muted)]">
                Entdecke Tanzgruppen direkt auf der Karte. Finde schnell heraus, wer in deiner Umgebung tanzt und trainiert.
              </p>
            </div>

            <div className="bg-[var(--surface)] p-8 rounded-xl shadow-sm hover:shadow-md transition border border-[var(--border)]">
              <div className="text-4xl mb-4">👯‍♀️</div>
              <h3 className="tf-display text-xl font-bold mb-3 text-[var(--foreground)]">Gruppen-Profile</h3>
              <p className="text-[var(--muted)]">
                Erstelle einen detaillierten Steckbrief für deine Gruppe mit Beschreibung, Fotos, Tags und Kontaktmöglichkeiten.
              </p>
            </div>

            <div className="bg-[var(--surface)] p-8 rounded-xl shadow-sm hover:shadow-md transition border border-[var(--border)]">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="tf-display text-xl font-bold mb-3 text-[var(--foreground)]">Vernetzung</h3>
              <p className="text-[var(--muted)]">
                Werde Mitglied in Gruppen, vernetze dich mit anderen Tänzern und bleibe über die Szene informiert.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[var(--surface)] text-[var(--foreground)]">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="tf-display text-3xl font-bold mb-6 text-[var(--foreground)]">Bereit, sichtbar zu werden?</h2>
          <p className="text-xl text-[var(--muted)] mb-10">
            Registriere dich jetzt kostenlos und trage deine Tanzgruppe ein.
          </p>
          <Link
            href="/auth/register"
            className="bg-[var(--primary)] text-[var(--primary-foreground)] px-10 py-4 rounded-full font-bold text-lg hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition shadow-xl"
          >
            Jetzt registrieren
          </Link>
        </div>
      </section>
    </div>
  );
}
