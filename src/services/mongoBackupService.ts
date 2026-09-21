import { supabase } from '../lib/supabase';
import { logEvent } from './supabaseDataService';

export interface BackupResult {
  success: boolean;
  timestamp: string;
  collectionsBackedUp: {
    transactions: number;
    diary: number;
    debts: number;
    categories: number;
  };
  message: string;
}

/**
 * Hàm lấy toàn bộ dữ liệu từ Supabase và gửi sang MongoDB Endpoint làm bản sao lưu an toàn
 */
export async function backupDataToMongoDB(): Promise<BackupResult> {
  const startTime = performance.now();
  try {
    // 1. Lấy dữ liệu mới nhất từ Supabase PostgreSQL
    const [txRes, diaryRes, debtRes, catRes] = await Promise.all([
      supabase.from('transactions').select('*'),
      supabase.from('diary_entries').select('*'),
      supabase.from('debts').select('*'),
      supabase.from('categories').select('*'),
    ]);

    const backupPayload = {
      timestamp: new Date().toISOString(),
      transactions: txRes.data || [],
      diaryEntries: diaryRes.data || [],
      debts: debtRes.data || [],
      categories: catRes.data || [],
    };

    // 2. Gửi snapshot tới Endpoint MongoDB
    const res = await fetch('/.netlify/functions/backup-mongodb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupPayload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errData.error || errData.message || `Lỗi máy chủ (${res.status})`);
    }

    const resJson = await res.json();

    // Lưu một bản sao dự phòng offline vào LocalStorage
    localStorage.setItem('last_mongodb_backup_snapshot', JSON.stringify({
      timestamp: backupPayload.timestamp,
      count: {
        tx: backupPayload.transactions.length,
        diary: backupPayload.diaryEntries.length,
      }
    }));

    const duration = Math.round(performance.now() - startTime);
    await logEvent('system', 'backup_to_mongodb_success', {
      txCount: backupPayload.transactions.length,
      diaryCount: backupPayload.diaryEntries.length,
    }, 'info', duration);

    return {
      success: true,
      timestamp: backupPayload.timestamp,
      collectionsBackedUp: {
        transactions: backupPayload.transactions.length,
        diary: backupPayload.diaryEntries.length,
        debts: backupPayload.debts.length,
        categories: backupPayload.categories.length,
      },
      message: 'Đã sao lưu thành công toàn bộ dữ liệu sang MongoDB!',
    };
  } catch (error: any) {
    const duration = Math.round(performance.now() - startTime);
    await logEvent('system', 'backup_to_mongodb_failed', { error: error.message }, 'critical', duration);
    return {
      success: false,
      timestamp: new Date().toISOString(),
      collectionsBackedUp: { transactions: 0, diary: 0, debts: 0, categories: 0 },
      message: error.message || 'Sao lưu thất bại. Vui lòng thử lại!',
    };
  }
}
