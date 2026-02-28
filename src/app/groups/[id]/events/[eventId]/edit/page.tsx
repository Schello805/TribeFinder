import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import EventForm from "@/components/events/EventForm";
import { EventFormData } from "@/lib/validations/event";

export default async function EditEventPage({ 
  params 
}: { 
  params: Promise<{ id: string; eventId: string }> 
}) {
  const { id, eventId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  // Fetch event and check ownership
  const eventDelegate = (prisma as unknown as {
    event: {
      findUnique: (args: unknown) => Promise<
        | {
            id: string;
            groupId: string | null;
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
            group: { ownerId: string } | null;
            danceStyles: Array<{ styleId: string }>;
          }
        | null
      >;
    };
  }).event;

  let event: unknown = null;
  try {
    event = await eventDelegate.findUnique({
      where: { id: eventId },
      include: {
        group: {
          select: {
            ownerId: true,
          },
        },
        danceStyles: {
          select: {
            styleId: true,
          },
        },
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Unknown nested field 'danceStyles'") || msg.includes("Unknown argument `danceStyles`")) {
      const e = await eventDelegate.findUnique({
        where: { id: eventId },
        include: {
          group: {
            select: {
              ownerId: true,
            },
          },
        },
      });
      event = e && typeof e === "object" ? ({ ...(e as any), danceStyles: [] } as any) : e;
    } else {
      throw error;
    }
  }

  if (!event) {
    notFound();
  }

  const eventAny = event as {
    id: string;
    groupId: string | null;
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
    group: { ownerId: string } | null;
    danceStyles: Array<{ styleId: string }>;
  };

  // Verify that the event belongs to the group in the URL
  if (eventAny.groupId !== id) {
    notFound();
  }

  // Verify ownership
  if (!eventAny.group) {
     // If the event has no group (independent), check if the user is the creator
     // However, this page is under /groups/[id]/events, so it implies a group context.
     // If data is corrupted and groupId is set but group relation is missing:
    notFound();
  }

  if (eventAny.group.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: id,
        },
      },
      select: { role: true, status: true },
    });

    if (!membership || membership.role !== "ADMIN" || membership.status !== "APPROVED") {
      redirect("/dashboard");
    }
  }

  const initialData: Partial<EventFormData> & { id?: string } = {
    id: eventAny.id,
    title: eventAny.title,
    description: eventAny.description,
    eventType: eventAny.eventType as EventFormData["eventType"],
    startDate: eventAny.startDate.toISOString(),
    endDate: eventAny.endDate ? eventAny.endDate.toISOString() : eventAny.startDate.toISOString(),
    danceStyleIds: eventAny.danceStyles.map((x: { styleId: string }) => x.styleId),
    locationName: eventAny.locationName ?? "",
    address: eventAny.address ?? "",
    lat: eventAny.lat,
    lng: eventAny.lng,
    flyer1: eventAny.flyer1 ?? "",
    flyer2: eventAny.flyer2 ?? "",
    website: eventAny.website ?? "",
    ticketLink: eventAny.ticketLink ?? "",
    ticketPrice: eventAny.ticketPrice ?? "",
    organizer: eventAny.organizer ?? "",
    maxParticipants: eventAny.maxParticipants ?? undefined,
    requiresRegistration: eventAny.requiresRegistration ?? false,
    groupId: id,
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 text-[var(--foreground)]">
      <h1 className="tf-display text-2xl font-bold mb-6 text-[var(--foreground)]">Event bearbeiten</h1>
      <EventForm 
        groupId={id} 
        initialData={initialData}
        isEditing={true}
      />
    </div>
  );
}
