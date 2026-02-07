"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";

type Msg = { id: string; senderId: string; receiverId: string; content: string; createdAt: string | Date };

type ThreadData = {
  otherUser: { id: string; name: string | null; image: string | null };
  messages: Msg[];
};

export default function DirectMessageThreadPage() {
  const params = useParams<{ otherUserId: string }>();
  const otherUserId = String(params.otherUserId || "");
  const router = useRouter();
  const { showToast } = useToast();
  const { data: session, status } = useSession();

  const [data, setData] = useState<ThreadData | null>(null);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const load = async () => {
    if (status !== "authenticated") {
      router.replace("/auth/signin");
      return;
    }
    if (!otherUserId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/direct-messages/threads/${otherUserId}`, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as { otherUser?: ThreadData["otherUser"]; messages?: Msg[]; message?: string };
      if (!res.ok) {
        showToast(json?.message || "Konnte Thread nicht laden", "error");
        return;
      }
      setData({ otherUser: json.otherUser!, messages: json.messages || [] });
      window.dispatchEvent(new Event("tribefinder:messages-read"));
    } catch {
      showToast("Konnte Thread nicht laden", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId]);

  const send = async () => {
    if (status !== "authenticated") {
      router.replace("/auth/signin");
      return;
    }
    const next = content.trim();
    if (!next) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/direct-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: otherUserId, content: next }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        showToast(json?.message || "Konnte Nachricht nicht senden", "error");
        return;
      }
      setContent("");
      await load();
      router.refresh();
    } catch {
      showToast("Konnte Nachricht nicht senden", "error");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="text-[var(--muted)]">Lade…</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-[var(--muted)]">Direktnachricht</div>
          <h1 className="tf-display text-2xl font-bold text-[var(--foreground)] truncate">{data.otherUser.name || "Unbekannt"}</h1>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-3">
        {data.messages.length === 0 ? (
          <div className="text-[var(--muted)]">Noch keine Nachrichten.</div>
        ) : (
          <div className="space-y-3">
            {data.messages.map((m) => {
              const isMine = !!session?.user?.id && m.senderId === session.user.id;
              const senderLabel = isMine ? "Du" : data.otherUser.name || "Unbekannt";
              const time = new Date(m.createdAt).toLocaleString("de-DE", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] border border-[var(--border)] rounded-lg p-3 whitespace-pre-wrap break-words ${
                      isMine ? "bg-[var(--surface-2)]" : "bg-[var(--surface-2)]"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3 text-[10px] text-[var(--muted)]">
                      <span className="font-medium">{senderLabel}</span>
                      <span className="whitespace-nowrap">{time}</span>
                    </div>
                    <div className="text-[var(--foreground)]">{m.content}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          placeholder="Deine Nachricht…"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void send()}
            disabled={isSending}
            className="px-4 py-2 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50 transition font-medium"
          >
            {isSending ? "Senden…" : "Senden"}
          </button>
        </div>
      </div>
    </div>
  );
}
