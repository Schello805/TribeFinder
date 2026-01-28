import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import EventForm from "@/components/events/EventForm";

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
  if (event.creatorId !== session.user.id) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Event bearbeiten</h1>
      <EventForm initialData={event as any} isEditing={true} />
    </div>
  );
}
