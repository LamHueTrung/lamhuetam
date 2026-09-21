import { supabase } from '../lib/supabase';
import type {
  Transaction,
  Budget,
  DebtAccount,
  SavingsGoal,
  Category,
  FixedExpenseCategory,
  FixedExpenseTask,
  SalaryConfig,
  DiaryEntry,
  TetPlannerStoredConfig,
  CalendarEvent,
  UserProfile,
} from '../types';

// ── LOG SERVICE CHO PHÒNG LAB SOC-NOC ──────────────────────────
export async function logEvent(
  module: 'finance' | 'diary' | 'security' | 'system',
  action: string,
  details: any = {},
  level: 'info' | 'warning' | 'critical' | 'auth' = 'info',
  latencyMs: number = 0
) {
  try {
    await supabase.from('event_logs').insert([
      {
        module,
        action,
        details,
        level,
        latency_ms: latencyMs,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      },
    ]);
  } catch (err) {
    console.warn('[SOC-NOC Logger] Failed to log event:', err);
  }
}

// ── TRANSACTIONS SERVICE ───────────────────────────────────────
export async function getTransactionsFromSupabase(): Promise<Transaction[]> {
  const start = performance.now();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });

  const duration = Math.round(performance.now() - start);
  if (error) {
    await logEvent('finance', 'fetch_transactions_failed', { error: error.message }, 'warning', duration);
    throw error;
  }
  await logEvent('finance', 'fetch_transactions', { count: data?.length || 0 }, 'info', duration);
  return (data || []).map((t: any) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    category: t.category,
    date: t.date,
    description: t.description || '',
    wallet: t.wallet || 'Tiền mặt',
    receiptUrl: t.receipt_url,
    isRecurring: t.is_recurring,
    frequency: t.frequency,
    isCreditCardPaid: t.is_credit_card_paid,
    creditCardPaidDate: t.credit_card_paid_date,
    creditCardDueDate: t.credit_card_due_date,
  }));
}

export async function upsertTransactionToSupabase(tx: Transaction): Promise<Transaction> {
  const start = performance.now();
  const payload = {
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    category: tx.category,
    date: tx.date,
    description: tx.description,
    wallet: tx.wallet,
    receipt_url: (tx as any).receiptUrl || null,
    is_recurring: tx.isRecurring || false,
    frequency: tx.frequency || 'none',
    is_credit_card_paid: tx.isCreditCardPaid || false,
    credit_card_paid_date: tx.creditCardPaidDate || null,
    credit_card_due_date: tx.creditCardDueDate || null,
  };

  const { data, error } = await supabase.from('transactions').upsert(payload).select().single();
  const duration = Math.round(performance.now() - start);

  if (error) {
    await logEvent('finance', 'upsert_transaction_failed', { error: error.message, txId: tx.id }, 'critical', duration);
    throw error;
  }
  await logEvent('finance', 'upsert_transaction_success', { txId: tx.id, amount: tx.amount }, 'info', duration);
  return tx;
}

export async function deleteTransactionFromSupabase(id: string): Promise<void> {
  const start = performance.now();
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  const duration = Math.round(performance.now() - start);

  if (error) {
    await logEvent('finance', 'delete_transaction_failed', { error: error.message, id }, 'warning', duration);
    throw error;
  }
  await logEvent('finance', 'delete_transaction_success', { id }, 'info', duration);
}

// ── DIARY SERVICE ──────────────────────────────────────────────
export async function getDiaryEntriesFromSupabase(): Promise<DiaryEntry[]> {
  const start = performance.now();
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .order('date', { ascending: false });

  const duration = Math.round(performance.now() - start);
  if (error) {
    await logEvent('diary', 'fetch_diary_failed', { error: error.message }, 'warning', duration);
    throw error;
  }
  await logEvent('diary', 'fetch_diary_success', { count: data?.length || 0 }, 'info', duration);
  return (data || []).map((d: any) => ({
    _id: d.id,
    id: d.id,
    date: d.date,
    content: d.content,
    mood: d.mood,
    location: d.location || '',
    lat: d.lat,
    lng: d.lng,
    tags: d.tags || [],
    images: d.images || [],
    replies: d.replies || [],
    pinned: d.pinned || false,
    createdAt: d.created_at,
  }));
}

export async function upsertDiaryEntryToSupabase(entry: DiaryEntry): Promise<DiaryEntry> {
  const start = performance.now();
  const payload = {
    id: entry.id || entry._id,
    date: entry.date,
    content: entry.content,
    mood: entry.mood,
    location: entry.location,
    lat: entry.lat,
    lng: entry.lng,
    tags: entry.tags || [],
    images: entry.images || [],
    replies: entry.replies || [],
    pinned: entry.pinned || false,
  };

  const { error } = await supabase.from('diary_entries').upsert(payload);
  const duration = Math.round(performance.now() - start);

  if (error) {
    await logEvent('diary', 'upsert_diary_failed', { error: error.message }, 'warning', duration);
    throw error;
  }
  await logEvent('diary', 'upsert_diary_success', { id: payload.id }, 'info', duration);
  return entry;
}

// ── USER PROFILE SERVICE ───────────────────────────────────────
export async function getUserProfileFromSupabase(): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    _id: data.id,
    fullName: data.full_name || '',
    dob: data.dob || '',
    hometown: data.hometown || '',
    livingContext: data.living_context || '',
    currentJob: data.current_job || '',
    position: data.position || '',
    skills: data.skills || {},
    education: data.education || {},
    avatar: data.avatar || '',
    phone: data.phone || '',
    emails: data.emails || [],
    customFields: data.custom_fields || [],
    creditCardConfig: data.credit_card_config || {},
    updatedAt: data.updated_at,
  };
}

export async function saveUserProfileToSupabase(profile: UserProfile): Promise<UserProfile> {
  const payload = {
    id: profile._id || 'default_profile',
    full_name: profile.fullName,
    dob: profile.dob,
    hometown: profile.hometown,
    living_context: profile.livingContext,
    current_job: profile.currentJob,
    position: profile.position,
    skills: profile.skills,
    education: profile.education,
    avatar: profile.avatar,
    phone: profile.phone,
    emails: profile.emails,
    custom_fields: profile.customFields,
    credit_card_config: profile.creditCardConfig,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('user_profiles').upsert(payload);
  if (error) throw error;
  await logEvent('security', 'update_user_profile', { fullName: profile.fullName }, 'info');
  return profile;
}

// ── STORAGE: UPLOAD HÓA ĐƠN & ẢNH NHẬT KÝ ──────────────────────
export async function uploadReceiptImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = `receipts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(filePath, file, { cacheControl: '3600', upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
  return data.publicUrl;
}

// ── SYNC: ĐỒNG BỘ TOÀN BỘ TỪ CLIENT (INDEXEDDB / LOCALSTORAGE) LÊN SUPABASE ──
export async function syncAllLocalDataToSupabase(): Promise<{
  transactionsCount: number;
  diaryCount: number;
  debtsCount: number;
  budgetsCount: number;
  categoriesCount: number;
  fixedTasksCount: number;
  calendarEventsCount: number;
  profileSynced: boolean;
}> {
  const start = performance.now();
  const db = (await import('../db')).default;

  const results = {
    transactionsCount: 0,
    diaryCount: 0,
    debtsCount: 0,
    budgetsCount: 0,
    categoriesCount: 0,
    fixedTasksCount: 0,
    calendarEventsCount: 0,
    profileSynced: false,
  };

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id || null;

  // 1. Transactions
  const localTxs = await db.transactions.toArray();
  if (localTxs.length > 0) {
    const txPayloads = localTxs.map((t) => ({
      id: t.id,
      user_id: currentUserId,
      type: t.type,
      amount: t.amount,
      category: t.category,
      date: t.date,
      description: t.description || '',
      wallet: t.wallet || 'Tiền mặt',
      receipt_url: (t as any).receiptUrl || null,
      is_recurring: t.isRecurring || false,
      frequency: t.frequency || 'none',
      is_credit_card_paid: t.isCreditCardPaid || false,
      credit_card_paid_date: t.creditCardPaidDate || null,
      credit_card_due_date: t.creditCardDueDate || null,
    }));
    const { error } = await supabase.from('transactions').upsert(txPayloads, { onConflict: 'id' });
    if (error) console.error('[Sync] Lỗi đồng bộ transactions:', error);
    else results.transactionsCount = txPayloads.length;
  }

  // 2. Diary Entries
  const localDiary = await db.diary.toArray();
  if (localDiary.length > 0) {
    const diaryPayloads = localDiary.map((d: any) => ({
      id: d.id || d._id,
      user_id: currentUserId,
      date: d.date,
      content: d.content,
      mood: d.mood,
      location: d.location || '',
      lat: d.lat || null,
      lng: d.lng || null,
      tags: d.tags || [],
      images: d.images || [],
      replies: d.replies || [],
      pinned: d.pinned || false,
    }));
    const { error } = await supabase.from('diary_entries').upsert(diaryPayloads, { onConflict: 'id' });
    if (error) console.error('[Sync] Lỗi đồng bộ diary:', error);
    else results.diaryCount = diaryPayloads.length;
  }

  // 3. Debts
  const localDebts = await db.debts.toArray();
  if (localDebts.length > 0) {
    const debtPayloads = localDebts.map((d: any) => ({
      id: d.id,
      user_id: currentUserId,
      type: d.type || 'installment',
      name: d.name,
      original_amount: Number(d.originalAmount || d.amount || 0),
      current_balance: Number(d.currentBalance !== undefined ? d.currentBalance : d.originalAmount || d.amount || 0),
      monthly_payment: Number(d.monthlyPayment || 0),
      interest_rate: Number(d.interestRate || 0),
      payment_day: Number(d.paymentDay || 1),
      start_date: d.startDate || '',
      maturity_date: d.maturityDate || d.dueDate || '',
      total_installments: Number(d.totalInstallments || d.installmentsCount || 0),
      paid_installments: Number(d.paidInstallments || 0),
      status: d.status || 'active',
      installments: d.installments || [],
      notes: d.notes || d.description || '',
    }));
    const { error } = await supabase.from('debts').upsert(debtPayloads, { onConflict: 'id' });
    if (error) console.error('[Sync] Lỗi đồng bộ debts:', error);
    else results.debtsCount = debtPayloads.length;
  }

  // 4. Budgets
  const localBudgets = await db.budgets.toArray();
  if (localBudgets.length > 0) {
    const budgetPayloads = localBudgets.map((b: any) => ({
      id: b.id || `budget_${b.category}`,
      user_id: currentUserId,
      category: b.category,
      limit: Number(b.limit || b.amount || 0),
      spent: Number(b.spent || 0),
    }));
    const { error } = await supabase.from('budgets').upsert(budgetPayloads, { onConflict: 'id' });
    if (error) console.error('[Sync] Lỗi đồng bộ budgets:', error);
    else results.budgetsCount = budgetPayloads.length;
  }

  // 5. Categories
  const localCategories = await db.categories.toArray();
  if (localCategories.length > 0) {
    const catPayloads = localCategories.map((c: any) => ({
      id: c._id || c.id,
      user_id: currentUserId,
      name: c.name,
      type: c.type || 'expense',
      icon: c.icon || '',
      color: c.color || '#3B82F6',
    }));
    const { error } = await supabase.from('categories').upsert(catPayloads, { onConflict: 'id' });
    if (error) console.error('[Sync] Lỗi đồng bộ categories:', error);
    else results.categoriesCount = catPayloads.length;
  }

  // 6. Fixed Expense Categories & Tasks
  const localFixedCats = await db.fixedExpenseCategories.toArray();
  if (localFixedCats.length > 0) {
    const fixedCatPayloads = localFixedCats.map((c: any) => ({
      id: c.id || c._id,
      user_id: currentUserId,
      name: c.name,
      icon: c.icon || 'mdi-file-document',
      color: c.color || '#10B981',
    }));
    await supabase.from('fixed_expense_categories').upsert(fixedCatPayloads, { onConflict: 'id' });
  }

  const localFixedTasks = await db.fixedExpenseTasks.toArray();
  if (localFixedTasks.length > 0) {
    const taskPayloads = localFixedTasks.map((t: any) => ({
      id: t.id,
      user_id: currentUserId,
      category_id: t.categoryId,
      category_name: t.categoryName || '',
      name: t.name || t.title || '',
      amount: Number(t.amount || 0),
      month: t.month || new Date().toISOString().slice(0, 7),
      note: t.note || t.notes || '',
    }));
    const { error } = await supabase.from('fixed_expense_tasks').upsert(taskPayloads, { onConflict: 'id' });
    if (error) console.error('[Sync] Lỗi đồng bộ fixed_expense_tasks:', error);
    else results.fixedTasksCount = taskPayloads.length;
  }

  // 7. Calendar Events
  const localEvents = await db.calendarEvents.toArray();
  if (localEvents.length > 0) {
    const eventPayloads = localEvents.map((e) => ({
      id: e.id,
      user_id: currentUserId,
      title: e.title,
      description: e.description || '',
      date: e.date,
      time: e.time || null,
      color: e.color || '#3b82f6',
      tags: e.tags || [],
      is_completed: e.isCompleted || false,
    }));
    const { error } = await supabase.from('calendar_events').upsert(eventPayloads, { onConflict: 'id' });
    if (error) console.error('[Sync] Lỗi đồng bộ calendar_events:', error);
    else results.calendarEventsCount = eventPayloads.length;
  }

  const duration = Math.round(performance.now() - start);
  await logEvent('system', 'manual_full_sync_to_supabase', results, 'info', duration);

  return results;
}

// ── SOC-NOC METRICS SERVICE ────────────────────────────────────
export async function getSOCNOCLogs(limit: number = 50) {
  const { data, error } = await supabase
    .from('event_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

