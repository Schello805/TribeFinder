"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface UserListItem {
  id: string;
  name: string | null;
  email: string;
  emailVerified: string | null;
  role: string;
  isBlocked: boolean;
  createdAt: string;
}

export default function UsersList({
  initialUsers,
  currentUserId,
}: {
  initialUsers: UserListItem[];
  currentUserId: string;
}) {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserListItem[]>(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) setUsers(data);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchUser = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Aktion fehlgeschlagen");
      await refresh();
      showToast("Gespeichert", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Aktion fehlgeschlagen", "error");
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Benutzer wirklich löschen?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Löschen fehlgeschlagen");
      await refresh();
      showToast("Gelöscht", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Löschen fehlgeschlagen", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-transparent dark:border-gray-700">
      <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
        {users.map((user) => (
          <li key={user.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0 gap-4">
                <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-200 font-bold">
                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </span>
                </div>
                <div className="min-w-0 truncate">
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300 truncate">{user.name || "Kein Name"}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
                <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'ADMIN' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200' : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                    }`}>
                        {user.role}
                    </span>
                </div>

                {user.emailVerified ? (
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                      VERIFIED
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                      UNVERIFIED
                    </span>
                  </div>
                )}

                {user.isBlocked ? (
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                      GESPERRT
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busyId === user.id}
                  onClick={() => patchUser(user.id, { emailVerified: !Boolean(user.emailVerified) })}
                  className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  {user.emailVerified ? "Verifizierung entfernen" : "Verifizieren"}
                </button>

                <button
                  type="button"
                  disabled={busyId === user.id || user.id === currentUserId}
                  onClick={() => patchUser(user.id, { role: user.role === "ADMIN" ? "USER" : "ADMIN" })}
                  className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  title={user.id === currentUserId ? "Du kannst deine eigene Rolle nicht ändern" : undefined}
                >
                  {user.role === "ADMIN" ? "Admin entfernen" : "Admin machen"}
                </button>

                <button
                  type="button"
                  disabled={busyId === user.id || user.id === currentUserId}
                  onClick={() => patchUser(user.id, { isBlocked: !user.isBlocked })}
                  className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  title={user.id === currentUserId ? "Du kannst dich nicht selbst sperren" : undefined}
                >
                  {user.isBlocked ? "Entsperren" : "Sperren"}
                </button>

                <button
                  type="button"
                  disabled={busyId === user.id || user.id === currentUserId}
                  onClick={() => deleteUser(user.id)}
                  className="px-3 py-2 rounded-md text-sm font-medium border border-red-200 dark:border-red-800 bg-white dark:bg-gray-950 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  title={user.id === currentUserId ? "Du kannst dich nicht selbst löschen" : undefined}
                >
                  Löschen
                </button>

                {user.id === currentUserId ? (
                  <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">(Du)</span>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
