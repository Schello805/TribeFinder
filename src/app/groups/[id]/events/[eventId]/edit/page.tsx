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

  const event = await eventDelegate.findUnique({
    where: { id: eventId },
    include: {
      group: {
        select: {
          ownerId: true
        }
      },
      danceStyles: {
        select: {
          styleId: true,
        },
      },
    }
  });

  if (!event) {
    notFound();
  }

  // Verify that the event belongs to the group in the URL
  if (event.groupId !== id) {
    notFound();
  }

  // Verify ownership
  if (!event.group) {
     // If the event has no group (independent), check if the user is the creator
     // However, this page is under /groups/[id]/events, so it implies a group context.
     // If data is corrupted and groupId is set but group relation is missing:
    notFound();
  }

  if (event.group.ownerId !== session.user.id && session.user.role !== "ADMIN") {
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
    id: event.id,
    title: event.title,
    description: event.description,
    eventType: event.eventType as EventFormData["eventType"],
    startDate: event.startDate.toISOString(),
    endDate: event.endDate ? event.endDate.toISOString() : event.startDate.toISOString(),
    danceStyleIds: event.danceStyles.map((x: { styleId: string }) => x.styleId),
    locationName: event.locationName ?? "",
    address: event.address ?? "",
    lat: event.lat,
    lng: event.lng,
    flyer1: event.flyer1 ?? "",
    flyer2: event.flyer2 ?? "",
    website: event.website ?? "",
    ticketLink: event.ticketLink ?? "",
    ticketPrice: event.ticketPrice ?? "",
    organizer: event.organizer ?? "",
    maxParticipants: event.maxParticipants ?? undefined,
    requiresRegistration: event.requiresRegistration ?? false,
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
