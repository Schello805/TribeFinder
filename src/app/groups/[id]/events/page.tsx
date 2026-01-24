import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import DeleteEventButton from "@/components/events/DeleteEventButton";

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

  const events = await prisma.event.findMany({
    where: { groupId: id },
    orderBy: { startDate: 'asc' }
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events verwalten</h1>
          <p className="text-gray-500 dark:text-gray-400">für {group.name}</p>
        </div>
        <div className="space-x-4">
          <Link
            href="/dashboard"
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Zurück zum Dashboard
          </Link>
          <Link
            href={`/groups/${id}/events/create`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition shadow-sm"
          >
            Neues Event
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-gray-100 dark:border-gray-700">
        {events.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-300">
            Keine Events gefunden. Erstelle das erste Event für deine Gruppe!
          </div>
        ) : (
          <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
            {events.map((event) => (
              <li key={event.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <Link href={`/events/${event.id}`} className="block hover:underline">
                      <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">{event.title}</p>
                    </Link>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(event.startDate).toLocaleDateString('de-DE', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Europe/Berlin'
                      })}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{event.locationName || 'Kein Ort angegeben'}</p>
                    <div className="flex gap-3 mt-1">
                      {event.flyer1 && (
                        <a 
                          href={event.flyer1} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          Flyer 1
                        </a>
                      )}
                      {event.flyer2 && (
                        <a 
                          href={event.flyer2} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          Flyer 2
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-4">
                    <Link
                      href={`/groups/${id}/events/${event.id}/edit`}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 text-sm font-medium"
                    >
                      Bearbeiten
                    </Link>
                    <DeleteEventButton eventId={event.id} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
