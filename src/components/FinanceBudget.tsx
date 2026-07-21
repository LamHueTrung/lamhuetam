import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@mdi/react";
import {
  mdiPiggyBank, mdiCheckCircleOutline, mdiAlertOutline, mdiBellRingOutline,
  mdiTrendingUp, mdiTrendingDown, mdiClockOutline, mdiPlus, mdiMinus,
  mdiShieldCheck, mdiPlusCircle, mdiCalendar,
  mdiAlertCircleOutline, mdiDeleteOutline, mdiClose, mdiCurrencyUsd, mdiAutoFix, mdiLoading,
  mdiBank, mdiCreditCard, mdiAccountGroup, mdiCashMultiple, mdiChartTimelineVariant,
  mdiCalendarMonth, mdiWalletOutline, mdiRefresh
} from "@mdi/js";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { Budget, DebtAccount, SavingsGoal, Transaction, DebtInstallment } from "../types";

interface FinanceBudgetProps {
  budgets: Budget[];
  debts: DebtAccount[];
  savings: SavingsGoal[];
  transactions: Transaction[];
  onUpdateSavings: (amount: number) => void;
  onUpdateBudgetLimit: (category: string, newLimit: number) => void;
  onPayMultipleInstallments: (debtId: string, installmentIndices: number[], partialAmounts?: Record<number, number>, note?: string) => void;
  onAddDebt: (debt: Omit<DebtAccount, "id">) => void;
  onDeleteDebt: (id: string) => void;
  onUpdateDebt: (id: string, data: Partial<DebtAccount>) => void;
}

type ViewTab = 'debts' | 'budget' | 'cashflow' | 'savings';

const debtTypeMeta: Record<string, { icon: string; label: string; color: string }> = {
  installment: { icon: mdiBank, label: 'Trả góp', color: 'bg-blue-50 text-blue-700' },
  credit_card: { icon: mdiCreditCard, label: 'Thẻ tín dụng', color: 'bg-purple-50 text-purple-700' },
  friend: { icon: mdiAccountGroup, label: 'Bạn bè', color: 'bg-amber-50 text-amber-700' },
};

function formatVND(num: number) {
  if (num >= 1_000_000_000) {
    const valueInB = Math.round(num / 100_000_000) / 10;
    return new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valueInB) + " tỷ";
  }
  const valueInK = Math.round(num / 1000);
  return new Intl.NumberFormat("vi-VN").format(valueInK) + "k";
}

function formatFullVND(num: number) {
  return new Intl.NumberFormat("vi-VN").format(num) + "đ";
}

function getNextInstallment(inst: DebtInstallment[]): DebtInstallment | undefined {
  return inst.find(i => i.status === 'pending');
}

function getOverdueCount(inst: DebtInstallment[]): number {
  const now = new Date();
  return inst.filter(i => i.status === 'pending' && new Date(i.dueDate + 'T00:00:00') < now).length;
}

export default function FinanceBudget({
  budgets, debts, savings, transactions,
  onUpdateSavings, onUpdateBudgetLimit,
  onPayMultipleInstallments, onAddDebt, onDeleteDebt, onUpdateDebt
}: FinanceBudgetProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('debts');

  const [showAddForm, setShowAddForm] = useState(false);
  const [debtType, setDebtType] = useState<'installment' | 'credit_card' | 'friend'>('installment');
  const [debtName, setDebtName] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [interestRate, setInterestRate] = useState("0");
  const [paymentDay, setPaymentDay] = useState("5");
  const [totalInstallments, setTotalInstallments] = useState("1");
  const [paidInstallments, setPaidInstallments] = useState("0");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");

  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null);
  const [selectedInstallments, setSelectedInstallments] = useState<number[]>([]);
  const [paymentNote, setPaymentNote] = useState("");

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("Mua xe máy mới");
  const [goalAmountStr, setGoalAmountStr] = useState("50,000,000");
  const [goalMonths, setGoalMonths] = useState("6");

  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [isDeposit, setIsDeposit] = useState(true);

  const [cashflowMonth, setCashflowMonth] = useState(new Date().toISOString().slice(0, 7));
  const [expectedIncome, setExpectedIncome] = useState("");
  const [fixedExpenses, setFixedExpenses] = useState<{ name: string; amount: string }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const totalDebt = debts.filter(d => d.status === 'active').reduce((s, d) => s + d.currentBalance, 0);
  const totalMonthlyPayment = debts.filter(d => d.status === 'active').reduce((s, d) => s + d.monthlyPayment, 0);
  const activeDebtCount = debts.filter(d => d.status === 'active').length;

  const handleAmountChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) return "";
    return new Intl.NumberFormat("vi-VN").format(parseInt(clean));
  };

  const generateInstallments = (): Omit<DebtInstallment, "status">[] => {
    const total = parseInt(totalInstallments) || 1;
    const paid = parseInt(paidInstallments) || 0;
    const day = parseInt(paymentDay) || 5;
    const start = new Date(startDate);
    const amt = parseInt(monthlyPayment.replace(/\D/g, "")) || 0;

    return Array.from({ length: total }, (_, i) => {
      const m = start.getMonth() + i;
      const y = start.getFullYear() + Math.floor(m / 12);
      const month = m % 12;
      const maxDay = new Date(y, month + 1, 0).getDate();
      const d = Math.min(day, maxDay);
      const dueDate = new Date(Date.UTC(y, month, d)).toISOString().split('T')[0];
      return {
        index: i,
        dueDate,
        amount: amt,
        paidAmount: i < paid ? amt : 0,
        paidDate: i < paid ? dueDate : undefined,
      };
    });
  };

  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const rawAmount = parseInt(originalAmount.replace(/\D/g, "")) || 0;
    const monthlyAmt = parseInt(monthlyPayment.replace(/\D/g, "")) || 0;
    const totalInst = parseInt(totalInstallments) || 1;
    const paidInst = parseInt(paidInstallments) || 0;

    if (!debtName.trim() || rawAmount <= 0) {
      toast.error("Nhập tên khoản nợ và số tiền!");
      return;
    }

    const instData = generateInstallments();
    const balance = rawAmount - (monthlyAmt * paidInst);

    const maturityDate = instData.length > 0
      ? instData[instData.length - 1].dueDate
      : startDate;

    onAddDebt({
      type: debtType,
      name: debtName.trim(),
      originalAmount: rawAmount,
      currentBalance: Math.max(0, balance),
      monthlyPayment: monthlyAmt,
      interestRate: parseFloat(interestRate) || 0,
      paymentDay: parseInt(paymentDay) || 5,
      startDate,
      maturityDate,
      totalInstallments: totalInst,
      paidInstallments: paidInst,
      status: balance > 0 ? 'active' : 'settled',
      installments: instData.map(inst => ({
        ...inst,
        status: inst.paidAmount >= inst.amount ? 'paid' as const : 'pending' as const,
      })),
      notes
    });

    setShowAddForm(false);
    setDebtName("");
    setOriginalAmount("");
    setMonthlyPayment("");
    setInterestRate("0");
    setPaymentDay("5");
    setTotalInstallments("1");
    setPaidInstallments("0");
    setStartDate(new Date().toISOString().split('T')[0]);
    setNotes("");
    toast.success("Đã thêm khoản nợ!");
  };

  const handlePayOpen = (debt: DebtAccount) => {
    setPaymentDebtId(debt.id);
    setSelectedInstallments(
      debt.installments.filter(i => i.status === 'pending' || i.status === 'partial').map(i => i.index)
    );
    setPaymentNote("");
  };

  const handlePaySubmit = async () => {
    if (!paymentDebtId || selectedInstallments.length === 0) {
      toast.error("Chọn ít nhất 1 kỳ để thanh toán");
      return;
    }
    await onPayMultipleInstallments(paymentDebtId, selectedInstallments, undefined, paymentNote || undefined);
    setPaymentDebtId(null);
    toast.success(`Đã thanh toán ${selectedInstallments.length} kỳ!`);
  };

  const handleAiCashflowAdvice = async () => {
    const income = parseInt(expectedIncome.replace(/\D/g, "")) || 0;
    if (income <= 0) {
      toast.error("Nhập thu nhập dự kiến trước!");
      return;
    }
    setIsAiLoading(true);
    try {
      const response = await fetch("/.netlify/functions/gemini-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions, budgets, debts, savings,
          promptType: 'custom',
          customMessage: `Tôi có thu nhập tháng này ${income} VNĐ. Các khoản nợ: ${JSON.stringify(debts)}. Chi phí cố định: ${JSON.stringify(fixedExpenses)}. Hãy tư vấn cách phân bổ tiền lương: trả nợ bao nhiêu, chi tiêu bao nhiêu, tiết kiệm bao nhiêu? Ưu tiên trả nợ lãi cao trước. Đưa ra kế hoạch chi tiết theo số liệu thực tế.`,
        }),
      });
      const data = await response.json();
      if (data.text) {
        toast.success(data.text, { duration: 8000 });
      }
    } catch (err: any) {
      toast.error("AI không phản hồi. Vui lòng kiểm tra API key.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const activeSavings = savings[0];
  const savingsPct = activeSavings ? Math.round((activeSavings.currentAmount / activeSavings.goalAmount) * 100) : 0;
  const monthsRemaining = activeSavings ? (() => {
    const c = new Date(), t = new Date(activeSavings.targetDate);
    return Math.max(1, (t.getFullYear() - c.getFullYear()) * 12 + t.getMonth() - c.getMonth());
  })() : 1;
  const calculateSavingsNeeded = (goal: SavingsGoal) => {
    const remaining = goal.goalAmount - goal.currentAmount;
    return remaining <= 0 ? 0 : Math.round(remaining / monthsRemaining);
  };

  const incomeThisMonth = transactions
    .filter(t => t.type === 'income' && t.date.startsWith(cashflowMonth))
    .reduce((s, t) => s + t.amount, 0);

  const expenseThisMonth = transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(cashflowMonth))
    .reduce((s, t) => s + t.amount, 0);

  const debtPaymentsThisMonth = debts
    .filter(d => d.status === 'active')
    .reduce((s, d) => s + d.monthlyPayment, 0);

  const fixedExpensesTotal = fixedExpenses.reduce((s, f) => s + (parseInt(f.amount.replace(/\D/g, "")) || 0), 0);
  const expectedIncomeNum = parseInt(expectedIncome.replace(/\D/g, "")) || 0;
  const remainingCash = expectedIncomeNum - debtPaymentsThisMonth - fixedExpensesTotal;

  const renderDebtDashboard = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">QUẢN LÝ NỢ</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Hồ Sơ Nợ</h1>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer shadow-[0_4px_12px_rgba(15,23,42,0.15)] flex items-center gap-1.5">
          <Icon path={mdiPlus} size={0.875} />
          <span>Thêm nợ</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/80 border border-slate-100 rounded-[20px] p-3 min-w-0">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tổng nợ</span>
          <p className="text-sm font-black text-slate-900 mt-1 truncate">{formatVND(totalDebt)}</p>
          <span className="text-[9px] font-semibold text-slate-400">{activeDebtCount} khoản</span>
        </div>
        <div className="bg-white/80 border border-slate-100 rounded-[20px] p-3 min-w-0">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Trả/kỳ</span>
          <p className="text-sm font-black text-rose-600 mt-1 truncate">{formatVND(totalMonthlyPayment)}</p>
          <span className="text-[9px] font-semibold text-slate-400">Tổng các kỳ</span>
        </div>
        <div className="bg-white/80 border border-slate-100 rounded-[20px] p-3 min-w-0">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Còn lại</span>
          <p className="text-sm font-black text-slate-900 mt-1 truncate">{formatVND(expectedIncomeNum - totalMonthlyPayment)}</p>
          <span className="text-[9px] font-semibold text-slate-400">Sau trả nợ</span>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateDebt} className="bg-white/90 backdrop-blur-md border border-slate-200/60 rounded-[24px] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.06)] space-y-4">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Thêm khoản nợ</h3>
          <div className="grid grid-cols-3 gap-2">
            {(['installment', 'credit_card', 'friend'] as const).map(t => (
              <button key={t} type="button" onClick={() => setDebtType(t)}
                className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                  debtType === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
                }`}>
                {t === 'installment' ? 'Trả góp' : t === 'credit_card' ? 'Thẻ TD' : 'Bạn bè'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Tên khoản nợ</label>
              <input type="text" required value={debtName} onChange={e => setDebtName(e.target.value)} placeholder="VD: Home Credit" className="w-full bg-slate-50 border border-slate-100 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-slate-300" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Tổng nợ (VND)</label>
              <input type="text" required value={originalAmount} onChange={e => setOriginalAmount(handleAmountChange(e.target.value))} placeholder="VD: 30,000,000" className="w-full bg-slate-50 border border-slate-100 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-slate-300" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Trả mỗi kỳ</label>
              <input type="text" required value={monthlyPayment} onChange={e => setMonthlyPayment(handleAmountChange(e.target.value))} placeholder="VD: 2,000,000" className="w-full bg-slate-50 border border-slate-100 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-slate-300" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Lãi suất (%)</label>
              <input type="number" min="0" step="0.1" value={interestRate} onChange={e => setInterestRate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-slate-300" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Ngày đến hạn</label>
              <input type="number" min="1" max="31" required value={paymentDay} onChange={e => setPaymentDay(e.target.value)} className="w-full bg-slate-50 border border-slate-100 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-slate-300" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Tổng số kỳ</label>
              <input type="number" min="1" required value={totalInstallments} onChange={e => setTotalInstallments(e.target.value)} className="w-full bg-slate-50 border border-slate-100 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-slate-300" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Đã trả (kỳ)</label>
              <input type="number" min="0" value={paidInstallments} onChange={e => setPaidInstallments(e.target.value)} className="w-full bg-slate-50 border border-slate-100 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-slate-300" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Ngày bắt đầu</label>
              <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-slate-300" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Ghi chú</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="VD: Lãi suất 1.5%/tháng" className="w-full bg-slate-50 border border-slate-100 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-slate-300" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setShowAddForm(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-3 py-2 cursor-pointer">Hủy</button>
            <button type="submit" className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all cursor-pointer shadow-md">Lưu khoản nợ</button>
          </div>
        </form>
      )}

      {debts.length === 0 ? (
        <div className="bg-white/60 border border-slate-100 rounded-[28px] p-8 text-center text-slate-400">
          <Icon path={mdiAlertCircleOutline} size={2} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold">Chưa có khoản nợ nào</p>
          <p className="text-[10px] mt-1">Thêm khoản nợ đầu tiên để bắt đầu quản lý</p>
        </div>
      ) : (
        <div className="space-y-3">
          {debts.filter(d => d.status === 'active').map(debt => {
            const meta = debtTypeMeta[debt.type] || debtTypeMeta.installment;
            const nextInst = getNextInstallment(debt.installments);
            const overdue = getOverdueCount(debt.installments);
            const paidPct = debt.originalAmount > 0 ? Math.round(((debt.originalAmount - debt.currentBalance) / debt.originalAmount) * 100) : 0;

            return (
              <div key={debt.id} className="bg-white/95 border border-slate-100 rounded-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.01)]">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                        <Icon path={meta.icon} size={1} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-slate-800 truncate">{debt.name}</h3>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                        {debt.interestRate > 0 && <span className="text-[9px] font-bold text-amber-600 ml-1">{debt.interestRate}%/th</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {overdue > 0 && <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full animate-pulse whitespace-nowrap">Quá hạn {overdue}</span>}
                      <button onClick={() => onDeleteDebt(debt.id)} className="p-1.5 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all cursor-pointer" title="Xóa">
                        <Icon path={mdiDeleteOutline} size={0.75} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0">
                      <span className="text-sm font-black text-slate-800 truncate block">{formatVND(debt.currentBalance)}</span>
                      <span className="text-[10px] text-slate-400 font-medium truncate block">/ {formatVND(debt.originalAmount)}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-700 whitespace-nowrap">{formatVND(debt.monthlyPayment)}<span className="text-[9px] text-slate-400 font-medium">/kỳ</span></span>
                      <span className="block text-[9px] text-slate-400 font-medium whitespace-nowrap">
                        {debt.paidInstallments}/{debt.totalInstallments} kỳ
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                      {nextInst ? (
                        <>
                          <Icon path={mdiCalendarMonth} size={0.75} className="text-slate-400" />
                          <span className="text-[10px] text-slate-500 font-medium">
                            Kỳ {nextInst.index + 1}: {new Date(nextInst.dueDate + 'T00:00:00').toLocaleDateString("vi-VN", { month: "short", day: "numeric" })}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <Icon path={mdiCheckCircleOutline} size={0.75} /> Đã trả xong
                        </span>
                      )}
                    </div>
                    <button onClick={() => handlePayOpen(debt)}
                      className="bg-slate-900 text-white font-bold text-[9px] px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1">
                      <Icon path={mdiCurrencyUsd} size={0.667} />Thanh toán
                    </button>
                  </div>

                  {debt.installments.filter(i => i.status === 'pending' || i.status === 'partial').length > 0 && (
                    <div className="pt-2 border-t border-slate-50">
                      <div className="flex flex-wrap gap-1.5">
                        {debt.installments.filter(i => i.status === 'pending' || i.status === 'partial').slice(0, 8).map(inst => {
                          const isOverdue = new Date(inst.dueDate + 'T00:00:00') < new Date();
                          return (
                            <span key={inst.index}
                              className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${
                                isOverdue
                                  ? 'bg-rose-50 border-rose-100 text-rose-600'
                                  : 'bg-slate-50 border-slate-100 text-slate-500'
                              }`}>
                              Kỳ {inst.index + 1}: {new Date(inst.dueDate + 'T00:00:00').toLocaleDateString("vi-VN", { day: "numeric", month: "short" })}
                              {inst.status === 'partial' && <span className="text-amber-600 ml-0.5">(1 phần)</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {debts.filter(d => d.status === 'settled').length > 0 && (
            <details className="bg-white/60 border border-slate-100 rounded-[20px] overflow-hidden">
              <summary className="p-3 text-[10px] font-bold text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors">
                Đã tất toán ({debts.filter(d => d.status === 'settled').length} khoản)
              </summary>
              <div className="px-3 pb-3 space-y-2">
                {debts.filter(d => d.status === 'settled').map(debt => (
                  <div key={debt.id} className="flex items-center justify-between text-[10px] gap-2">
                    <span className="font-semibold text-slate-600 truncate min-w-0">{debt.name}</span>
                    <span className="text-emerald-600 font-bold shrink-0">Đã trả {formatVND(debt.originalAmount)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );

  const renderBudget = () => (
    <div className="space-y-5">
      <div>
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">QUẢN LÝ NGÂN SÁCH</span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Ngân Sách Theo Danh Mục</h1>
      </div>

      {budgets.length === 0 ? (
        <div className="bg-white/60 border border-slate-100 rounded-[28px] p-8 text-center text-slate-400">
          <Icon path={mdiWalletOutline} size={2} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold">Chưa có ngân sách nào</p>
          <p className="text-[10px] mt-1">Thêm giao dịch để tự động tạo ngân sách theo danh mục</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map(b => {
            const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
            const barColor = pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
            const cat = categories.find(c => c.name === b.category);
            const colorMap: Record<string, string> = {
              red: 'bg-red-100/80 text-red-700', amber: 'bg-amber-100/80 text-amber-700', blue: 'bg-blue-100/80 text-blue-700',
              teal: 'bg-teal-100/80 text-teal-700', emerald: 'bg-emerald-100/80 text-emerald-700', slate: 'bg-slate-100/80 text-slate-700',
              indigo: 'bg-indigo-100/80 text-indigo-700', rose: 'bg-rose-100/80 text-rose-700', purple: 'bg-purple-100/80 text-purple-700',
              orange: 'bg-orange-100/80 text-orange-700',
            };
            const color = cat?.color || 'slate';
            const IconComp = iconMap[cat?.icon || 'Tag'];

            return (
              <div key={b.category} className="bg-white/95 border border-slate-100 rounded-[24px] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${colorMap[color] || colorMap.slate}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">{b.category}</span>
                  </div>
                  <span className={`text-[10px] font-black ${pct >= 80 ? 'text-rose-500' : 'text-slate-500'}`}>
                    {formatVND(b.spent)} / {formatVND(b.limit)}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[9px] text-slate-400 font-medium">{pct}% đã dùng</span>
                  {pct >= 80 && (
                    <span className="text-[9px] font-bold text-rose-500 flex items-center gap-0.5">
                      <Icon path={mdiAlertCircleOutline} size={0.667} />
                      {pct >= 100 ? 'Đã vượt ngân sách!' : 'Sắp hết ngân sách'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderCashflowPlanner = () => (
    <div className="space-y-5">
      <div>
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">KẾ HOẠCH TÀI CHÍNH</span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Dòng Tiền Tháng</h1>
      </div>

      <div className="bg-white/80 border border-slate-100 rounded-[24px] p-4 shadow-sm">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Chọn tháng</label>
        <input type="month" value={cashflowMonth} onChange={e => setCashflowMonth(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none" />
      </div>

      <div className="bg-white/80 border border-slate-100 rounded-[24px] p-4 shadow-sm space-y-3">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Thu nhập dự kiến</label>
        <div className="relative">
          <Icon path={mdiCashMultiple} size={1} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={expectedIncome} onChange={e => setExpectedIncome(handleAmountChange(e.target.value))}
            placeholder="VD: 15,000,000"
            className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-100 rounded-[16px] text-sm font-bold outline-none focus:bg-white focus:border-slate-300" />
        </div>
        <div className="text-[10px] text-slate-400 font-medium">
          Thu nhập thực tế tháng này: <b className="text-slate-600">{formatVND(incomeThisMonth)}</b>
        </div>
      </div>

      <div className="bg-white/80 border border-slate-100 rounded-[24px] p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chi phí cố định</span>
          <button onClick={() => setFixedExpenses([...fixedExpenses, { name: "", amount: "" }])}
            className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-0.5">
            <Icon path={mdiPlus} size={0.667} />Thêm
          </button>
        </div>
        {fixedExpenses.map((fe, idx) => (
          <div key={idx} className="flex items-center gap-2 min-w-0">
            <input type="text" value={fe.name} onChange={e => {
              const copy = [...fixedExpenses]; copy[idx].name = e.target.value; setFixedExpenses(copy);
            }} placeholder="VD: Tiền nhà" className="flex-1 min-w-0 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2 text-[10px] font-semibold outline-none" />
            <input type="text" value={fe.amount} onChange={e => {
              const copy = [...fixedExpenses]; copy[idx].amount = handleAmountChange(e.target.value); setFixedExpenses(copy);
            }} placeholder="3,000,000" className="w-20 bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 text-[10px] font-semibold text-right outline-none" />
            <button onClick={() => setFixedExpenses(fixedExpenses.filter((_, i) => i !== idx))}
              className="p-1 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 cursor-pointer shrink-0">
              <Icon path={mdiClose} size={0.667} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white/80 border border-slate-100 rounded-[24px] p-4 shadow-sm space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dự kiến trả nợ tháng này</span>
        <div className="text-xs font-bold text-rose-600">{formatVND(debtPaymentsThisMonth)}</div>
        <div className="text-[10px] text-slate-400 font-medium">
          {debts.filter(d => d.status === 'active').map(d => (
            <div key={d.id} className="flex justify-between py-0.5 gap-2">
              <span className="truncate min-w-0">{d.name}</span>
              <span className="font-semibold text-slate-600 shrink-0">{formatVND(d.monthlyPayment)}</span>
            </div>
          ))}
          {debts.filter(d => d.status === 'active').length === 0 && <span>Không có nợ cần trả</span>}
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-[24px] p-5 space-y-3">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Kết quả dự kiến</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[9px] font-bold text-slate-400 block">Thu nhập</span>
            <span className="text-sm font-black text-slate-800">{formatVND(expectedIncomeNum)}</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-400 block">Trả nợ</span>
            <span className="text-sm font-black text-rose-600">-{formatVND(debtPaymentsThisMonth)}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 block">Chi phí cố định</span>
            <span className="text-sm font-black text-rose-500">-{formatVND(fixedExpensesTotal)}</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-400 block">Còn lại</span>
            <span className={`text-sm font-black ${remainingCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatVND(Math.max(0, remainingCash))}
            </span>
          </div>
        </div>
        {remainingCash < 0 && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-[10px] font-bold text-rose-600 flex items-center gap-1.5">
            <Icon path={mdiAlertOutline} size={0.75} />
            Thiếu {formatVND(-remainingCash)} — cần giảm chi phí hoặc tăng thu nhập!
          </div>
        )}
        <button onClick={handleAiCashflowAdvice} disabled={isAiLoading || expectedIncomeNum <= 0}
          className="w-full bg-slate-900 text-white font-bold text-[10px] py-2.5 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2">
          {isAiLoading ? <Icon path={mdiLoading} size={0.75} className="animate-spin" /> : <Icon path={mdiAutoFix} size={0.75} />}
          {isAiLoading ? "AI đang phân tích..." : "Cố vấn AI phân bổ thu nhập"}
        </button>
      </div>
    </div>
  );

  const renderSavings = () => (
    <div className="space-y-5">
      <div>
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">TÍCH LŨY</span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Kế Hoạch Tiết Kiệm</h1>
      </div>

      {!activeSavings ? (
        <div className="bg-white/60 border border-slate-100 rounded-[28px] p-8 text-center text-slate-400 space-y-3">
          <Icon path={mdiPiggyBank} size={2} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold">Chưa có mục tiêu tiết kiệm nào</p>
          <button onClick={() => setShowGoalModal(true)}
            className="bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-full hover:bg-slate-800 cursor-pointer">
            <Icon path={mdiPlus} size={0.875} className="inline mr-1" />Tạo mục tiêu
          </button>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-[28px] p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                <Icon path={mdiPiggyBank} size={1.25} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-slate-800 truncate">{activeSavings.title}</h3>
                <span className="text-[10px] text-slate-400 font-bold mt-1 truncate block">
                  Hạn: {new Date(activeSavings.targetDate).toLocaleDateString("vi-VN")}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-black text-slate-800 truncate block">{formatVND(activeSavings.currentAmount)}</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5 truncate">/ {formatVND(activeSavings.goalAmount)}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(100, savingsPct)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
              <span>{savingsPct}%</span>
              <span>{monthsRemaining} tháng còn lại</span>
            </div>
          </div>
          <div className="bg-slate-50/50 border border-slate-100 rounded-[20px] p-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Cần tiết kiệm/tháng</span>
              <span className="text-sm font-extrabold text-slate-800 mt-1">{formatVND(calculateSavingsNeeded(activeSavings))}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Còn thiếu</span>
              <span className="text-sm font-extrabold text-indigo-600 mt-1">{formatVND(activeSavings.goalAmount - activeSavings.currentAmount)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setIsDeposit(true); setFundAmount(""); setShowFundModal(true); }}
              className="bg-slate-900 text-white font-bold text-xs py-3 rounded-xl hover:bg-slate-800 cursor-pointer flex items-center justify-center gap-1.5">
              <Icon path={mdiPlus} size={0.875} />Nạp quỹ
            </button>
            <button onClick={() => { setIsDeposit(false); setFundAmount(""); setShowFundModal(true); }}
              className="bg-white border border-slate-100 text-slate-600 font-bold text-xs py-3 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1.5">
              <Icon path={mdiMinus} size={0.875} />Rút quỹ
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-40 min-w-0">
      <div className="flex items-center gap-1.5 bg-white/80 border border-slate-100 rounded-[20px] p-1 shadow-sm">
        {([
          { key: 'debts' as ViewTab, label: 'Nợ', icon: mdiChartTimelineVariant },
          { key: 'budget' as ViewTab, label: 'Ngân sách', icon: mdiWalletOutline },
          { key: 'cashflow' as ViewTab, label: 'Dòng tiền', icon: mdiCashMultiple },
          { key: 'savings' as ViewTab, label: 'Tiết kiệm', icon: mdiPiggyBank },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === tab.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}>
            <Icon path={tab.icon} size={0.75} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
          {activeTab === 'debts' && renderDebtDashboard()}
          {activeTab === 'budget' && renderBudget()}
          {activeTab === 'cashflow' && renderCashflowPlanner()}
          {activeTab === 'savings' && renderSavings()}
        </motion.div>
      </AnimatePresence>

      {createPortal(
        <>
          <AnimatePresence>
            {paymentDebtId && (() => {
              const debt = debts.find(d => d.id === paymentDebtId);
              if (!debt) return null;
              const unpaid = debt.installments.filter(i => i.status === 'pending' || i.status === 'partial');
              return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-end justify-center"
                  onClick={() => setPaymentDebtId(null)}>
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    onClick={e => e.stopPropagation()}
                    className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 pb-10 max-h-[80vh] overflow-y-auto shadow-[0_-12px_48px_rgba(0,0,0,0.12)]">
                    <div className="flex items-start justify-between gap-2 mb-5">
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-800">Thanh toán</h3>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">{debt.name} — {formatVND(debt.currentBalance)} còn lại</p>
                      </div>
                      <button onClick={() => setPaymentDebtId(null)} className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer shrink-0">
                        <Icon path={mdiClose} size={1.25} />
                      </button>
                    </div>
                    <div className="space-y-3 mb-5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chọn kỳ thanh toán</p>
                      {unpaid.map(inst => (
                        <label key={inst.index} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white cursor-pointer hover:border-slate-200">
                          <input type="checkbox" checked={selectedInstallments.includes(inst.index)}
                            onChange={() => setSelectedInstallments(prev =>
                              prev.includes(inst.index) ? prev.filter(i => i !== inst.index) : [...prev, inst.index]
                            )}
                            className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900" />
                          <div className="flex-1 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-slate-700">Kỳ {inst.index + 1}</span>
                              <span className="text-[9px] text-slate-400 ml-2">Hạn: {new Date(inst.dueDate + 'T00:00:00').toLocaleDateString("vi-VN", { month: "short", day: "numeric" })}</span>
                            </div>
                            <span className="text-xs font-extrabold text-slate-800">{formatVND(inst.amount)}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="space-y-1.5 mb-5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ghi chú</label>
                      <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
                        placeholder="VD: Trả từ lương tháng 7"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-[20px] text-xs outline-none focus:ring-1 focus:ring-slate-900" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Tổng: <b className="text-slate-900">{formatVND(selectedInstallments.reduce((s, i) => {
                          const inst = debt.installments.find(ii => ii.index === i);
                          return s + (inst ? inst.amount - inst.paidAmount : 0);
                        }, 0))}</b>
                      </span>
                    </div>
                    <button onClick={handlePaySubmit} disabled={selectedInstallments.length === 0}
                      className="w-full bg-slate-900 text-white font-bold text-sm py-3.5 rounded-[22px] hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer shadow-[0_8px_24px_rgba(15,23,42,0.15)]">
                      Xác nhận thanh toán
                    </button>
                  </motion.div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          <AnimatePresence>
            {showGoalModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6"
                onClick={() => setShowGoalModal(false)}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  onClick={e => e.stopPropagation()}
                  className="bg-white rounded-[28px] p-6 w-full max-w-sm shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">Tạo mục tiêu mới</h3>
                    <button onClick={() => setShowGoalModal(false)} className="p-1 rounded-full hover:bg-slate-100 cursor-pointer">
                      <Icon path={mdiClose} size={0.875} className="text-slate-400" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tên mục tiêu</label>
                      <input type="text" value={goalTitle} onChange={e => setGoalTitle(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-[14px] text-sm font-semibold outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Số tiền (VND)</label>
                      <input type="text" value={goalAmountStr} onChange={e => setGoalAmountStr(e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-[14px] text-sm font-semibold outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Số tháng</label>
                      <input type="number" min="1" value={goalMonths} onChange={e => setGoalMonths(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-[14px] text-sm font-semibold outline-none" />
                    </div>
                  </div>
                  <button onClick={() => {
                    if (!goalTitle.trim()) { toast.error("Nhập tên mục tiêu"); return; }
                    const amt = parseInt(goalAmountStr.replace(/,/g, ''));
                    if (!amt || amt <= 0) { toast.error("Nhập số tiền hợp lệ"); return; }
                    const months = parseInt(goalMonths);
                    if (!months || months <= 0) { toast.error("Nhập số tháng hợp lệ"); return; }
                    const targetDate = new Date(); targetDate.setMonth(targetDate.getMonth() + months);
                    onUpdateSavings(Math.round(amt / months));
                    setShowGoalModal(false);
                    toast.success("Đã tạo mục tiêu!");
                  }}
                    className="w-full bg-slate-900 text-white font-bold text-sm py-3 rounded-[20px] hover:bg-slate-800 cursor-pointer transition-all">
                    Tạo mục tiêu
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showFundModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6"
                onClick={() => setShowFundModal(false)}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  onClick={e => e.stopPropagation()}
                  className="bg-white rounded-[28px] p-6 w-full max-w-sm shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">{isDeposit ? "Nạp vào quỹ" : "Rút từ quỹ"}</h3>
                    <button onClick={() => setShowFundModal(false)} className="p-1 rounded-full hover:bg-slate-100 cursor-pointer">
                      <Icon path={mdiClose} size={0.875} className="text-slate-400" />
                    </button>
                  </div>
                  <div className="relative">
                    <Icon path={mdiCurrencyUsd} size={1} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={fundAmount} onChange={e => setFundAmount(e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
                      placeholder="0" autoFocus
                      className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-100 rounded-[16px] text-sm font-bold outline-none" />
                  </div>
                  <button onClick={() => {
                    const amt = parseInt(fundAmount.replace(/,/g, ''));
                    if (!amt || amt <= 0) { toast.error("Nhập số tiền hợp lệ"); return; }
                    onUpdateSavings(isDeposit ? amt : -amt);
                    setShowFundModal(false);
                    toast.success(isDeposit ? "Đã nạp vào quỹ!" : "Đã rút khỏi quỹ!");
                  }}
                    className="w-full bg-slate-900 text-white font-bold text-sm py-3 rounded-[20px] hover:bg-slate-800 cursor-pointer transition-all">
                    {isDeposit ? "Nạp quỹ" : "Rút quỹ"}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}