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

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      group: {
        select: {
          id: true,
          ownerId: true,
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  // If the event belongs to a group, use the group-scoped edit page
  if (event.groupId) {
    redirect(`/groups/${event.groupId}/events/${event.id}/edit`);
  }

  // Independent event: only creator can edit
  if (event.creatorId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const initialData: Partial<EventFormData> & { id?: string } = {
    id: event.id,
    title: event.title,
    description: event.description,
    eventType: event.eventType as EventFormData["eventType"],
    startDate: event.startDate.toISOString(),
    endDate: event.endDate ? event.endDate.toISOString() : event.startDate.toISOString(),
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
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 text-[var(--foreground)]">
      <h1 className="tf-display text-2xl font-bold mb-6 text-[var(--foreground)]">Event bearbeiten</h1>
      <EventForm initialData={initialData} isEditing={true} />
    </div>
  );
}
