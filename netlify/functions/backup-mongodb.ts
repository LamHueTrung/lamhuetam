import { Handler } from "@netlify/functions";
import { connectDB, Transaction, DiaryEntry, Debt, CategoryModel } from "./_db";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    await connectDB();
    const data = JSON.parse(event.body || "{}");
    const { transactions = [], diaryEntries = [], debts = [], categories = [] } = data;

    let txCount = 0;
    let diaryCount = 0;
    let debtCount = 0;
    let catCount = 0;

    // 1. Sao lưu Categories sang MongoDB
    if (categories.length > 0) {
      for (const cat of categories) {
        await CategoryModel.findOneAndUpdate(
          { name: cat.name },
          {
            name: cat.name,
            icon: cat.icon || "Tag",
            color: cat.color || "slate",
            order: cat.display_order ?? cat.order ?? 0,
          },
          { upsert: true, new: true }
        );
      }
      catCount = categories.length;
    }

    // 2. Sao lưu Transactions sang MongoDB
    if (transactions.length > 0) {
      for (const tx of transactions) {
        await Transaction.findOneAndUpdate(
          { id: tx.id },
          {
            id: tx.id,
            type: tx.type,
            amount: Number(tx.amount),
            category: tx.category,
            date: tx.date,
            description: tx.description || "",
            wallet: tx.wallet || "Ngân hàng",
            isRecurring: tx.is_recurring ?? tx.isRecurring ?? false,
            frequency: tx.frequency || "none",
            isCreditCardPaid: tx.is_credit_card_paid ?? tx.isCreditCardPaid ?? false,
            creditCardPaidDate: tx.credit_card_paid_date || tx.creditCardPaidDate || null,
            creditCardDueDate: tx.credit_card_due_date || tx.creditCardDueDate || null,
          },
          { upsert: true, new: true }
        );
      }
      txCount = transactions.length;
    }

    // 3. Sao lưu Diary Entries sang MongoDB
    if (diaryEntries.length > 0) {
      for (const d of diaryEntries) {
        await DiaryEntry.findOneAndUpdate(
          { id: d.id },
          {
            id: d.id,
            date: d.date,
            content: d.content,
            mood: d.mood || "neutral",
            location: d.location || "",
            lat: d.lat ?? null,
            lng: d.lng ?? null,
            tags: d.tags || [],
            images: d.images || [],
            pinned: d.pinned ?? false,
            replies: d.replies || [],
          },
          { upsert: true, new: true }
        );
      }
      diaryCount = diaryEntries.length;
    }

    // 4. Sao lưu Debts sang MongoDB
    if (debts.length > 0) {
      for (const debt of debts) {
        await Debt.findOneAndUpdate(
          { id: debt.id },
          {
            id: debt.id,
            type: debt.type,
            name: debt.name,
            originalAmount: Number(debt.original_amount ?? debt.originalAmount ?? 0),
            currentBalance: Number(debt.current_balance ?? debt.currentBalance ?? 0),
            monthlyPayment: Number(debt.monthly_payment ?? debt.monthlyPayment ?? 0),
            interestRate: Number(debt.interest_rate ?? debt.interestRate ?? 0),
            paymentDay: debt.payment_day ?? debt.paymentDay ?? 1,
            startDate: debt.start_date || debt.startDate || "",
            maturityDate: debt.maturity_date || debt.maturityDate || "",
            totalInstallments: debt.total_installments ?? debt.totalInstallments ?? 0,
            paidInstallments: debt.paid_installments ?? debt.paidInstallments ?? 0,
            status: debt.status || "active",
            installments: debt.installments || [],
            notes: debt.notes || "",
          },
          { upsert: true, new: true }
        );
      }
      debtCount = debts.length;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: "Đã sao lưu thành công sang MongoDB",
        backedUp: {
          transactions: txCount,
          diary: diaryCount,
          debts: debtCount,
          categories: catCount,
        },
      }),
    };
  } catch (error: any) {
    console.error("Backup MongoDB Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: error.message || "Internal Server Error",
      }),
    };
  }
};
