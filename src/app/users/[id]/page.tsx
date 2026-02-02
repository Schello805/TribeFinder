import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

export default async function UserPublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      dancerName: true,
      bio: true,
      memberships: {
        where: { status: "APPROVED" },
        select: {
          group: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) notFound();

  const displayName = user.dancerName || user.name || "Unbekannt";
  const avatar = normalizeUploadedImageUrl(user.image) ?? "";
  const groups = user.memberships.map((m) => m.group);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-4">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={displayName} className="h-16 w-16 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-400 dark:text-indigo-200 font-bold text-2xl border border-indigo-100 dark:border-indigo-800">
              {displayName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="tf-display text-2xl font-bold text-gray-900 dark:text-white truncate">{displayName}</h1>
            {user.bio ? (
              <p className="mt-1 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{user.bio}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="tf-display text-lg font-bold text-gray-900 dark:text-white">Gruppen</h2>
        {groups.length > 0 ? (
          <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-700">
            {groups.map((g) => (
              <li key={g.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {g.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={normalizeUploadedImageUrl(g.image) ?? ""} alt={g.name} className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-gray-600" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold">
                      {g.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="tf-display font-medium text-gray-900 dark:text-white truncate">{g.name}</div>
                  </div>
                </div>
                <Link
                  href={`/groups/${g.id}`}
                  className="text-indigo-600 dark:text-indigo-300 hover:underline text-sm font-medium"
                >
                  Zur Gruppe
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-gray-600 dark:text-gray-300">Noch keine Gruppen hinterlegt.</p>
        )}
      </div>

      <div>
        <Link href="/groups" className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">
          Zurück zu Gruppen
        </Link>
      </div>
    </div>
  );
}
