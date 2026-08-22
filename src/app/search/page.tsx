import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Suche | TribeFinder",
  description: "Durchsuche Tanzgruppen, Events, Tänzerinnen und Tanzstile auf TribeFinder.",
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim() || "";
  const session = await getServerSession(authOptions);

  const [groups, events, dancers, styles] = q.length >= 2
    ? await Promise.all([
        prisma.group.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { location: { address: { contains: q, mode: "insensitive" } } },
              { danceStyles: { some: { style: { name: { contains: q, mode: "insensitive" } } } } },
            ],
          },
          select: { id: true, name: true, description: true, location: { select: { address: true } } },
          take: 8,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.event.findMany({
          where: {
            startDate: { gte: new Date() },
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { locationName: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
              { danceStyles: { some: { style: { name: { contains: q, mode: "insensitive" } } } } },
            ],
          },
          select: { id: true, title: true, startDate: true, locationName: true, address: true },
          take: 8,
          orderBy: { startDate: "asc" },
        }),
        prisma.user.findMany({
          where: {
            isDancerProfileEnabled: true,
            ...(session?.user?.id ? {} : { isDancerProfilePrivate: false }),
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { dancerName: { contains: q, mode: "insensitive" } },
              { bio: { contains: q, mode: "insensitive" } },
              { danceStyles: { some: { style: { name: { contains: q, mode: "insensitive" } } } } },
            ],
          },
          select: { id: true, name: true, dancerName: true, bio: true },
          take: 8,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.danceStyle.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { formerName: { contains: q, mode: "insensitive" } },
              { aliases: { some: { name: { contains: q, mode: "insensitive" } } } },
            ],
          },
          select: { id: true, name: true, category: true, description: true },
          take: 8,
          orderBy: { name: "asc" },
        }),
      ])
    : [[], [], [], []];

  const total = groups.length + events.length + dancers.length + styles.length;
  const cardClass = "block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 hover:bg-[var(--surface-hover)] transition";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="tf-display text-3xl font-bold text-[var(--foreground)]">TribeFinder durchsuchen</h1>
        <form action="/search" className="mt-4 flex gap-2">
          <input name="q" defaultValue={q} minLength={2} autoFocus placeholder="z. B. Fusion Workshop Nürnberg" className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)]" />
          <button className="rounded-md bg-[var(--primary)] px-5 py-3 font-medium text-[var(--primary-foreground)]">Suchen</button>
        </form>
        {q.length === 1 ? <p className="mt-2 text-sm text-[var(--muted)]">Bitte mindestens zwei Zeichen eingeben.</p> : null}
        {q.length >= 2 ? <p className="mt-2 text-sm text-[var(--muted)]">{total} Treffer für „{q}“</p> : null}
      </div>

      {q.length >= 2 && total === 0 ? <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">Keine passenden Ergebnisse gefunden.</div> : null}

      {groups.length > 0 ? <section><h2 className="tf-display mb-3 text-xl font-bold">Gruppen</h2><div className="grid gap-3 sm:grid-cols-2">{groups.map((group) => <Link key={group.id} href={`/groups/${group.id}`} className={cardClass}><div className="font-bold">{group.name}</div><div className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{group.description}</div>{group.location?.address ? <div className="mt-2 text-xs text-[var(--muted)]">📍 {group.location.address}</div> : null}</Link>)}</div></section> : null}
      {events.length > 0 ? <section><h2 className="tf-display mb-3 text-xl font-bold">Events</h2><div className="grid gap-3 sm:grid-cols-2">{events.map((event) => <Link key={event.id} href={`/events/${event.id}`} className={cardClass}><div className="font-bold">{event.title}</div><div className="mt-1 text-sm text-[var(--muted)]">{new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(event.startDate)}</div><div className="mt-1 text-xs text-[var(--muted)]">📍 {event.locationName || event.address}</div></Link>)}</div></section> : null}
      {dancers.length > 0 ? <section><h2 className="tf-display mb-3 text-xl font-bold">Tänzerinnen</h2><div className="grid gap-3 sm:grid-cols-2">{dancers.map((dancer) => <Link key={dancer.id} href={`/users/${dancer.id}`} className={cardClass}><div className="font-bold">{dancer.dancerName || dancer.name || "Tänzerin"}</div>{dancer.bio ? <div className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{dancer.bio}</div> : null}</Link>)}</div></section> : null}
      {styles.length > 0 ? <section><h2 className="tf-display mb-3 text-xl font-bold">Tanzstile</h2><div className="grid gap-3 sm:grid-cols-2">{styles.map((style) => <Link key={style.id} href={`/dance-styles/${style.id}`} className={cardClass}><div className="font-bold">{style.name}</div><div className="mt-1 text-sm text-[var(--muted)]">{style.category || style.description || "Tanzstil"}</div></Link>)}</div></section> : null}
    </div>
  );
}
