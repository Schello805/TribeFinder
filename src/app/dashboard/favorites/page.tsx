import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import ImageWithFallback from "@/components/ui/ImageWithFallback";

type TagLike = { id: string; name: string };
type LocationLike = { address: string | null };
type GroupLike = {
  id: string;
  name: string;
  description: string;
  image: string | null;
  location: LocationLike | null;
  tags: TagLike[];
};
type FavoriteRowLike = { group: GroupLike };

export default async function FavoritesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const favorites = (await (prisma as unknown as {
    favoriteGroup: {
      findMany: (args: unknown) => Promise<unknown>;
    };
  }).favoriteGroup.findMany({
    where: { userId: session.user.id },
    include: {
      group: {
        include: {
          location: true,
          tags: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })) as FavoriteRowLike[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Meine Favoriten</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Gruppen, die du favorisiert hast
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Noch keine Favoriten
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Entdecke Gruppen und füge sie zu deinen Favoriten hinzu
          </p>
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Gruppen entdecken
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map(({ group }) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition group"
            >
              {group.image ? (
                <div className="relative h-48 w-full">
                  <ImageWithFallback
                    src={group.image}
                    alt={group.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-6xl">💃</span>
                </div>
              )}
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  {group.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                  {group.description}
                </p>
                {group.location && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1 mb-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {group.location.address}
                  </p>
                )}
                {group.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {group.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
