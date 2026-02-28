import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import EventForm from "@/components/events/EventForm";
import { EventFormData } from "@/lib/validations/event";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  const eventDelegate = (prisma as unknown as {
    event: {
      findUnique: (args: unknown) => Promise<unknown>;
    };
  }).event;

  const event = (await eventDelegate.findUnique({
    where: { id },
    include: {
      group: {
        select: {
          id: true,
          ownerId: true,
        },
      },
      danceStyles: {
        select: {
          styleId: true,
        },
      },
    },
  })) as unknown;

  if (!event) {
    notFound();
  }

  const eventAny = event as {
    id: string;
    title: string;
    description: string;
    eventType: string;
    startDate: Date;
    endDate: Date | null;
    danceStyles: Array<{ styleId: string }>;
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
    groupId: string | null;
    creatorId: string | null;
  };

  // If the event belongs to a group, use the group-scoped edit page
  if (eventAny.groupId) {
    redirect(`/groups/${eventAny.groupId}/events/${eventAny.id}/edit`);
  }

  // Independent event: only creator can edit
  if (eventAny.creatorId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/dashboard");
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
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 text-[var(--foreground)]">
      <h1 className="tf-display text-2xl font-bold mb-6 text-[var(--foreground)]">Event bearbeiten</h1>
      <EventForm initialData={initialData} isEditing={true} />
    </div>
  );
}
