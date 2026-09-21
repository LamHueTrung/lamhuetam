/**
 * SCRIPT DI CHUYỂN DỮ LIỆU TỪ MONGODB SANG SUPABASE POSTGRESQL (1-TIME MIGRATION)
 * Cách sử dụng: Chạy script này một lần để đưa toàn bộ dữ liệu từ MongoDB sang PostgreSQL
 */

import { supabase } from '../src/lib/supabase';

export async function runMigrationFromMongoToSupabase(mongoDump: {
  transactions?: any[];
  diary?: any[];
  debts?: any[];
  categories?: any[];
  userProfile?: any;
}) {
  console.log('🚀 Bắt đầu quá trình di chuyển dữ liệu sang Supabase PostgreSQL...');

  // 1. Chuyển Categories
  if (mongoDump.categories?.length) {
    const formattedCats = mongoDump.categories.map((c) => ({
      id: c._id || c.id,
      name: c.name,
      icon: c.icon || 'mdi-cash',
      color: c.color || '#3B82F6',
      display_order: c.order || 0,
      type: c.type || 'expense',
    }));
    const { error } = await supabase.from('categories').upsert(formattedCats);
    if (error) console.error('Lỗi khi migrate categories:', error);
    else console.log(`✅ Đã chuyển thành công ${formattedCats.length} categories.`);
  }

  // 2. Chuyển Transactions
  if (mongoDump.transactions?.length) {
    const formattedTxs = mongoDump.transactions.map((t) => ({
      id: t.id || t._id,
      type: t.type,
      amount: t.amount,
      category: t.category,
      date: t.date,
      description: t.description || '',
      wallet: t.wallet || 'Tiền mặt',
      is_recurring: t.isRecurring || false,
      frequency: t.frequency || 'none',
      is_credit_card_paid: t.isCreditCardPaid || false,
      credit_card_paid_date: t.creditCardPaidDate || null,
      credit_card_due_date: t.creditCardDueDate || null,
    }));
    const { error } = await supabase.from('transactions').upsert(formattedTxs);
    if (error) console.error('Lỗi khi migrate transactions:', error);
    else console.log(`✅ Đã chuyển thành công ${formattedTxs.length} transactions.`);
  }

  // 3. Chuyển Diary Entries
  if (mongoDump.diary?.length) {
    const formattedDiary = mongoDump.diary.map((d) => ({
      id: d._id || d.id,
      date: d.date,
      content: d.content,
      mood: d.mood || 'neutral',
      location: d.location || '',
      lat: d.lat || null,
      lng: d.lng || null,
      tags: d.tags || [],
      images: d.images || [],
      replies: d.replies || [],
      pinned: d.pinned || false,
    }));
    const { error } = await supabase.from('diary_entries').upsert(formattedDiary);
    if (error) console.error('Lỗi khi migrate diary:', error);
    else console.log(`✅ Đã chuyển thành công ${formattedDiary.length} diary entries.`);
  }

  // 4. Chuyển Debts
  if (mongoDump.debts?.length) {
    const formattedDebts = mongoDump.debts.map((d) => ({
      id: d.id || d._id,
      type: d.type,
      name: d.name,
      original_amount: d.originalAmount,
      current_balance: d.currentBalance,
      monthly_payment: d.monthlyPayment,
      interest_rate: d.interestRate,
      payment_day: d.paymentDay,
      start_date: d.startDate,
      maturity_date: d.maturityDate,
      total_installments: d.totalInstallments,
      paid_installments: d.paidInstallments,
      status: d.status,
      installments: d.installments || [],
      notes: d.notes || '',
    }));
    const { error } = await supabase.from('debts').upsert(formattedDebts);
    if (error) console.error('Lỗi khi migrate debts:', error);
    else console.log(`✅ Đã chuyển thành công ${formattedDebts.length} debts.`);
  }

  console.log('🎉 Hoàn tất di chuyển dữ liệu từ MongoDB sang Supabase PostgreSQL!');
}
