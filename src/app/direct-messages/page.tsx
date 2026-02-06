import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DirectMessagesIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const userId = session.user.id;

  const lastMessages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      content: true,
      createdAt: true,
      sender: { select: { id: true, name: true, image: true } },
      receiver: { select: { id: true, name: true, image: true } },
    },
  });

  const seen = new Set<string>();
  const conversations: Array<{
    otherUser: { id: string; name: string | null; image: string | null };
    lastMessage: { id: string; content: string; createdAt: Date; isMe: boolean };
  }> = [];

  for (const m of lastMessages) {
    const other = m.senderId === userId ? m.receiver : m.sender;
    if (!other) continue;
    if (seen.has(other.id)) continue;
    seen.add(other.id);

    conversations.push({
      otherUser: other,
      lastMessage: { id: m.id, content: m.content, createdAt: m.createdAt, isMe: m.senderId === userId },
    });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="tf-display text-2xl font-bold text-[var(--foreground)]">Direktnachrichten</h1>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        {conversations.length === 0 ? (
          <div className="text-[var(--muted)]">Noch keine Direktnachrichten.</div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {conversations.map((c) => (
              <li key={c.otherUser.id} className="py-4 first:pt-0 last:pb-0">
                <Link href={`/direct-messages/${c.otherUser.id}`} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--foreground)] truncate">{c.otherUser.name || "Unbekannt"}</div>
                    <div className="text-sm text-[var(--muted)] truncate">{c.lastMessage.content}</div>
                  </div>
                  <div className="text-sm text-[var(--link)] font-medium">Öffnen</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
