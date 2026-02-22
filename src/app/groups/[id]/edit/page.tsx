import GroupForm from "@/components/groups/GroupForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const id = (await params).id;

  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      location: true,
      tags: true,
      danceStyles: { select: { styleId: true, level: true } },
    }
  });

  if (!group) {
    notFound();
  }

  const isOwner = group.ownerId === session.user.id;
  const isGlobalAdmin = session.user.role === "ADMIN";
  let canDelete = isOwner || isGlobalAdmin;

  if (!isOwner && !isGlobalAdmin) {
    // Check if user is an approved group admin
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: id,
        },
      },
      select: { role: true, status: true },
    });

    const isGroupAdmin = membership?.role === "ADMIN" && membership?.status === "APPROVED";
    if (!isGroupAdmin) {
      redirect("/dashboard");
    }

    canDelete = true;
  }

  // Serialisiere die Daten für den Client Component
  const serializedGroup = JSON.parse(JSON.stringify(group));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="tf-display text-3xl font-bold text-[var(--foreground)]">Gruppe bearbeiten</h1>
      </div>
      <GroupForm initialData={serializedGroup} isEditing={true} isOwner={isOwner} canDelete={canDelete} />
    </div>
  );
}
