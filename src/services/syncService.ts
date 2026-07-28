import db, { type SyncQueueItem } from '../db';

const BASE = '/.netlify/functions';

type Listener = (count: number) => void;
const listeners: Set<Listener> = new Set();

function notify(count: number) {
  listeners.forEach(fn => fn(count));
}

export function onQueueChange(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export async function getQueueCount(): Promise<number> {
  return db.syncQueue.count();
}

export async function enqueue(
  table: string,
  operation: SyncQueueItem['operation'],
  endpoint: string,
  method: string,
  body?: any,
  localId?: string,
) {
  await db.syncQueue.add({
    table,
    operation,
    endpoint,
    method,
    body,
    localId,
    timestamp: Date.now(),
    retryCount: 0,
  });
  notify(await db.syncQueue.count());
}

export async function removeFromQueue(id: number) {
  await db.syncQueue.delete(id);
  notify(await db.syncQueue.count());
}

export async function processSyncQueue(): Promise<{ success: number; failed: number }> {
  if (!navigator.onLine) return { success: 0, failed: 0 };

  const items = await db.syncQueue.orderBy('timestamp').toArray();
  let success = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const res = await fetch(item.endpoint, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const result = await res.json().catch(() => null);

      // Update local cache with server response
      if (result && item.localId) {
        try {
          const table = db[item.table as keyof typeof db] as any;
          if (table?.put) {
            // If server returned data with real ID, delete local and put server version
            if (item.operation === 'create') {
              await table.where('id').equals(item.localId).delete();
            }
            await table.put({ ...result, _syncStatus: 'synced' });
          }
        } catch { /* cache update best-effort */ }
      }

      await removeFromQueue(item.id!);
      success++;
    } catch {
      await db.syncQueue.update(item.id!, { retryCount: item.retryCount + 1 });
      failed++;
    }
  }

  return { success, failed };
}

export async function scheduleSync() {
  if (!navigator.onLine) return;
  const { success, failed } = await processSyncQueue();
  if (success > 0 || failed > 0) {
    const count = await getQueueCount();
    notify(count);
  }
}
