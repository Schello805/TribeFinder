import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import DeleteEventButton from "@/components/events/DeleteEventButton";
import DuplicateEventButton from "@/components/events/DuplicateEventButton";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

export default async function GroupEventsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  // Check ownership or admin status
  const group = await prisma.group.findUnique({
    where: { id },
    select: { ownerId: true, name: true }
  });

  if (!group) {
    return <div className="p-8 text-center">Gruppe nicht gefunden</div>;
  }

  if (group.ownerId !== session.user.id) {
    // Check if user is an admin member
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: id,
        },
      },
    });

    if (!membership || membership.role !== "ADMIN" || membership.status !== "APPROVED") {
      return <div className="p-8 text-center">Nicht autorisiert</div>;
    }
  }

  const now = new Date();

  const [upcomingEvents, archivedEvents] = await Promise.all([
    prisma.event.findMany({
      where: { groupId: id, startDate: { gte: now } },
      orderBy: { startDate: "asc" },
    }),
    prisma.event.findMany({
      where: { groupId: id, startDate: { lt: now } },
      orderBy: { startDate: "desc" },
      take: 200,
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-[var(--foreground)]">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="tf-display text-2xl font-bold text-[var(--foreground)]">Events verwalten</h1>
          <p className="text-[var(--muted)]">für {group.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <Link
            href="/dashboard"
            className="text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Zurück zum Dashboard
          </Link>
          <Link
            href={`/groups/${id}/events/create`}
            className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-md hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition shadow-sm"
          >
            Neues Event
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-[var(--surface)] text-[var(--foreground)] shadow overflow-hidden sm:rounded-lg border border-[var(--border)]">
          <div className="px-4 py-3 sm:px-6 border-b border-[var(--border)]">
            <div className="tf-display text-lg font-bold text-[var(--foreground)]">Kommende Events</div>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted)]">Keine kommenden Events.</div>
          ) : (
            <ul role="list" className="divide-y divide-[var(--border)]">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="px-4 py-4 sm:px-6 hover:bg-[var(--surface-hover)] transition">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/events/${event.id}`} className="block hover:underline">
                        <p className="text-sm font-medium text-[var(--link)] whitespace-normal break-words line-clamp-2">{event.title}</p>
                      </Link>
                      <p className="text-sm text-[var(--muted)]">
                        {new Date(event.startDate).toLocaleDateString("de-DE", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Europe/Berlin",
                        })}
                      </p>
                      <p className="text-sm text-[var(--muted)]">{event.locationName || "Kein Ort angegeben"}</p>
                      <div className="flex gap-3 mt-1">
                        {event.flyer1 && (
                          <a
                            href={normalizeUploadedImageUrl(event.flyer1) ?? ""}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--link)] hover:opacity-90 flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            Flyer 1
                          </a>
                        )}
                        {event.flyer2 && (
                          <a
                            href={normalizeUploadedImageUrl(event.flyer2) ?? ""}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--link)] hover:opacity-90 flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            Flyer 2
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <Link
                        href={`/groups/${id}/events/${event.id}/edit`}
                        className="text-[var(--link)] hover:opacity-90 text-sm font-medium"
                      >
                        Bearbeiten
                      </Link>
                      <DuplicateEventButton eventId={event.id} />
                      <DeleteEventButton eventId={event.id} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-[var(--surface)] text-[var(--foreground)] shadow overflow-hidden sm:rounded-lg border border-[var(--border)]">
          <div className="px-4 py-3 sm:px-6 border-b border-[var(--border)]">
            <div className="tf-display text-lg font-bold text-[var(--foreground)]">Archiv (abgelaufen)</div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              Du kannst abgelaufene Events duplizieren, um sie schnell für ein neues Datum wiederzuverwenden.
            </div>
          </div>

          {archivedEvents.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted)]">Noch keine abgelaufenen Events.</div>
          ) : (
            <ul role="list" className="divide-y divide-[var(--border)]">
              {archivedEvents.map((event) => (
                <li key={event.id} className="px-4 py-4 sm:px-6 hover:bg-[var(--surface-hover)] transition">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/events/${event.id}`} className="block hover:underline">
                          <p className="text-sm font-medium text-[var(--link)] whitespace-normal break-words line-clamp-2">{event.title}</p>
                        </Link>
                        <span className="text-xs bg-[var(--surface-2)] text-[var(--foreground)] px-2 py-1 rounded border border-[var(--border)]">Abgelaufen</span>
                      </div>
                      <p className="text-sm text-[var(--muted)]">
                        {new Date(event.startDate).toLocaleDateString("de-DE", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Europe/Berlin",
                        })}
                      </p>
                      <p className="text-sm text-[var(--muted)]">{event.locationName || "Kein Ort angegeben"}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <Link
                        href={`/groups/${id}/events/${event.id}/edit`}
                        className="text-[var(--link)] hover:opacity-90 text-sm font-medium"
                      >
                        Bearbeiten
                      </Link>
                      <DuplicateEventButton eventId={event.id} />
                      <DeleteEventButton eventId={event.id} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
