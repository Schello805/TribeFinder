"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type Message = {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null };
};

export default function ThreadMessages(props: {
  threadId: string;
  currentUserId: string;
  messages: Message[];
  maxOtherReadAtIso: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    window.dispatchEvent(new Event("tribefinder:messages-read"));
  }, [props.threadId]);

  const maxOtherReadAt = useMemo(() => {
    if (!props.maxOtherReadAtIso) return null;
    const d = new Date(props.maxOtherReadAtIso);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [props.maxOtherReadAtIso]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const canEditDelete = (m: Message) => {
    if (m.authorId !== props.currentUserId) return false;

    const created = new Date(m.createdAt);
    if (Number.isNaN(created.getTime())) return false;

    if (!maxOtherReadAt) return true;
    return maxOtherReadAt < created;
  };

  const startEdit = (m: Message) => {
    setEditingId(m.id);
    setDraft(m.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const next = draft.trim();
    if (!next) {
      showToast("Bitte eine Nachricht eingeben", "error");
      return;
    }

    setBusyId(editingId);
    try {
      const res = await fetch(`/api/messages/threads/${props.threadId}/messages/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.message || "Konnte Nachricht nicht bearbeiten", "error");
        return;
      }
      cancelEdit();
      router.refresh();
    } catch {
      showToast("Konnte Nachricht nicht bearbeiten", "error");
    } finally {
      setBusyId(null);
    }
  };

  const deleteMessage = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/messages/threads/${props.threadId}/messages/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.message || "Konnte Nachricht nicht löschen", "error");
        return;
      }
      router.refresh();
    } catch {
      showToast("Konnte Nachricht nicht löschen", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-[var(--surface)] text-[var(--foreground)] rounded-xl border border-[var(--border)] p-6 space-y-4">
      {props.messages.map((m) => {
        const isMe = m.authorId === props.currentUserId;
        const allowed = canEditDelete(m);
        const isEditing = editingId === m.id;
        const isBusy = busyId === m.id;

        return (
          <div key={m.id} className={isMe ? "text-right" : "text-left"}>
            <div
              className={
                isMe
                  ? "inline-block bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-2xl max-w-[85%]"
                  : "inline-block bg-[var(--surface-2)] text-[var(--foreground)] px-4 py-2 rounded-2xl max-w-[85%] border border-[var(--border)]"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs opacity-80 mb-1">{isMe ? "Du" : m.author.name || "Unbekannt"}</div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={3}
                        className={
                          isMe
                            ? "w-full px-3 py-2 rounded-md bg-[var(--primary-active)]/30 text-[var(--primary-foreground)] border border-[var(--primary)]/40"
                            : "w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                        }
                      />
                      <div className={isMe ? "flex justify-end gap-2" : "flex gap-2"}>
                        <button
                          onClick={cancelEdit}
                          disabled={isBusy}
                          className={
                            isMe
                              ? "px-3 py-1.5 rounded-md bg-[color-mix(in_srgb,var(--primary-foreground)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary-foreground)_20%,transparent)] disabled:opacity-50 transition"
                              : "px-3 py-1.5 rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] disabled:opacity-50 transition"
                          }
                        >
                          Abbrechen
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={isBusy}
                          className={
                            isMe
                              ? "px-3 py-1.5 rounded-md bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-hover)] disabled:opacity-50 transition"
                              : "px-3 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] disabled:opacity-50 transition"
                          }
                        >
                          Speichern
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  )}
                </div>

                {isMe && !isEditing && allowed ? (
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={() => startEdit(m)}
                      disabled={isBusy}
                      className="text-xs px-2 py-1 rounded-md bg-[color-mix(in_srgb,var(--primary-foreground)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary-foreground)_20%,transparent)] disabled:opacity-50 transition"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => deleteMessage(m.id)}
                      disabled={isBusy}
                      className="text-xs px-2 py-1 rounded-md bg-[color-mix(in_srgb,var(--primary-foreground)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary-foreground)_20%,transparent)] disabled:opacity-50 transition"
                    >
                      Löschen
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
