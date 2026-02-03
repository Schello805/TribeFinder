import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import EventForm from "@/components/events/EventForm";

export default async function CreateEventPage({ params }: { params: Promise<{ id: string }> }) {
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
    redirect("/dashboard");
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
      redirect("/dashboard");
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="tf-display text-2xl font-bold mb-6">Neues Event erstellen</h1>
      <p className="text-gray-600 mb-6">für Gruppe: {group.name}</p>
      <EventForm groupId={id} />
    </div>
  );
}
