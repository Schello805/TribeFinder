import Link from "next/link";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import ReplyBox from "@/components/messages/ReplyBox";
import ThreadMessages from "@/components/messages/ThreadMessages";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

import ArchiveThreadButton from "@/components/messages/ArchiveThreadButton";

const db = prisma as any;

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const threadId = (await params).threadId;

  let supportsArchive = true;
  let thread = null as any;
  try {
    thread = await db.groupThread.findUnique({
      where: { id: threadId },
      include: {
        group: { select: { id: true, name: true, image: true } },
        createdBy: { select: { id: true, name: true, image: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true, image: true } } },
        },
        readStates: {
          select: { userId: true, lastReadAt: true, archivedAt: true },
        },
      },
    });
  } catch {
    supportsArchive = false;
    thread = await db.groupThread.findUnique({
      where: { id: threadId },
      include: {
        group: { select: { id: true, name: true, image: true } },
        createdBy: { select: { id: true, name: true, image: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true, image: true } } },
        },
        readStates: {
          select: { userId: true, lastReadAt: true },
        },
      },
    });
  }

  if (!thread) notFound();

  const isCreator = thread.createdByUserId === session.user.id;
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: thread.groupId } },
    select: { status: true },
  });
  const isApprovedMember = membership?.status === "APPROVED";

  if (!isCreator && !isApprovedMember) {
    redirect("/messages");
  }

  await db.groupThreadReadState.upsert({
    where: { threadId_userId: { threadId, userId: session.user.id } },
    update: { lastReadAt: new Date() },
    create: { threadId, userId: session.user.id, lastReadAt: new Date() },
  });

  const groupImg = normalizeUploadedImageUrl(thread.group.image) ?? "";
  const messages = thread.messages as Array<{
    id: string;
    authorId: string;
    content: string;
    createdAt: Date;
    author: { id: string; name: string | null; image: string | null };
  }>;

  const maxOtherReadAtMs = (thread.readStates as Array<{ userId: string; lastReadAt: Date }>).
    filter((s) => s.userId !== session.user.id)
    .reduce<number | null>((acc, s) => {
      const ms = s.lastReadAt.getTime();
      if (Number.isNaN(ms)) return acc;
      if (acc === null) return ms;
      return Math.max(acc, ms);
    }, null);

  const maxOtherReadAtIso = maxOtherReadAtMs === null ? null : new Date(maxOtherReadAtMs).toISOString();

  const currentReadState = (thread.readStates as Array<{ userId: string; lastReadAt: Date; archivedAt?: Date | null }>).find(
    (s) => s.userId === session.user.id,
  );
  const initialArchived = supportsArchive ? Boolean(currentReadState && "archivedAt" in currentReadState && currentReadState.archivedAt) : false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-gray-500 dark:text-gray-400">Thread</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
            {thread.subject || `Nachricht an ${thread.group.name}`}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {supportsArchive ? <ArchiveThreadButton threadId={threadId} initialArchived={initialArchived} /> : null}
          <Link href="/messages" className="text-indigo-600 dark:text-indigo-300 hover:underline font-medium">
            Zur Inbox
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
        {groupImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={groupImg} alt={thread.group.name} className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold">
            {thread.group.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-medium text-gray-900 dark:text-white truncate">{thread.group.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{isCreator ? "Du" : thread.createdBy.name || "Unbekannt"}</div>
        </div>
      </div>

      <ThreadMessages
        threadId={threadId}
        currentUserId={session.user.id}
        messages={messages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        }))}
        maxOtherReadAtIso={maxOtherReadAtIso}
      />

      <ReplyBox threadId={threadId} />
    </div>
  );
}
