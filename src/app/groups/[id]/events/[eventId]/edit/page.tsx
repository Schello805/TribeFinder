import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import EventForm from "@/components/events/EventForm";

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

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Event bearbeiten</h1>
      <EventForm 
        groupId={id} 
        initialData={event as any}
        isEditing={true}
      />
    </div>
  );
}
