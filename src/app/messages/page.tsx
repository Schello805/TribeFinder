import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

export const dynamic = "force-dynamic";

export default async function MessagesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const sp = (await searchParams) ?? {};
  const archivedParam = sp.archived;
  const archived = archivedParam === "1" || archivedParam === "true";

  const userId = session.user.id;

  const approvedGroupIds = await prisma.groupMember.findMany({
    where: { userId, status: "APPROVED" },
    select: { groupId: true },
  });

  const groupIds = approvedGroupIds.map((g) => g.groupId);

  let supportsArchive = true;
  let threads = [] as Array<{
    id: string;
    subject: string | null;
    group: { id: string; name: string; image: string | null };
    messages: Array<{ content: string; createdAt: Date; authorId: string }>;
    readStates?: Array<{ archivedAt: Date | null }>;
  }>;

  try {
    threads = await prisma.groupThread.findMany({
      where: {
        OR: [{ createdByUserId: userId }, { groupId: { in: groupIds } }],
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        group: { select: { id: true, name: true, image: true } },
        createdBy: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, authorId: true },
        },
        readStates: {
          where: { userId },
          select: { archivedAt: true },
          take: 1,
        },
      },
    });
  } catch {
    supportsArchive = false;
    threads = await prisma.groupThread.findMany({
      where: {
        OR: [{ createdByUserId: userId }, { groupId: { in: groupIds } }],
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        group: { select: { id: true, name: true, image: true } },
        createdBy: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, authorId: true },
        },
      },
    });
  }

  const filteredThreads = supportsArchive
    ? threads.filter((t) => {
        const archivedAt = t.readStates?.[0]?.archivedAt;
        return archived ? Boolean(archivedAt) : !archivedAt;
      })
    : archived
      ? []
      : threads;

  if (archived && !supportsArchive) {
    redirect("/messages");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{archived ? "Archiv" : "Nachrichten"}</h1>
        {supportsArchive ? (
          <Link
            href={archived ? "/messages" : "/messages?archived=1"}
            className="text-sm text-indigo-600 dark:text-indigo-300 font-medium hover:underline"
          >
            {archived ? "Zur Inbox" : "Archiv"}
          </Link>
        ) : null}
      </div>

      <div
        className={
          archived
            ? "bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 p-6"
            : "bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6"
        }
      >
        {filteredThreads.length > 0 ? (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredThreads.map((t) => {
              const img = normalizeUploadedImageUrl(t.group.image) ?? "";
              const last = t.messages[0]?.content || "";
              return (
                <li key={t.id} className="py-4 first:pt-0 last:pb-0">
                  <Link href={`/messages/threads/${t.id}`} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={t.group.name} className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold">
                          {t.group.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {t.subject || t.group.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {last}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">Öffnen</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-gray-600 dark:text-gray-300">
            {archived ? "Noch keine archivierten Nachrichten." : "Noch keine Nachrichten. Öffne eine Gruppe und klicke auf „Nachricht senden“."}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Link href="/groups" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">
          Gruppen finden
        </Link>
      </div>
    </div>
  );

}
