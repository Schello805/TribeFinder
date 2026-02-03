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
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      group: {
        select: {
          ownerId: true
        }
      }
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

  if (event.group.ownerId !== session.user.id) {
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
    groupId: id,
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="tf-display text-2xl font-bold mb-6">Event bearbeiten</h1>
      <EventForm 
        groupId={id} 
        initialData={initialData}
        isEditing={true}
      />
    </div>
  );
}
