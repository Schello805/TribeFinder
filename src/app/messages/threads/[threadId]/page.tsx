import Link from "next/link";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import ReplyBox from "@/components/messages/ReplyBox";
import ThreadMessages from "@/components/messages/ThreadMessages";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

import ArchiveThreadButton from "@/components/messages/ArchiveThreadButton";

type ThreadMessageItem = {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  author: { id: string; name: string | null; image: string | null };
};

type ThreadReadStateItem = { userId: string; lastReadAt: Date; archivedAt?: Date | null };

type ThreadData = {
  id: string;
  groupId: string;
  createdByUserId: string;
  subject: string | null;
  group: { id: string; name: string; image: string | null };
  createdBy: { id: string; name: string | null; image: string | null };
  messages: ThreadMessageItem[];
  readStates: ThreadReadStateItem[];
};

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const threadId = (await params).threadId;

  let supportsArchive = true;
  let thread: ThreadData | null = null;
  try {
    thread = (await prisma.groupThread.findUnique({
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
    })) as ThreadData | null;
  } catch {
    supportsArchive = false;
    thread = (await prisma.groupThread.findUnique({
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
    })) as ThreadData | null;
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

  await prisma.groupThreadReadState.upsert({
    where: { threadId_userId: { threadId, userId: session.user.id } },
    update: { lastReadAt: new Date() },
    create: { threadId, userId: session.user.id, lastReadAt: new Date() },
  });

  const groupImg = normalizeUploadedImageUrl(thread.group.image) ?? "";
  const messages = thread.messages;

  const maxOtherReadAtMs = thread.readStates
    .filter((s) => s.userId !== session.user.id)
    .reduce<number | null>((acc, s) => {
      const ms = s.lastReadAt.getTime();
      if (Number.isNaN(ms)) return acc;
      if (acc === null) return ms;
      return Math.max(acc, ms);
    }, null);

  const maxOtherReadAtIso = maxOtherReadAtMs === null ? null : new Date(maxOtherReadAtMs).toISOString();

  const currentReadState = thread.readStates.find((s) => s.userId === session.user.id);
  const initialArchived = supportsArchive ? Boolean(currentReadState?.archivedAt) : false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-[var(--muted)]">Thread</div>
          <h1 className="tf-display text-2xl font-bold text-[var(--foreground)] truncate">
            {thread.subject || `Nachricht an ${thread.group.name}`}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {supportsArchive ? <ArchiveThreadButton threadId={threadId} initialArchived={initialArchived} /> : null}
          <Link href="/messages" className="text-[var(--link)] hover:underline font-medium">
            Zur Inbox
          </Link>
        </div>
      </div>

      <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-xl border border-[var(--border)] p-4 flex items-center gap-3">
        {groupImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={groupImg} alt={thread.group.name} className="h-10 w-10 rounded-lg object-cover border border-[var(--border)]" />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] font-bold">
            {thread.group.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-medium text-[var(--foreground)] truncate">{thread.group.name}</div>
          <div className="text-xs text-[var(--muted)]">{isCreator ? "Du" : thread.createdBy.name || "Unbekannt"}</div>
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
