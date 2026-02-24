import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import AdminNav from "@/components/admin/AdminNav";
import Link from "next/link";
import AdminUserSupportPanel from "@/components/admin/AdminUserSupportPanel";
import UserPresenceStatus from "@/components/presence/UserPresenceStatus";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBlocked: true,
      isDancerProfileEnabled: true,
      isDancerProfilePrivate: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      ownedGroups: {
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
      },
      memberships: {
        where: { status: "APPROVED" },
        select: {
          role: true,
          createdAt: true,
          group: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    redirect("/admin/users");
  }

  const ownedGroupIds = new Set(user.ownedGroups.map((g) => g.id));
  const adminGroups = user.memberships.filter((m) => m.role === "ADMIN" && !ownedGroupIds.has(m.group.id));
  const memberGroups = user.memberships.filter((m) => m.role !== "ADMIN" && !ownedGroupIds.has(m.group.id));

  const lastLoginText = user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("de-DE") : "—";

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-[90vw] py-8 px-4 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Benutzer</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400 break-all">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/users"
            className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Zurück
          </Link>
        </div>
      </div>

      <AdminNav />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Details</h2>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User ID</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-all">{user.id}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rolle</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user.role}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Online-Status</dt>
                <dd className="mt-1">
                  <UserPresenceStatus userId={user.id} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Verifiziert</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {user.emailVerified ? new Date(user.emailVerified).toLocaleString("de-DE") : "Nein"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gesperrt</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user.isBlocked ? "Ja" : "Nein"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Erstellt</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{new Date(user.createdAt).toLocaleString("de-DE")}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tänzerinnenprofil</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {user.isDancerProfileEnabled ? "Aktiv" : "Deaktiviert"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Letzter Login</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{lastLoginText}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Zuletzt aktualisiert</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{new Date(user.updatedAt).toLocaleString("de-DE")}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profil privat</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {user.isDancerProfileEnabled ? (user.isDancerProfilePrivate ? "Ja" : "Nein") : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Gruppen</h2>

            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Owner</div>
                {user.ownedGroups.length ? (
                  <ul className="mt-2 space-y-2">
                    {user.ownedGroups.map((g) => (
                      <li key={`owner-${g.id}`}>
                        <Link href={`/groups/${g.id}`} className="text-sm text-indigo-600 dark:text-indigo-300 hover:underline">
                          {g.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">—</div>
                )}
              </div>

              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Admin (Gruppenleitung)</div>
                {adminGroups.length ? (
                  <ul className="mt-2 space-y-2">
                    {adminGroups.map((m) => (
                      <li key={`admin-${m.group.id}`} className="flex items-center justify-between gap-4">
                        <Link href={`/groups/${m.group.id}`} className="text-sm text-indigo-600 dark:text-indigo-300 hover:underline">
                          {m.group.name}
                        </Link>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Seit {new Date(m.createdAt).toLocaleDateString("de-DE")}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">—</div>
                )}
              </div>

              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Mitglied</div>
                {memberGroups.length ? (
                  <ul className="mt-2 space-y-2">
                    {memberGroups.map((m) => (
                      <li key={`member-${m.group.id}`} className="flex items-center justify-between gap-4">
                        <Link href={`/groups/${m.group.id}`} className="text-sm text-indigo-600 dark:text-indigo-300 hover:underline">
                          {m.group.name}
                        </Link>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Seit {new Date(m.createdAt).toLocaleDateString("de-DE")}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">—</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <AdminUserSupportPanel userId={user.id} />
        </div>
      </div>
    </div>
  );
}
