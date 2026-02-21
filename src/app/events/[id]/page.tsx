import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DeleteEventButton from '@/components/events/DeleteEventButton';
import EventRegistration from '@/components/events/EventRegistration';
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import DynamicEventMap from "@/components/map/DynamicEventMap";
import DuplicateEventButton from "@/components/events/DuplicateEventButton";

const TZ_EUROPE_BERLIN = "Europe/Berlin";

const formatTicketPrice = (raw: string | null) => {
  const v = (raw || "").trim();
  if (!v) return "";
  if (/€/.test(v) || /\bEUR\b/i.test(v)) return v;
  return `${v} €`;
};

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
    if (session.user.role === "ADMIN") canEdit = true;
    if (event.creatorId === session.user.id) canEdit = true;
    if (event.group && event.group.ownerId === session.user.id) canEdit = true;
    if (!canEdit && event.groupId) {
      const membership = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: session.user.id,
            groupId: event.groupId,
          },
        },
        select: {
          role: true,
          status: true,
        },
      });
      if (membership?.role === "ADMIN" && membership?.status === "APPROVED") {
        canEdit = true;
      }
    }
  }

  const formatBerlin = (value: string | Date | null | undefined, options: Intl.DateTimeFormatOptions) => {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("de-DE", { ...options, timeZone: TZ_EUROPE_BERLIN }).format(d);
  };

  const isDefaultLatLng = event.lat === 51.1657 && event.lng === 10.4515;
  const hasLocation = Boolean((event.address || "").trim()) || (!isDefaultLatLng && Number.isFinite(event.lat) && Number.isFinite(event.lng));
  const isExpired = new Date(event.startDate).getTime() < +new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 px-4 sm:px-0">
      
      {/* Header Image / Flyer */}
      {(event.flyer1 || event.flyer2) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {event.flyer1 && (
            <div className="relative h-48 sm:h-64 md:h-96 rounded-lg overflow-hidden shadow-md bg-[var(--surface-2)]">
              <ImageWithFallback src={event.flyer1} alt={`Flyer für ${event.title}`} className="w-full h-full object-contain" />
            </div>
          )}
          {event.flyer2 && (
            <div className="relative h-48 sm:h-64 md:h-96 rounded-lg overflow-hidden shadow-md bg-[var(--surface-2)]">
              <ImageWithFallback src={event.flyer2} alt={`Flyer für ${event.title}`} className="w-full h-full object-contain" />
            </div>
          )}
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-lg shadow-md border border-[var(--border)] overflow-hidden">
        <div className="p-4 sm:p-6 md:p-8 space-y-6">
          
          {/* Title & Meta Header */}
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-[var(--primary)] text-[var(--primary-foreground)]">
                  {getTypeLabel(event.eventType)}
                </span>
                {isExpired ? (
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)]">
                    Abgelaufen
                  </span>
                ) : null}
                {canEdit && (
                  <span className="text-xs bg-[var(--surface-2)] text-[var(--foreground)] px-2 py-1 rounded border border-[var(--border)]">
                    Du verwaltest dieses Event
                  </span>
                )}
              </div>
              <h1 className="tf-display text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-3 leading-tight break-words">{event.title}</h1>
              
              <div className="text-[var(--muted)] flex flex-wrap items-center gap-3 sm:gap-4 text-base sm:text-lg">
                <div className="flex items-center gap-2">
                  <span>🗓️</span> 
                  <span className="font-medium text-[var(--foreground)]">
                    {formatBerlin(event.startDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
                <div className="hidden sm:block text-[var(--muted)]">•</div>
                <div className="flex items-center gap-2">
                  <span>⏰</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {formatBerlin(event.startDate, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} Uhr
                  </span>
                  {event.endDate && (
                    <span className="text-[var(--muted)]"> - {formatBerlin(event.endDate, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Buttons (Tickets & Nav) */}
            <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[220px]">
              {event.ticketLink && (
                <a 
                  href={event.ticketLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-2.5 sm:py-3 px-4 bg-[var(--primary)] text-[var(--primary-foreground)] text-center rounded-md font-bold hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] transition shadow-sm flex items-center justify-center gap-2"
                >
                  <span>🎟️</span> Tickets {event.ticketPrice ? `(${formatTicketPrice(event.ticketPrice)})` : ""}
                </a>
              )}

              <a 
                href={`/api/events/${event.id}/calendar`}
                download
                className="w-full py-2.5 sm:py-3 px-4 bg-[var(--surface)] text-[var(--foreground)] text-center rounded-md font-bold hover:bg-[var(--surface-hover)] transition shadow-sm flex items-center justify-center gap-2 border border-[var(--border)]"
              >
                <span>📅</span> Zum Kalender hinzufügen
              </a>

              {canEdit && (
                <>
                  <Link
                    href={event.group ? `/groups/${event.group.id}/events/${event.id}/edit` : `/events/${event.id}/edit`}
                    className="w-full py-2.5 sm:py-3 px-4 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] text-center rounded-md font-bold hover:bg-[var(--surface-hover)] transition shadow-sm flex items-center justify-center"
                  >
                    Bearbeiten
                  </Link>
                  <DuplicateEventButton eventId={event.id} />
                  <div className="flex items-center justify-end pt-1">
                    <DeleteEventButton eventId={event.id} redirectTo="/events" />
                  </div>
                </>
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

          <hr className="border-[var(--border)]" />

          {/* Description */}
          <div>
            <h2 className="tf-display text-xl font-bold text-[var(--foreground)] mb-4">Beschreibung</h2>
            <div className="prose max-w-none whitespace-pre-line text-[var(--foreground)] leading-relaxed">
              {event.description}
            </div>
          </div>

          <hr className="border-[var(--border)]" />

          {/* Location & Organizer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Location */}
            <div>
              <h2 className="tf-display text-xl font-bold text-[var(--foreground)] mb-4">Veranstaltungsort</h2>
              <div className="space-y-1 text-[var(--foreground)] mb-4">
                <p className="font-semibold text-lg">{event.locationName}</p>
                {event.address && <p>{event.address}</p>}
                
                {hasLocation && (
                  <div className="pt-3">
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex py-2 px-4 bg-[var(--surface)] text-[var(--foreground)] text-center rounded-md font-medium hover:bg-[var(--surface-hover)] transition shadow-sm items-center gap-2 border border-[var(--border)] text-sm"
                    >
                      <span>📍</span> Navigation starten
                    </a>
                  </div>
                )}
              </div>
              {hasLocation && (
                <div className="h-64 rounded-lg overflow-hidden border border-[var(--border)] shadow-sm relative z-0">
                  <DynamicEventMap lat={event.lat} lng={event.lng} />
                </div>
              )}
            </div>

            {/* Organizer */}
            <div>
              <h2 className="tf-display text-xl font-bold text-[var(--foreground)] mb-4">Veranstalter</h2>
              <div className="bg-[var(--surface-2)] rounded-lg p-5 border border-[var(--border)]">
                <div className="flex items-center gap-4">
                  {event.group ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-[var(--surface)] flex items-center justify-center overflow-hidden border border-[var(--border)] shadow-sm">
                        {event.group.image ? (
                          <>
                            <ImageWithFallback src={event.group.image} alt={event.group.name} className="w-full h-full object-cover" />
                          </>
                        ) : (
                          <span className="text-2xl">👥</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-[var(--foreground)] text-lg">{organizerName}</p>
                        <Link href={`/groups/${event.group.id}`} className="text-sm text-[var(--link)] hover:opacity-90 font-medium">
                          Zur Gruppe &rarr;
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-[var(--surface)] flex items-center justify-center border border-[var(--border)]">
                        <span className="text-2xl">👤</span>
                      </div>
                      <div>
                        <p className="font-bold text-[var(--foreground)] text-lg">{organizerName}</p>
                        <p className="text-sm text-[var(--muted)]">Veranstalter</p>
                      </div>
                    </>
                  )}
                </div>

                {event.website && (
                  <div className="mt-5 pt-4 border-t border-[var(--border)]">
                    <a 
                      href={event.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[var(--link)] hover:opacity-90 font-medium flex items-center gap-2"
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
