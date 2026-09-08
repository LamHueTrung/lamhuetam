import { clearAllCaches, getDBRecordCounts } from '../db';

export interface StorageEstimateResult {
  usage: number;
  quota: number;
  percent: number;
  usageFormatted: string;
  quotaFormatted: string;
}

export interface LocalStorageStats {
  totalSize: number;
  totalSizeFormatted: string;
  aiCacheSize: number;
  aiCacheCount: number;
  tempCacheSize: number;
  tempCacheCount: number;
  totalKeys: number;
}

export interface CacheStorageStats {
  cacheNames: string[];
  cacheCount: number;
}

export interface IndexedDBStats {
  counts: {
    transactions: number;
    budgets: number;
    debts: number;
    savings: number;
    categories: number;
    fixedExpenseCategories: number;
    fixedExpenseTasks: number;
    salaryConfigs: number;
    diary: number;
    syncQueue: number;
  };
  totalRecords: number;
}

export interface FullStorageStats {
  estimate: StorageEstimateResult;
  localStorageStats: LocalStorageStats;
  cacheStorageStats: CacheStorageStats;
  indexedDBStats: IndexedDBStats;
  lastUpdated: string;
}

export const AI_CACHE_KEYS = [
  'ml_forecast_cache',
  'ml_forecast_tx_sig',
  'ai_insight_cache',
  'ai_insight_date',
  'ml_optimizer_cache',
];

export const TEMP_CACHE_KEYS = [
  'seen_anomaly_tx_ids',
  'user_profile_data',
  'user_profile_custom_data',
];

export const PROTECTED_KEYS = [
  'auth_token',
  'auth_username',
  'dark_mode',
  'app_accent_theme',
];

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export async function getStorageEstimate(): Promise<StorageEstimateResult> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percent = quota > 0 ? Math.min(100, Math.round((usage / quota) * 1000) / 10) : 0;
      return {
        usage,
        quota,
        percent,
        usageFormatted: formatBytes(usage),
        quotaFormatted: formatBytes(quota),
      };
    } catch (e) {
      console.warn('Storage estimate failed:', e);
    }
  }
  return {
    usage: 0,
    quota: 0,
    percent: 0,
    usageFormatted: '0 B',
    quotaFormatted: 'Không xác định',
  };
}

export function getLocalStorageStats(): LocalStorageStats {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      totalSize: 0,
      totalSizeFormatted: '0 B',
      aiCacheSize: 0,
      aiCacheCount: 0,
      tempCacheSize: 0,
      tempCacheCount: 0,
      totalKeys: 0,
    };
  }

  let totalSize = 0;
  let aiCacheSize = 0;
  let aiCacheCount = 0;
  let tempCacheSize = 0;
  let tempCacheCount = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const value = localStorage.getItem(key) || '';
    // Approximate UTF-16 byte length (key + value) * 2 bytes
    const itemSize = (key.length + value.length) * 2;
    totalSize += itemSize;

    if (AI_CACHE_KEYS.includes(key)) {
      aiCacheSize += itemSize;
      aiCacheCount++;
    } else if (TEMP_CACHE_KEYS.includes(key)) {
      tempCacheSize += itemSize;
      tempCacheCount++;
    }
  }

  return {
    totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    aiCacheSize,
    aiCacheCount,
    tempCacheSize,
    tempCacheCount,
    totalKeys: localStorage.length,
  };
}

export async function getCacheStorageStats(): Promise<CacheStorageStats> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { cacheNames: [], cacheCount: 0 };
  }
  try {
    const cacheNames = await caches.keys();
    return {
      cacheNames,
      cacheCount: cacheNames.length,
    };
  } catch {
    return { cacheNames: [], cacheCount: 0 };
  }
}

export async function getIndexedDBStats(): Promise<IndexedDBStats> {
  try {
    const counts = await getDBRecordCounts();
    return {
      counts: {
        transactions: counts.transactions,
        budgets: counts.budgets,
        debts: counts.debts,
        savings: counts.savings,
        categories: counts.categories,
        fixedExpenseCategories: counts.fixedExpenseCategories,
        fixedExpenseTasks: counts.fixedExpenseTasks,
        salaryConfigs: counts.salaryConfigs,
        diary: counts.diary,
        syncQueue: counts.syncQueue,
      },
      totalRecords: counts.totalRecords,
    };
  } catch (e) {
    console.error('Lỗi khi đọc thống kê IndexedDB:', e);
    return {
      counts: {
        transactions: 0,
        budgets: 0,
        debts: 0,
        savings: 0,
        categories: 0,
        fixedExpenseCategories: 0,
        fixedExpenseTasks: 0,
        salaryConfigs: 0,
        diary: 0,
        syncQueue: 0,
      },
      totalRecords: 0,
    };
  }
}

export async function fetchFullStorageStats(): Promise<FullStorageStats> {
  const [estimate, indexedDBStats, cacheStorageStats] = await Promise.all([
    getStorageEstimate(),
    getIndexedDBStats(),
    getCacheStorageStats(),
  ]);
  const localStorageStats = getLocalStorageStats();

  return {
    estimate,
    localStorageStats,
    cacheStorageStats,
    indexedDBStats,
    lastUpdated: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

export function clearAICache(): { count: number; bytes: number } {
  let bytes = 0;
  let count = 0;
  AI_CACHE_KEYS.forEach((k) => {
    const val = localStorage.getItem(k);
    if (val !== null) {
      bytes += (k.length + val.length) * 2;
      localStorage.removeItem(k);
      count++;
    }
  });
  return { count, bytes };
}

export function clearTempCache(): { count: number; bytes: number } {
  let bytes = 0;
  let count = 0;
  TEMP_CACHE_KEYS.forEach((k) => {
    const val = localStorage.getItem(k);
    if (val !== null) {
      bytes += (k.length + val.length) * 2;
      localStorage.removeItem(k);
      count++;
    }
  });
  return { count, bytes };
}

export async function clearPWACache(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;
  try {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    return names.length;
  } catch (e) {
    console.error('Lỗi xóa cache storage:', e);
    return 0;
  }
}

export async function clearIndexedDBCache(): Promise<void> {
  await clearAllCaches();
}

export async function quickCleanStorage(): Promise<{
  aiCleaned: { count: number; bytes: number };
  tempCleaned: { count: number; bytes: number };
  pwaCleaned: number;
  totalBytesCleaned: number;
}> {
  const aiCleaned = clearAICache();
  const tempCleaned = clearTempCache();
  const pwaCleaned = await clearPWACache();
  const totalBytesCleaned = aiCleaned.bytes + tempCleaned.bytes;

  return {
    aiCleaned,
    tempCleaned,
    pwaCleaned,
    totalBytesCleaned,
  };
}
