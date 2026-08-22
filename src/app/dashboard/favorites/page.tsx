import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import ImageWithFallback from "@/components/ui/ImageWithFallback";

type TagLike = { id: string; name: string };
type LocationLike = { address: string | null };
type GroupLike = {
  id: string;
  name: string;
  description: string;
  image: string | null;
  location: LocationLike | null;
  tags: TagLike[];
};
type FavoriteRowLike = { group: GroupLike };
type FavoriteEventRowLike = {
  remindWeek: boolean;
  remindDay: boolean;
  event: {
    id: string;
    title: string;
    startDate: Date;
    locationName: string | null;
    address: string | null;
    group: { name: string } | null;
  };
};

export default async function FavoritesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const [favorites, favoriteEvents] = await Promise.all([
    prisma.favoriteGroup.findMany({
      where: { userId: session.user.id },
      include: {
        group: {
          include: {
            location: true,
            tags: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }) as unknown as Promise<FavoriteRowLike[]>,
    prisma.favoriteEvent.findMany({
      where: { userId: session.user.id, event: { startDate: { gte: new Date() } } },
      include: { event: { include: { group: { select: { name: true } } } } },
      orderBy: { event: { startDate: "asc" } },
    }) as unknown as Promise<FavoriteEventRowLike[]>,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="tf-display text-2xl font-bold text-[var(--foreground)]">Meine Favoriten</h2>
        <p className="text-[var(--muted)] mt-2">
          Deine gemerkten Events und Gruppen
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="tf-display text-xl font-bold text-[var(--foreground)]">Gemerkte Events</h3>
          <Link href="/events" className="text-sm text-[var(--link)] hover:underline">Events entdecken</Link>
        </div>
        {favoriteEvents.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">Noch keine kommenden Events gemerkt.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {favoriteEvents.map(({ event, remindWeek, remindDay }) => (
              <Link key={event.id} href={`/events/${event.id}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 hover:bg-[var(--surface-hover)] transition">
                <div className="font-bold text-[var(--foreground)]">{event.title}</div>
                <div className="mt-1 text-sm text-[var(--muted)]">{new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(event.startDate)}</div>
                <div className="mt-1 text-sm text-[var(--muted)]">{event.locationName || event.address || event.group?.name || "Ort nicht angegeben"}</div>
                <div className="mt-2 text-xs text-[var(--muted)]">Erinnerung: {[remindWeek ? "7 Tage" : "", remindDay ? "1 Tag" : ""].filter(Boolean).join(" und ") || "aus"}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <h3 className="tf-display text-xl font-bold text-[var(--foreground)]">Favorisierte Gruppen</h3>

      {favorites.length === 0 ? (
        <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-lg shadow-sm border border-[var(--border)] p-12 text-center">
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="tf-display text-lg font-bold text-[var(--foreground)] mb-2">
              Noch keine Favoriten
            </h3>
            <p className="text-[var(--muted)] mb-6">
              Entdecke Gruppen und füge sie zu deinen Favoriten hinzu
            </p>
            <Link
              href="/groups"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition font-medium"
            >
              Gruppen entdecken
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map(({ group }) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="bg-[var(--surface)] text-[var(--foreground)] rounded-lg shadow-sm border border-[var(--border)] overflow-hidden hover:shadow-md transition group"
            >
              {group.image ? (
                <div className="relative h-48 w-full">
                  <ImageWithFallback
                    src={group.image}
                    alt={group.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 bg-[var(--surface-2)] flex items-center justify-center">
                  <span className="text-6xl">💃</span>
                </div>
              )}
              <div className="p-4">
                <h3 className="font-bold text-lg text-[var(--foreground)] mb-2 group-hover:text-[var(--link)] transition">
                  {group.name}
                </h3>
                <p className="text-sm text-[var(--muted)] line-clamp-2 mb-3">
                  {group.description}
                </p>
                {group.location && (
                  <p className="text-xs text-[var(--muted)] flex items-center gap-1 mb-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {group.location.address}
                  </p>
                )}
                {group.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {group.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="text-xs bg-[var(--surface-2)] text-[var(--foreground)] px-2 py-1 rounded-full border border-[var(--border)]"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
