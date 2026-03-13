import Link from "next/link";
import prisma from "@/lib/prisma";
import Image from "next/image";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";
import HomeStats from "@/components/home/HomeStats";
import PwaInstallPromo from "@/components/pwa/PwaInstallPromo";

function getExternalLinkDelegate(p: typeof prisma) {
  return (p as unknown as { externalLink?: unknown }).externalLink as
    | undefined
    | {
        groupBy: (args: unknown) => Promise<Array<{ category: string | null; _count: { _all: number } }>>;
      };
}

export default async function Home() {
  // Fetch stats
  let groupCount = 0;
  let eventCount = 0;
  let userCount = 0;
  let brandingLogoUrl = "";
  let heroLogoUrl = "";
  let linkCountsByCategory: Array<{ category: string; count: number }> = [];
  let upcomingEvents: Array<{
    id: string;
    title: string;
    startDate: Date;
    locationName: string | null;
    groupId: string | null;
    groupName: string | null;
  }> = [];
  try {
    const linkDelegate = getExternalLinkDelegate(prisma);

    const linkCounts = linkDelegate
      ? await linkDelegate.groupBy({
          by: ["category"],
          where: { status: "APPROVED", archivedAt: null },
          _count: { _all: true },
        })
      : [];

    const normalizedLinkCounts = (linkCounts || [])
      .map((r) => ({
        category: (r.category || "Ohne Kategorie").trim() || "Ohne Kategorie",
        count: r._count?._all ?? 0,
      }))
      .filter((x) => x.count > 0);

    normalizedLinkCounts.sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
    linkCountsByCategory = normalizedLinkCounts;

    const [g, e, u, settings, events] = await Promise.all([
      prisma.group.count(),
      prisma.event.count({ where: { startDate: { gte: new Date() } } }),
      prisma.user.count(),
      prisma.systemSetting.findMany({
        where: { key: { in: ["BRANDING_LOGO_URL", "BRANDING_HERO_LOGO_URL"] } },
      }),
      prisma.event.findMany({
        where: { startDate: { gte: new Date() } },
        orderBy: { startDate: "asc" },
        take: 6,
        select: {
          id: true,
          title: true,
          startDate: true,
          locationName: true,
          groupId: true,
          group: { select: { name: true } },
        },
      }) as Promise<
        Array<{
          id: string;
          title: string;
          startDate: Date;
          locationName: string | null;
          groupId: string | null;
          group: { name: string } | null;
        }>
      >,
    ]);
    groupCount = g;
    eventCount = e;
    userCount = u;

    upcomingEvents = events.map((ev: { id: string; title: string; startDate: Date; locationName: string | null; groupId: string | null; group: { name: string } | null }) => ({
      id: ev.id,
      title: ev.title,
      startDate: ev.startDate,
      locationName: ev.locationName,
      groupId: ev.groupId,
      groupName: ev.group?.name ?? null,
    }));

    const map = (settings as Array<{ key: string; value: string }>).reduce((acc: Record<string, string>, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    brandingLogoUrl = normalizeUploadedImageUrl(map.BRANDING_LOGO_URL) ?? "";
    heroLogoUrl = normalizeUploadedImageUrl(map.BRANDING_HERO_LOGO_URL) ?? "";
  } catch {
    // Intentionally ignore to keep homepage functional even if Prisma is unhealthy.
  }

  const isVideoUrl = (url: string) => /\.(mp4|webm)(\?|#|$)/i.test(String(url || "").trim());
  const heroAssetUrl = heroLogoUrl || brandingLogoUrl;

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      {/* Hero Section */}
      <section className="relative py-6 md:py-8">
        <div className="hidden md:block pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-[var(--primary)]" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-black" />
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2">
          <div className="bg-[var(--primary)] md:bg-transparent text-[var(--primary-foreground)] px-4 py-6 md:px-8 md:py-8 flex flex-col justify-center">
            <div className="mx-auto w-full max-w-xl text-center md:text-left">
              <h1 className="tf-display text-3xl md:text-4xl font-bold mb-4">
                Finde Events, Gruppen und Auftritte in deiner Nähe
              </h1>
              <p className="text-base md:text-lg mb-6 text-[var(--primary-foreground)]/90">
                Entdecke Trainings, Bühnenprojekte und Community.
                Ohne Anmeldung stöbern – zum Eintragen später kostenlos registrieren.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link
                  href="/map"
                  className="bg-[var(--surface)] text-[var(--foreground)] px-6 py-2.5 rounded-full font-bold text-base hover:bg-[var(--surface-hover)] transition shadow-lg border border-[var(--border)]"
                >
                  Zur Karte
                </Link>
                <Link
                  href="/events"
                  className="bg-transparent border-2 border-[var(--primary-foreground)] text-[var(--primary-foreground)] px-6 py-2.5 rounded-full font-bold text-base hover:bg-[var(--primary-foreground)]/10 transition"
                >
                  Events entdecken
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 justify-center md:justify-start">
                <Link
                  href="/taenzerinnen"
                  className="text-sm font-semibold text-[var(--primary-foreground)]/95 underline underline-offset-4 hover:opacity-90 transition"
                >
                  Tänzerinnen finden
                </Link>
                <Link
                  href="/auth/register"
                  className="text-sm font-semibold text-[var(--primary-foreground)]/95 underline underline-offset-4 hover:opacity-90 transition"
                >
                  Kostenlos registrieren
                </Link>
                <Link
                  href="/groups/create"
                  className="text-sm font-semibold text-[var(--primary-foreground)]/95 underline underline-offset-4 hover:opacity-90 transition"
                >
                  Gruppe eintragen
                </Link>
              </div>
            </div>
          </div>
          <div className="relative bg-black md:bg-transparent text-white px-4 py-6 md:px-8 md:py-8 flex items-stretch justify-center md:border-l md:border-black/10 dark:md:border-white/10">
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="w-full max-w-md">
                {heroAssetUrl ? (
                  isVideoUrl(heroAssetUrl) ? (
                    <div className="w-full h-full rounded-2xl bg-black p-4 flex items-center justify-center">
                      <span className="relative z-10 inline-flex [filter:drop-shadow(0_14px_28px_rgba(0,0,0,0.28))_drop-shadow(0_6px_10px_rgba(0,0,0,0.16))]">
                        <video
                          src={heroAssetUrl}
                          className="h-full w-full object-contain"
                          muted
                          autoPlay
                          loop
                          playsInline
                        />
                      </span>
                    </div>
                  ) : (
                    <div className="h-full aspect-square bg-black rounded-full overflow-hidden flex items-center justify-center p-3">
                      <span className="relative z-10 inline-flex w-full h-full [filter:drop-shadow(0_14px_28px_rgba(0,0,0,0.28))_drop-shadow(0_6px_10px_rgba(0,0,0,0.16))]">
                        <Image
                          src={heroAssetUrl}
                          alt="TribeFinder"
                          width={280}
                          height={280}
                          className="h-full w-full object-contain"
                          unoptimized
                        />
                      </span>
                    </div>
                  )
                ) : (
                  <span className="relative z-10 text-5xl">💃</span>
                )}
              </div>
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
              Ob Training, Bühnenprojekt oder Austausch: TribeFinder hilft dir, in deiner Region die richtigen Menschen zu finden.
            </p>
          </div>

          <HomeStats
            radiusKm={25}
            globalGroups={groupCount}
            globalEvents={eventCount}
            globalMembers={userCount}
            globalLinkCountsByCategory={linkCountsByCategory}
          />
        </div>
      </section>

      <section className="py-16 bg-[var(--bg)] text-[var(--foreground)] border-b border-[var(--border)]">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="tf-display text-3xl font-bold text-[var(--foreground)]">Nächste Events</h2>
              <p className="mt-2 text-[var(--muted)]">Workshops, Partys und Trainings – direkt zum Anklicken.</p>
            </div>
            <Link
              href="/events"
              className="text-sm font-semibold text-[var(--link)] hover:opacity-90 transition"
            >
              Alle Events ansehen
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="mt-8 text-center py-12 bg-[var(--surface)] text-[var(--foreground)] rounded-lg border border-dashed border-[var(--border)]">
              <p className="text-[var(--muted)]">Aktuell keine kommenden Events gefunden.</p>
              <div className="mt-4">
                <Link
                  href="/events/create"
                  className="inline-flex items-center px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md font-semibold hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition"
                >
                  + Event eintragen
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingEvents.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:shadow-md transition block"
                >
                  <div className="text-xs text-[var(--muted)]">
                    {new Intl.DateTimeFormat("de-DE", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/Berlin",
                      hourCycle: "h23",
                    }).format(ev.startDate)}
                    {ev.locationName ? ` • ${ev.locationName}` : ""}
                  </div>
                  <div className="mt-2 tf-display text-lg font-bold text-[var(--foreground)] line-clamp-2">
                    {ev.title}
                  </div>
                  {ev.groupId && ev.groupName ? (
                    <div className="mt-2 text-sm text-[var(--muted)] line-clamp-1">
                      👥 {ev.groupName}
                    </div>
                  ) : null}
                  <div className="mt-4 text-sm font-semibold text-[var(--link)]">Details</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[var(--bg)] text-[var(--foreground)]">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="tf-display text-3xl font-bold text-center mb-16 text-[var(--foreground)]">Was bietet TribeFinder?</h2>
          
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
            <Link
              href="/map"
              className="group bg-[var(--surface)] p-7 rounded-2xl shadow-sm hover:shadow-md transition border border-[var(--border)] block hover:-translate-y-0.5"
            >
              <div className="h-full flex flex-col">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-2xl">
                  🗺️
                </div>
                <h3 className="mt-4 tf-display text-lg font-bold text-[var(--foreground)] line-clamp-2 break-words min-h-[3.25rem]">
                  Interaktive Karte
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  Entdecke Tanzgruppen direkt auf der Karte. Finde schnell heraus, wer in deiner Umgebung tanzt und trainiert.
                </p>
                <div className="mt-auto pt-4 text-sm font-semibold text-[var(--link)] group-hover:opacity-90 transition">
                  Zur Karte
                </div>
              </div>
            </Link>

            <Link
              href="/events"
              className="group bg-[var(--surface)] p-7 rounded-2xl shadow-sm hover:shadow-md transition border border-[var(--border)] block hover:-translate-y-0.5"
            >
              <div className="h-full flex flex-col">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-2xl">
                  📅
                </div>
                <h3 className="mt-4 tf-display text-lg font-bold text-[var(--foreground)] line-clamp-2 break-words min-h-[3.25rem]">
                  Events & Kalender
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  Finde Workshops, Partys, offene Trainings und Shows – und trage eigene Events ein.
                </p>
                <div className="mt-auto pt-4 text-sm font-semibold text-[var(--link)] group-hover:opacity-90 transition">
                  Zu den Events
                </div>
              </div>
            </Link>

            <Link
              href="/groups"
              className="group bg-[var(--surface)] p-7 rounded-2xl shadow-sm hover:shadow-md transition border border-[var(--border)] block hover:-translate-y-0.5"
            >
              <div className="h-full flex flex-col">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-2xl">
                  👯‍♀️
                </div>
                <h3 className="mt-4 tf-display text-lg font-bold text-[var(--foreground)] line-clamp-2 break-words min-h-[3.25rem]">
                  Gruppen-Profile
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  Erstelle einen detaillierten Steckbrief für deine Gruppe mit Beschreibung, Fotos, Tags und Kontaktmöglichkeiten.
                </p>
                <div className="mt-auto pt-4 text-sm font-semibold text-[var(--link)] group-hover:opacity-90 transition">
                  Zu den Gruppen
                </div>
              </div>
            </Link>

            <Link
              href="/taenzerinnen"
              className="group bg-[var(--surface)] p-7 rounded-2xl shadow-sm hover:shadow-md transition border border-[var(--border)] block hover:-translate-y-0.5"
            >
              <div className="h-full flex flex-col">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-2xl">
                  💃
                </div>
                <h3 className="mt-4 tf-display text-lg font-bold text-[var(--foreground)] line-clamp-2 break-words min-h-[3.25rem]">
                  Tänzerinnenprofil
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  Zeige dich mit Bio, Links, Unterricht/Workshops und Buchbarkeit – für Training und Auftritte.
                </p>
                <div className="mt-auto pt-4 text-sm font-semibold text-[var(--link)] group-hover:opacity-90 transition">
                  Zu den Tänzerinnen
                </div>
              </div>
            </Link>

            <Link
              href="/marketplace"
              className="group bg-[var(--surface)] p-7 rounded-2xl shadow-sm hover:shadow-md transition border border-[var(--border)] block hover:-translate-y-0.5"
            >
              <div className="h-full flex flex-col">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-2xl">
                  🛍️
                </div>
                <h3 className="mt-4 tf-display text-lg font-bold text-[var(--foreground)] line-clamp-2 break-words min-h-[3.25rem]">
                  Second-Hand
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  Second-Hand für Kostüme, Schmuck & mehr – mit Bildern, Standort und direktem 1:1 Kontakt.
                </p>
                <div className="mt-auto pt-4 text-sm font-semibold text-[var(--link)] group-hover:opacity-90 transition">
                  Zu Second-Hand
                </div>
              </div>
            </Link>

            <Link
              href="/links"
              className="group bg-[var(--surface)] p-7 rounded-2xl shadow-sm hover:shadow-md transition border border-[var(--border)] block hover:-translate-y-0.5"
            >
              <div className="h-full flex flex-col">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-2xl">
                  🔗
                </div>
                <h3 className="mt-4 tf-display text-lg font-bold text-[var(--foreground)] line-clamp-2 break-words min-h-[3.25rem]">
                  Links
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  Entdecke externe Websites (z.B. Tanzschulen, Shops, Communities) – mit Kategorien und Vorschlagsfunktion.
                </p>
                <div className="mt-auto pt-4 text-sm font-semibold text-[var(--link)] group-hover:opacity-90 transition">
                  Zu den Links
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[var(--surface)] text-[var(--foreground)]">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="tf-display text-3xl font-bold mb-6 text-[var(--foreground)]">Bereit, sichtbar zu werden?</h2>
          <p className="text-xl text-[var(--muted)] mb-10">
            Registriere dich kostenlos und trage dein Profil, deine Gruppe oder dein Event ein.
          </p>

          <div className="mb-8 text-left">
            <PwaInstallPromo variant="card" />
          </div>

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
