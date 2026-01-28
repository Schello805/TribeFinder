import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import DynamicEventMap from "@/components/map/DynamicEventMap";
import EventRegistration from "@/components/events/EventRegistration";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import DeleteEventButton from "@/components/events/DeleteEventButton";

type EventGroupLike = {
  id: string;
  name: string;
  image: string | null;
  ownerId: string;
};

type EventCreatorLike = {
  name: string | null;
};

type EventParticipationLike = {
  group: {
    id: string;
    name: string;
    image: string | null;
  };
};

type EventLike = {
  id: string;
  title: string;
  description: string;
  eventType: string;
  startDate: Date;
  endDate: Date | null;
  locationName: string | null;
  address: string | null;
  lat: number;
  lng: number;
  flyer1: string | null;
  flyer2: string | null;
  website: string | null;
  ticketLink: string | null;
  ticketPrice: string | null;
  organizer: string | null;
  maxParticipants: number | null;
  requiresRegistration: boolean;
  creatorId: string | null;
  groupId: string | null;
  group: EventGroupLike | null;
  creator: EventCreatorLike | null;
  participations: EventParticipationLike[];
};

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventDetailPageProps) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) return { title: "Event nicht gefunden" };

  return {
    title: `${event.title} | TribeFinder`,
    description: event.description.substring(0, 160),
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const event = (await (prisma as unknown as {
    event: { findUnique: (args: unknown) => Promise<unknown> };
  }).event.findUnique({
    where: { id },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          image: true,
          ownerId: true,
        }
      },
      creator: {
        select: {
          name: true,
        },
      },
      participations: {
        include: {
          group: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          }
        }
      }
    }
  })) as EventLike | null;

  if (!event) {
    notFound();
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "WORKSHOP": return "Workshop";
      case "SOCIAL": return "Social / Party";
      case "OPEN_TRAINING": return "Offenes Training";
      default: return "Event";
    }
  };

  // Determine organizer name to display
  const organizerName = event.organizer || (event.group ? event.group.name : event.creator?.name) || "Unbekannt";

  // Check editing permissions (Creator or Group Admin)
  let canEdit = false;
  if (session?.user?.id) {
    if (event.creatorId === session.user.id) canEdit = true;
    if (event.group && event.group.ownerId === session.user.id) canEdit = true;
    // Add logic for group admins if needed
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 px-4 sm:px-0">
      
      {/* Header Image / Flyer */}
      {(event.flyer1 || event.flyer2) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {event.flyer1 && (
            <div className="relative h-64 md:h-96 rounded-lg overflow-hidden shadow-md bg-gray-100">
              <ImageWithFallback src={event.flyer1} alt={`Flyer für ${event.title}`} className="w-full h-full object-contain" />
            </div>
          )}
          {event.flyer2 && (
            <div className="relative h-64 md:h-96 rounded-lg overflow-hidden shadow-md bg-gray-100">
              <ImageWithFallback src={event.flyer2} alt={`Flyer für ${event.title}`} className="w-full h-full object-contain" />
            </div>
          )}
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Title & Meta Header */}
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200">
                  {getTypeLabel(event.eventType)}
                </span>
                {canEdit && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded border border-yellow-200">
                    Du verwaltest dieses Event
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">{event.title}</h1>
              
              <div className="text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-4 text-lg">
                <div className="flex items-center gap-2">
                  <span>🗓️</span> 
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    {format(new Date(event.startDate), "EEEE, d. MMMM yyyy", { locale: de })}
                  </span>
                </div>
                <div className="hidden sm:block text-gray-300 dark:text-gray-600">•</div>
                <div className="flex items-center gap-2">
                  <span>⏰</span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    {format(new Date(event.startDate), "HH:mm")} Uhr
                  </span>
                  {event.endDate && (
                    <span className="text-gray-500"> - {format(new Date(event.endDate), "HH:mm")}</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Buttons (Tickets & Nav) */}
            <div className="flex flex-col gap-3 min-w-[220px]">
              {event.ticketLink && (
                <a 
                  href={event.ticketLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-indigo-600 text-white text-center rounded-md font-bold hover:bg-indigo-700 transition shadow-sm flex items-center justify-center gap-2"
                >
                  <span>🎟️</span> Tickets {event.ticketPrice ? `(${event.ticketPrice})` : ""}
                </a>
              )}

              <a 
                href={`/api/events/${event.id}/calendar`}
                download
                className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-center rounded-md font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-600"
              >
                <span>📅</span> Zum Kalender hinzufügen
              </a>

              {canEdit && (
                <div className="flex items-center justify-end gap-4 pt-2">
                  <Link
                    href={event.group ? `/groups/${event.group.id}/events/${event.id}/edit` : `/events/${event.id}/edit`}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 text-sm font-medium"
                  >
                    Bearbeiten
                  </Link>
                  <DeleteEventButton eventId={event.id} redirectTo="/events" />
                </div>
              )}
            </div>
          </div>

          {/* Workshop Registration */}
          {event.requiresRegistration && (
            <EventRegistration 
              eventId={event.id} 
              isCreator={session?.user?.id === event.creatorId || session?.user?.id === event.group?.ownerId}
            />
          )}

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Description */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Beschreibung</h2>
            <div className="prose dark:prose-invert max-w-none whitespace-pre-line text-gray-700 dark:text-gray-300 leading-relaxed">
              {event.description}
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Location & Organizer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Location */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Veranstaltungsort</h2>
              <div className="space-y-1 text-gray-700 dark:text-gray-300 mb-4">
                <p className="font-semibold text-lg">{event.locationName}</p>
                {event.address && <p>{event.address}</p>}
                
                <div className="pt-3">
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-center rounded-md font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition shadow-sm items-center gap-2 border border-gray-200 dark:border-gray-600 text-sm"
                  >
                    <span>📍</span> Navigation starten
                  </a>
                </div>
              </div>
              <div className="h-64 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm relative z-0">
                 <DynamicEventMap lat={event.lat} lng={event.lng} />
              </div>
            </div>

            {/* Organizer */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Veranstalter</h2>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-5 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  {event.group ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                        {event.group.image ? (
                          <>
                            <ImageWithFallback src={event.group.image} alt={event.group.name} className="w-full h-full object-cover" />
                          </>
                        ) : (
                          <span className="text-2xl">👥</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-lg">{organizerName}</p>
                        <Link href={`/groups/${event.group.id}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                          Zur Gruppe &rarr;
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                        <span className="text-2xl">👤</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-lg">{organizerName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Veranstalter</p>
                      </div>
                    </>
                  )}
                </div>

                {event.website && (
                  <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <a 
                      href={event.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Offizielle Webseite
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
