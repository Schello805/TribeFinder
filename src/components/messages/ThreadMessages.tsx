"use client";

import { useMemo, useState } from "react";
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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
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
                  ? "inline-block bg-indigo-600 text-white px-4 py-2 rounded-2xl max-w-[85%]"
                  : "inline-block bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-2xl max-w-[85%]"
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
                            ? "w-full px-3 py-2 rounded-md bg-indigo-500/40 text-white placeholder:text-indigo-100 border border-indigo-400/40"
                            : "w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        }
                      />
                      <div className={isMe ? "flex justify-end gap-2" : "flex gap-2"}>
                        <button
                          onClick={cancelEdit}
                          disabled={isBusy}
                          className={
                            isMe
                              ? "px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-50"
                              : "px-3 py-1.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                          }
                        >
                          Abbrechen
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={isBusy}
                          className={
                            isMe
                              ? "px-3 py-1.5 rounded-md bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                              : "px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
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
                      className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-50"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => deleteMessage(m.id)}
                      disabled={isBusy}
                      className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-50"
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
