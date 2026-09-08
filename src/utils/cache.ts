interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_TTL = 5 * 60 * 1000;

export function getFromCache<T>(key: string, ttl = DEFAULT_TTL): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttl) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setToCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* storage full — ignore */
  }
}

export function clearCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

export async function clearAppDataCache(): Promise<void> {
  try {
    // Chỉ xóa các key cache dữ liệu tạm trong localStorage, giữ lại cài đặt hệ thống
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.endsWith('_cache') || key.startsWith('ml_') || key.startsWith('ai_insight'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Xóa CacheStorage nhưng BẢO VỆ các cache tĩnh PWA / Workbox để offline hoạt động bình thường
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map(cacheName => {
          const isPWAPrecache =
            cacheName.includes('workbox') ||
            cacheName.includes('precache') ||
            cacheName.includes('pwa') ||
            cacheName.includes('static');
          
          // Chỉ xóa cache động nếu không thuộc cấu hình PWA offline
          if (!isPWAPrecache) {
            return caches.delete(cacheName);
          }
          return Promise.resolve(false);
        })
      );
    }
  } catch (e) {
    console.warn('[Cache] Safe clear app data cache warning:', e);
  }
}

export function isOnline(): boolean {
  return navigator.onLine;
}