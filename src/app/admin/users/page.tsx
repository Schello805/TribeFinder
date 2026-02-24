import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import UsersList from "@/components/admin/UsersList";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      role: true,
      isBlocked: true,
      isDancerProfileEnabled: true,
      isDancerProfilePrivate: true,
      createdAt: true
    }
  });

  // Convert dates to strings for client component
  const formattedUsers = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
    role: user.role,
    isBlocked: user.isBlocked,
    isDancerProfileEnabled: user.isDancerProfileEnabled,
    isDancerProfilePrivate: user.isDancerProfilePrivate,
    createdAt: user.createdAt.toISOString(),
  }));

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-[90vw] py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Benutzerverwaltung</h1>

      <AdminNav />

      <p className="text-gray-500 dark:text-gray-400">
        Hier kannst du Benutzer einsehen.
      </p>

      <UsersList initialUsers={formattedUsers} currentUserId={session.user.id} />
    </div>
  );
}
