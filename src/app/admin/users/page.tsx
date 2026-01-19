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
      role: true,
      createdAt: true
    }
  });

  // Convert dates to strings for client component
  const formattedUsers = users.map((user: typeof users[0]) => ({
    ...user,
    createdAt: user.createdAt.toISOString()
  }));

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Benutzerverwaltung</h1>

      <AdminNav />

      <p className="text-gray-500">
        Hier kannst du Benutzer verwalten und als &quot;Test-User&quot; markieren. 
        Test-User können über die Systemeinstellungen global ausgeblendet werden.
      </p>

      <UsersList initialUsers={formattedUsers} />
    </div>
  );
}
