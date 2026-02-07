type PresenceStore = {
  visitors: Map<string, number>;
  users: Map<string, number>;
};

function getStore(): PresenceStore {
  const g = globalThis as unknown as { __tfPresenceStore?: PresenceStore };
  if (!g.__tfPresenceStore) {
    g.__tfPresenceStore = {
      visitors: new Map<string, number>(),
      users: new Map<string, number>(),
    };
  }
  return g.__tfPresenceStore;
}

export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export function recordVisitorSeen(visitorId: string, now = Date.now()) {
  if (!visitorId) return;
  const store = getStore();
  store.visitors.set(visitorId, now);
}

export function recordUserSeen(userId: string, now = Date.now()) {
  if (!userId) return;
  const store = getStore();
  store.users.set(userId, now);
}

export function cleanupOldPresence(now = Date.now()) {
  const store = getStore();
  const cutoff = now - ONLINE_WINDOW_MS;

  for (const [id, ts] of store.visitors.entries()) {
    if (ts < cutoff) store.visitors.delete(id);
  }

  for (const [id, ts] of store.users.entries()) {
    if (ts < cutoff) store.users.delete(id);
  }
}

export function getOnlineSnapshot(now = Date.now()) {
  cleanupOldPresence(now);
  const store = getStore();

  return {
    onlineVisitors: store.visitors.size,
    onlineUserIds: Array.from(store.users.keys()),
  };
}

export function getUserLastSeen(userId: string, now = Date.now()): number | null {
  cleanupOldPresence(now);
  const store = getStore();
  const ts = store.users.get(userId);
  return typeof ts === "number" ? ts : null;
}
