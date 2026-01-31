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
      tags: true
    }
  });

  if (!group) {
    notFound();
  }

  const isOwner = group.ownerId === session.user.id;
  let canDelete = isOwner;

  if (!isOwner) {
    // Check if user is an approved member
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: id,
        },
      },
    });

    if (!membership || membership.status !== "APPROVED") {
      redirect("/dashboard");
    }

    canDelete = membership.role === "ADMIN" && membership.status === "APPROVED";
  }

  // Serialisiere die Daten für den Client Component
  const serializedGroup = JSON.parse(JSON.stringify(group));

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Gruppe bearbeiten</h1>
      <GroupForm initialData={serializedGroup} isEditing={true} isOwner={isOwner} canDelete={canDelete} />
    </div>
  );
}
