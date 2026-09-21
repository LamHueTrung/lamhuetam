import { supabase } from '../lib/supabase';
import { logEvent } from '../services/supabaseDataService';

/**
 * 1. QUÉT & TỰ ĐỘNG TẠO GIAO DỊCH ĐỊNH KỲ (Recurring Transactions)
 */
export async function processRecurringTransactions() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { data: recurringTx, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_recurring', true);

    if (error || !recurringTx) return;

    for (const tx of recurringTx) {
      if (tx.frequency === 'monthly') {
        const txDay = new Date(tx.date).getDate();
        const currentDay = new Date().getDate();
        if (txDay === currentDay && tx.date !== today) {
          // Tạo bản ghi mới cho tháng hiện tại
          await supabase.from('transactions').insert({
            type: tx.type,
            amount: tx.amount,
            category: tx.category,
            date: today,
            description: `[Định kỳ] ${tx.description}`,
            wallet: tx.wallet,
            is_recurring: false,
          });
        }
      }
    }
    await logEvent('finance', 'process_recurring_transactions_done', { count: recurringTx.length });
  } catch (err: any) {
    console.error('Error processing recurring transactions:', err);
  }
}

/**
 * 2. TÍNH TOÁN TRƯỚC CHỈ SỐ ML (Precompute ML Metrics)
 */
export async function precomputeMLFinancialMetrics() {
  const startTime = performance.now();
  try {
    const { data: txs } = await supabase.from('transactions').select('*');
    if (!txs || txs.length === 0) return;

    // Tính Daily Burn Rate
    const expenses = txs.filter((t: any) => t.type === 'expense');
    const totalExpense = expenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const dailyBurnRate = Math.round(totalExpense / Math.max(expenses.length, 30));

    // Tính tổng số dư hiện tại
    const incomes = txs.filter((t: any) => t.type === 'income');
    const totalIncome = incomes.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const currentBalance = totalIncome - totalExpense;

    // Runway Days
    const runwayDays = dailyBurnRate > 0 ? Math.floor(Math.max(0, currentBalance) / dailyBurnRate) : 999;

    // Lưu vào bảng Cache
    await supabase.from('ml_precomputed_metrics').upsert({
      id: 'current_metrics',
      runway_days: runwayDays,
      daily_burn_rate: dailyBurnRate,
      last_computed_at: new Date().toISOString(),
    });

    const duration = Math.round(performance.now() - startTime);
    await logEvent('system', 'ml_precompute_success', { runwayDays, dailyBurnRate }, 'info', duration);
  } catch (err: any) {
    await logEvent('system', 'ml_precompute_failed', { error: err.message }, 'warning');
  }
}

/**
 * 3. TÌM KIẾM NGỮ NGHĨA NHẬT KÝ (Semantic Search)
 */
export async function semanticSearchDiary(query: string) {
  // Có thể fallback tìm kiếm từ khóa nâng cao nếu chưa cấu hình vector embeddings
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .textSearch('content', query, { type: 'websearch' });

  if (error || !data || data.length === 0) {
    const { data: fallbackData } = await supabase
      .from('diary_entries')
      .select('*')
      .ilike('content', `%${query}%`);
    return fallbackData || [];
  }
  return data;
}
