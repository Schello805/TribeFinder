import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import ImageWithFallback from "@/components/ui/ImageWithFallback";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  const [currentUser, groups, manageableGroups] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id }
    }) as unknown as {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      dancerName?: string | null;
      instagramUrl?: string | null;
      tiktokUrl?: string | null;
      youtubeUrl?: string | null;
    } | null,
    prisma.group.findMany({
      where: {
        ownerId: session.user.id
      },
      include: {
        location: true,
        tags: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.group.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id, status: "APPROVED" } } },
        ],
      },
      select: {
        id: true,
        name: true,
        image: true,
        members: {
          where: { status: "PENDING" },
          select: { id: true },
        },
      },
      take: 250,
    })
  ]);

  const pendingGroups = manageableGroups
    .map((g) => ({
      id: g.id,
      name: g.name,
      image: g.image,
      pendingCount: g.members.length,
    }))
    .filter((g) => g.pendingCount > 0)
    .sort((a, b) => b.pendingCount - a.pendingCount);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Mein Profil</h2>
          </div>
          <div className="flex items-center gap-6">
             <div className="h-20 w-20 bg-gray-100 dark:bg-gray-700 rounded-full flex-shrink-0 overflow-hidden border border-gray-200 dark:border-gray-600">
                {currentUser?.image ? (
                  <>
                    <ImageWithFallback src={currentUser.image} alt={currentUser.name || "Profil"} className="h-full w-full object-cover" />
                  </>
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400 text-2xl">
                    👤
                  </div>
                )}
             </div>
             <div className="min-w-0 flex-1">
                <p className="text-xl font-bold text-gray-900 dark:text-white truncate">
                  {currentUser?.dancerName || currentUser?.name || "Tänzer"}
                </p>
                {currentUser?.dancerName && currentUser?.name && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{currentUser.name}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{currentUser?.email}</p>
                
                <div className="mt-2 flex gap-2">
                  {currentUser?.instagramUrl && <span className="text-lg opacity-70 hover:opacity-100" title="Instagram">📸</span>}
                  {currentUser?.tiktokUrl && <span className="text-lg opacity-70 hover:opacity-100" title="TikTok">🎵</span>}
                  {currentUser?.youtubeUrl && <span className="text-lg opacity-70 hover:opacity-100" title="YouTube">▶️</span>}
                </div>
             </div>
          </div>
        </div>

        {/* Quick Actions / Create Group */}
         <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6 flex flex-col justify-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tanzgruppe verwalten</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Möchtest du eine neue Tanzgruppe gründen oder eine bestehende verwalten?
            </p>
            <Link
              href="/groups/create"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition shadow-sm text-center font-medium"
            >
              + Neue Gruppe erstellen
            </Link>
         </div>
      </div>

      {pendingGroups.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Offene Beitrittsanfragen</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Bearbeite Anfragen direkt in der jeweiligen Gruppe.</p>
          </div>
          <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
            {pendingGroups.slice(0, 10).map((g) => (
              <li key={g.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <div className="flex items-center justify-between gap-4">
                  <Link href={`/groups/${g.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 h-10 w-10 rounded-md overflow-hidden bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                        {g.image ? (
                          <ImageWithFallback src={g.image} alt={g.name} className="h-full w-full object-contain p-0.5" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400 font-bold text-lg bg-gray-50">
                            {g.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{g.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{g.pendingCount} offene Anfrage{g.pendingCount === 1 ? "" : "n"}</div>
                      </div>
                    </div>
                  </Link>
                  <div className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">Öffnen</div>
                </div>
              </li>
            ))}
          </ul>
          {pendingGroups.length > 10 && (
            <div className="px-4 py-4 sm:px-6 text-sm text-gray-500 dark:text-gray-400">
              Weitere offene Anfragen: {pendingGroups.length - 10}
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Meine Gruppen</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Hier verwaltest du deine Tanzgruppen-Steckbriefe.
          </p>
        </div>
        
        {groups.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
            <p>Du hast noch keine Gruppen erstellt.</p>
            <Link href="/groups/create" className="text-indigo-600 hover:underline mt-2 inline-block">
              Erstelle jetzt deine erste Gruppe!
            </Link>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
            {groups.map((group) => (
              <li key={group.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <div className="flex items-center justify-between gap-4">
                  <Link href={`/groups/${group.id}`} className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Logo */}
                    <div className="flex-shrink-0 h-12 w-12 rounded-md overflow-hidden bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                      {group.image ? (
                        <>
                          <ImageWithFallback src={group.image} alt={group.name} className="h-full w-full object-contain p-0.5" />
                        </>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400 font-bold text-lg bg-gray-50">
                          {group.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-indigo-600 truncate">{group.name}</p>
                      <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <span className="truncate">{group.description.substring(0, 100)}...</span>
                      </p>
                      <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                        {group.location ? (
                          <p>📍 {group.location.address || "Standort auf Karte festgelegt"}</p>
                        ) : (
                          <p>Kein Standort</p>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {group.tags.map((tag) => (
                          <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>

                  <div className="flex-shrink-0 flex space-x-2">
                    <Link
                      href={`/groups/${group.id}/events`}
                      className="text-indigo-600 hover:text-indigo-900 font-medium text-sm border border-indigo-200 px-3 py-1 rounded hover:bg-indigo-50"
                    >
                      Events
                    </Link>
                    <Link
                      href={`/groups/${group.id}/edit`}
                      className="text-indigo-600 hover:text-indigo-900 font-medium text-sm border border-indigo-200 px-3 py-1 rounded hover:bg-indigo-50"
                    >
                      Bearbeiten
                    </Link>
                    {/* Delete button would ideally be a client component or form action */}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
