import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@mdi/react";
import {
  mdiCheckCircleOutline, mdiAlertOutline, mdiPlus, mdiMinus,
  mdiAlertCircleOutline, mdiDeleteOutline, mdiClose, mdiCurrencyUsd, mdiAutoFix, mdiLoading,
  mdiBank, mdiCreditCard, mdiAccountGroup, mdiCashMultiple, mdiChartTimelineVariant,
  mdiCalendarMonth, mdiWalletOutline, mdiPencil, mdiCheck, mdiCash,
  mdiCalendarCheck, mdiClockOutline, mdiFormatListBulletedSquare,
  mdiTag, mdiFire, mdiCoffee, mdiLightningBolt, mdiCarSide, mdiMotorbike,
  mdiOil, mdiHomeCity, mdiWifi, mdiPhone, mdiShoppingOutline,
} from "@mdi/js";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { DebtAccount, Transaction, DebtInstallment, SalaryConfig, LeaveDay, LeaveType, FixedExpenseCategory, FixedExpenseTask } from "../types";
import { useSalary } from "../hooks/useSalary";
import { useFixedExpenses } from "../hooks/useFixedExpenses";

interface FinanceBudgetProps {
  debts: DebtAccount[];
  transactions: Transaction[];
  onPayMultipleInstallments: (debtId: string, installmentIndices: number[], partialAmounts?: Record<number, number>, note?: string) => void;
  onAddDebt: (debt: Omit<DebtAccount, "id">) => void;
  onDeleteDebt: (id: string) => void;
  onUpdateDebt: (id: string, data: Partial<DebtAccount>) => void;
  onTransactionAdded?: () => void;
}

type ViewTab = 'debts' | 'cashflow' | 'salary' | 'fixed';

const debtTypeMeta: Record<string, { icon: string; label: string; color: string }> = {
  installment: { icon: mdiBank, label: 'Trả góp', color: 'bg-blue-50 text-blue-700' },
  credit_card: { icon: mdiCreditCard, label: 'Thẻ tín dụng', color: 'bg-purple-50 text-purple-700' },
  friend: { icon: mdiAccountGroup, label: 'Bạn bè', color: 'bg-amber-50 text-amber-700' },
};

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: 'Phép năm',
  personal: 'Phép cá nhân',
  unpaid: 'Ngày nghỉ',
};

const ICON_OPTIONS = [
  { key: 'cash', icon: mdiCash, label: 'Tiền mặt' },
  { key: 'fire', icon: mdiFire, label: 'Xăng' },
  { key: 'oil', icon: mdiOil, label: 'Nhớt' },
  { key: 'coffee', icon: mdiCoffee, label: 'Cà phê' },
  { key: 'lightning', icon: mdiLightningBolt, label: 'Điện' },
  { key: 'car', icon: mdiCarSide, label: 'Xe hơi' },
  { key: 'motorbike', icon: mdiMotorbike, label: 'Xe máy' },
  { key: 'home', icon: mdiHomeCity, label: 'Nhà' },
  { key: 'wifi', icon: mdiWifi, label: 'Internet' },
  { key: 'phone', icon: mdiPhone, label: 'Điện thoại' },
  { key: 'shopping', icon: mdiShoppingOutline, label: 'Mua sắm' },
  { key: 'tag', icon: mdiTag, label: 'Khác' },
];

const ICON_MAP: Record<string, string> = Object.fromEntries(ICON_OPTIONS.map(o => [o.key, o.icon]));

const COLOR_OPTIONS = [
  { key: 'slate', cls: 'bg-slate-500' },
  { key: 'rose', cls: 'bg-rose-500' },
  { key: 'amber', cls: 'bg-amber-500' },
  { key: 'emerald', cls: 'bg-emerald-500' },
  { key: 'blue', cls: 'bg-blue-500' },
  { key: 'purple', cls: 'bg-purple-500' },
  { key: 'orange', cls: 'bg-orange-500' },
];

const COLOR_BG_MAP: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700',
  rose: 'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};

function formatVND(num: number) {
  if (num >= 1_000_000_000) {
    const v = Math.round(num / 100_000_000) / 10;
    return new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v) + " tỷ";
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

function numFmt(val: string) {
  const clean = val.replace(/\D/g, "");
  if (!clean) return "";
  return new Intl.NumberFormat("vi-VN").format(parseInt(clean));
}

export default function FinanceBudget({
  debts, transactions,
  onPayMultipleInstallments, onAddDebt, onDeleteDebt, onUpdateDebt, onTransactionAdded,
}: FinanceBudgetProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('debts');
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [fixedMonth, setFixedMonth] = useState(currentMonth);

  const { salaryConfig, loading: salaryLoading, saveConfig, autoAddSalary } = useSalary();
  const { categories: fixedCats, tasks: fixedTasks, totalFixed, loading: fixedLoading,
    addCategory, updateCategory, deleteCategory,
    addTask, updateTask, deleteTask,
  } = useFixedExpenses(fixedMonth);

  // ── Debt states ───────────────────────────────────────────────────────────
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

  // ── Cashflow states ───────────────────────────────────────────────────────
  const [cashflowMonth, setCashflowMonth] = useState(currentMonth);
  const [expectedIncome, setExpectedIncome] = useState("");
  const [cfFixedExpenses, setCfFixedExpenses] = useState<{ name: string; amount: string }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // ── Salary states ─────────────────────────────────────────────────────────
  const [salaryEdit, setSalaryEdit] = useState(false);
  const [grossSalary, setGrossSalary] = useState("");
  const [netSalary, setNetSalary] = useState("");
  const [receiveDay, setReceiveDay] = useState("1");
  const [workDays, setWorkDays] = useState("26");
  const [leaveDays, setLeaveDays] = useState<LeaveDay[]>([]);
  const [salaryNotes, setSalaryNotes] = useState("");
  const [isAddingLeave, setIsAddingLeave] = useState(false);
  const [newLeaveCount, setNewLeaveCount] = useState("1");
  const [newLeaveType, setNewLeaveType] = useState<LeaveType>('personal');

  // ── Fixed expense states ──────────────────────────────────────────────────
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("cash");
  const [catColor, setCatColor] = useState("slate");
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState<string | null>(null); // categoryId
  const [taskName, setTaskName] = useState("");
  const [taskAmount, setTaskAmount] = useState("");
  const [taskNote, setTaskNote] = useState("");
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  // ── Debt helpers ──────────────────────────────────────────────────────────
  const totalDebt = debts.filter(d => d.status === 'active').reduce((s, d) => s + d.currentBalance, 0);
  const totalMonthlyPayment = debts.filter(d => d.status === 'active').reduce((s, d) => s + d.monthlyPayment, 0);
  const activeDebtCount = debts.filter(d => d.status === 'active').length;

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
      return { index: i, dueDate, amount: amt, paidAmount: i < paid ? amt : 0, paidDate: i < paid ? dueDate : undefined };
    });
  };

  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const rawAmount = parseInt(originalAmount.replace(/\D/g, "")) || 0;
    const monthlyAmt = parseInt(monthlyPayment.replace(/\D/g, "")) || 0;
    const totalInst = parseInt(totalInstallments) || 1;
    const paidInst = parseInt(paidInstallments) || 0;
    if (!debtName.trim() || rawAmount <= 0) { toast.error("Nhập tên khoản nợ và số tiền!"); return; }
    const instData = generateInstallments();
    const balance = rawAmount - (monthlyAmt * paidInst);
    const maturityDate = instData.length > 0 ? instData[instData.length - 1].dueDate : startDate;
    onAddDebt({
      type: debtType, name: debtName.trim(), originalAmount: rawAmount,
      currentBalance: Math.max(0, balance), monthlyPayment: monthlyAmt,
      interestRate: parseFloat(interestRate) || 0, paymentDay: parseInt(paymentDay) || 5,
      startDate, maturityDate, totalInstallments: totalInst, paidInstallments: paidInst,
      status: balance > 0 ? 'active' : 'settled',
      installments: instData.map(inst => ({ ...inst, status: inst.paidAmount >= inst.amount ? 'paid' as const : 'pending' as const })),
      notes,
    });
    setShowAddForm(false); setDebtName(""); setOriginalAmount(""); setMonthlyPayment("");
    setInterestRate("0"); setPaymentDay("5"); setTotalInstallments("1"); setPaidInstallments("0");
    setStartDate(new Date().toISOString().split('T')[0]); setNotes("");
    toast.success("Đã thêm khoản nợ!");
  };

  const handlePayOpen = (debt: DebtAccount) => {
    setPaymentDebtId(debt.id);
    setSelectedInstallments(debt.installments.filter(i => i.status === 'pending' || i.status === 'partial').map(i => i.index));
    setPaymentNote("");
  };

  const handlePaySubmit = async () => {
    if (!paymentDebtId || selectedInstallments.length === 0) { toast.error("Chọn ít nhất 1 kỳ để thanh toán"); return; }
    await onPayMultipleInstallments(paymentDebtId, selectedInstallments, undefined, paymentNote || undefined);
    setPaymentDebtId(null);
    toast.success(`Đã thanh toán ${selectedInstallments.length} kỳ!`);
  };

  // ── Cashflow helpers ──────────────────────────────────────────────────────
  const incomeThisMonth = transactions.filter(t => t.type === 'income' && t.date.startsWith(cashflowMonth)).reduce((s, t) => s + t.amount, 0);
  const debtPaymentsThisMonth = debts.filter(d => d.status === 'active').reduce((s, d) => s + d.monthlyPayment, 0);
  const cfFixedTotal = cfFixedExpenses.reduce((s, f) => s + (parseInt(f.amount.replace(/\D/g, "")) || 0), 0);
  const expectedIncomeNum = parseInt(expectedIncome.replace(/\D/g, "")) || 0;
  const remainingCash = expectedIncomeNum - debtPaymentsThisMonth - cfFixedTotal;

  const handleAiCashflowAdvice = async () => {
    if (expectedIncomeNum <= 0) { toast.error("Nhập thu nhập dự kiến trước!"); return; }
    setIsAiLoading(true);
    try {
      const res = await fetch("/.netlify/functions/gemini-advisor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions, debts, promptType: 'custom',
          customMessage: `Tôi có thu nhập tháng này ${expectedIncomeNum}đ. Nợ: ${JSON.stringify(debts)}. Chi phí cố định: ${JSON.stringify(cfFixedExpenses)}. Tư vấn phân bổ tiền lương thực tế.` }),
      });
      const data = await res.json();
      if (data.text) toast(data.text, { icon: '🤖', duration: 9000 });
    } catch { toast.error("AI không phản hồi."); }
    finally { setIsAiLoading(false); }
  };

  // ── Salary helpers ────────────────────────────────────────────────────────
  const startEditSalary = () => {
    setGrossSalary(salaryConfig.grossSalary ? numFmt(String(salaryConfig.grossSalary)) : "");
    setNetSalary(salaryConfig.netSalary ? numFmt(String(salaryConfig.netSalary)) : "");
    setReceiveDay(String(salaryConfig.receiveDay || 1));
    setWorkDays(String(salaryConfig.workDays || 26));
    setLeaveDays(salaryConfig.leaveDays ? [...salaryConfig.leaveDays] : []);
    setSalaryNotes(salaryConfig.notes || "");
    setSalaryEdit(true);
  };

  const handleSaveSalary = async () => {
    const gross = parseInt(grossSalary.replace(/\D/g, "")) || 0;
    const net = parseInt(netSalary.replace(/\D/g, "")) || 0;
    if (net <= 0) { toast.error("Nhập lương thực nhận!"); return; }
    try {
      await saveConfig({ grossSalary: gross, netSalary: net, receiveDay: parseInt(receiveDay) || 1, workDays: parseInt(workDays) || 26, leaveDays, notes: salaryNotes });
      setSalaryEdit(false);
      toast.success("Đã lưu config lương!");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAutoAdd = async () => {
    try {
      const result = await autoAddSalary();
      if (result.skipped) { toast(result.message, { icon: 'ℹ️' }); }
      else { toast.success(result.message); if (onTransactionAdded) onTransactionAdded(); }
    } catch (e: any) { toast.error(e.message || "Lỗi khi cộng lương"); }
  };

  const totalLeave = (salaryConfig.leaveDays || []).reduce((s, l) => s + (l.count || 0), 0);

  // ── Fixed expense helpers ─────────────────────────────────────────────────
  const handleSaveCat = async () => {
    if (!catName.trim()) { toast.error("Nhập tên danh mục!"); return; }
    try {
      if (editCatId) {
        await updateCategory({ id: editCatId, name: catName, icon: catIcon, color: catColor });
        toast.success("Đã cập nhật danh mục!");
      } else {
        await addCategory({ name: catName, icon: catIcon, color: catColor });
        toast.success("Đã thêm danh mục!");
      }
      setCatName(""); setCatIcon("cash"); setCatColor("slate"); setEditCatId(null); setShowCatForm(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm("Xóa danh mục và tất cả khoản chi trong đó?")) return;
    try { await deleteCategory(id); toast.success("Đã xóa danh mục!"); } catch (e: any) { toast.error(e.message); }
  };

  const handleSaveTask = async (catId: string, catName: string) => {
    if (!taskName.trim() || !taskAmount) { toast.error("Nhập đủ thông tin!"); return; }
    const amount = parseInt(taskAmount.replace(/\D/g, "")) || 0;
    try {
      if (editTaskId) {
        await updateTask({ id: editTaskId, name: taskName, amount, note: taskNote });
        toast.success("Đã cập nhật khoản chi!");
      } else {
        await addTask({ categoryId: catId, categoryName: catName, name: taskName, amount, month: fixedMonth, note: taskNote });
        toast.success("Đã thêm khoản chi!");
      }
      setTaskName(""); setTaskAmount(""); setTaskNote(""); setEditTaskId(null); setShowTaskForm(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteTask = async (id: string) => {
    try { await deleteTask(id); toast.success("Đã xóa!"); } catch (e: any) { toast.error(e.message); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER TABS
  // ═══════════════════════════════════════════════════════════════════════════

  const renderDebtDashboard = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">QUẢN LÝ NỢ</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">Hồ Sơ Nợ</h1>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs px-4 py-2.5 rounded-full hover:opacity-90 transition-all cursor-pointer shadow-sm flex items-center gap-1.5">
          <Icon path={mdiPlus} size={0.875} /><span>Thêm nợ</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Tổng nợ', val: formatVND(totalDebt), sub: `${activeDebtCount} khoản`, color: 'text-slate-900 dark:text-white' },
          { label: 'Trả/kỳ', val: formatVND(totalMonthlyPayment), sub: 'Tổng các kỳ', color: 'text-rose-600' },
          { label: 'Còn lại', val: formatVND(Math.max(0, expectedIncomeNum - totalMonthlyPayment)), sub: 'Sau trả nợ', color: 'text-emerald-600' },
        ].map(c => (
          <div key={c.label} className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[20px] p-3 min-w-0">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</span>
            <p className={`text-sm font-black mt-1 truncate ${c.color}`}>{c.val}</p>
            <span className="text-[9px] font-semibold text-slate-400">{c.sub}</span>
          </div>
        ))}
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateDebt} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/60 dark:border-slate-700 rounded-[24px] p-5 shadow-lg space-y-4">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Thêm khoản nợ</h3>
          <div className="grid grid-cols-3 gap-2">
            {(['installment', 'credit_card', 'friend'] as const).map(t => (
              <button key={t} type="button" onClick={() => setDebtType(t)}
                className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${debtType === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white dark:bg-slate-700 text-slate-500 border-slate-100 dark:border-slate-600 hover:bg-slate-50'}`}>
                {t === 'installment' ? 'Trả góp' : t === 'credit_card' ? 'Thẻ TD' : 'Bạn bè'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Tên khoản nợ</label>
              <input type="text" required value={debtName} onChange={e => setDebtName(e.target.value)} placeholder="VD: Home Credit" className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Tổng nợ (VND)</label>
              <input type="text" required value={originalAmount} onChange={e => setOriginalAmount(numFmt(e.target.value))} placeholder="30,000,000" className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Trả mỗi kỳ</label>
              <input type="text" required value={monthlyPayment} onChange={e => setMonthlyPayment(numFmt(e.target.value))} placeholder="2,000,000" className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Lãi suất (%)</label>
              <input type="number" min="0" step="0.1" value={interestRate} onChange={e => setInterestRate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Ngày đến hạn</label>
              <input type="number" min="1" max="31" required value={paymentDay} onChange={e => setPaymentDay(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Tổng số kỳ</label>
              <input type="number" min="1" required value={totalInstallments} onChange={e => setTotalInstallments(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Đã trả (kỳ)</label>
              <input type="number" min="0" value={paidInstallments} onChange={e => setPaidInstallments(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Ngày bắt đầu</label>
              <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2 outline-none dark:text-white" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Ghi chú</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="VD: Lãi suất 1.5%/tháng" className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <button type="button" onClick={() => setShowAddForm(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-3 py-2 cursor-pointer">Hủy</button>
            <button type="submit" className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all cursor-pointer shadow-md">Lưu khoản nợ</button>
          </div>
        </form>
      )}

      {debts.length === 0 ? (
        <div className="bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-[28px] p-8 text-center text-slate-400">
          <Icon path={mdiAlertCircleOutline} size={2} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold">Chưa có khoản nợ nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {debts.filter(d => d.status === 'active').map(debt => {
            const meta = debtTypeMeta[debt.type] || debtTypeMeta.installment;
            const nextInst = getNextInstallment(debt.installments);
            const overdue = getOverdueCount(debt.installments);
            const paidPct = debt.originalAmount > 0 ? Math.round(((debt.originalAmount - debt.currentBalance) / debt.originalAmount) * 100) : 0;
            return (
              <div key={debt.id} className="bg-white/95 dark:bg-slate-800/95 border border-slate-100 dark:border-slate-700 rounded-[24px] shadow-sm">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                        <Icon path={meta.icon} size={1} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white truncate">{debt.name}</h3>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                        {debt.interestRate > 0 && <span className="text-[9px] font-bold text-amber-600 ml-1">{debt.interestRate}%/th</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {overdue > 0 && <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full animate-pulse whitespace-nowrap">Quá hạn {overdue}</span>}
                      <button onClick={() => onDeleteDebt(debt.id)} className="p-1.5 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all cursor-pointer"><Icon path={mdiDeleteOutline} size={0.75} /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0">
                      <span className="text-sm font-black text-slate-800 dark:text-white truncate block">{formatVND(debt.currentBalance)}</span>
                      <span className="text-[10px] text-slate-400 font-medium truncate block">/ {formatVND(debt.originalAmount)}</span>
                    </div>
                    <div className="text-right min-w-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate block">{formatVND(debt.monthlyPayment)}<span className="text-[9px] text-slate-400 font-medium">/kỳ</span></span>
                      <span className="block text-[9px] text-slate-400 font-medium">{debt.paidInstallments}/{debt.totalInstallments} kỳ</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900 dark:bg-slate-200 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-50 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      {nextInst ? (
                        <><Icon path={mdiCalendarMonth} size={0.75} className="text-slate-400" />
                          <span className="text-[10px] text-slate-500 font-medium">Kỳ {nextInst.index + 1}: {new Date(nextInst.dueDate + 'T00:00:00').toLocaleDateString("vi-VN", { month: "short", day: "numeric" })}</span></>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><Icon path={mdiCheckCircleOutline} size={0.75} /> Đã trả xong</span>
                      )}
                    </div>
                    <button onClick={() => handlePayOpen(debt)} className="bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 font-bold text-[9px] px-3 py-1.5 rounded-lg hover:opacity-80 transition-all cursor-pointer flex items-center gap-1">
                      <Icon path={mdiCurrencyUsd} size={0.667} />Thanh toán
                    </button>
                  </div>
                  {debt.installments.filter(i => i.status === 'pending' || i.status === 'partial').length > 0 && (
                    <div className="pt-2 border-t border-slate-50 dark:border-slate-700">
                      <div className="flex flex-wrap gap-1.5">
                        {debt.installments.filter(i => i.status === 'pending' || i.status === 'partial').slice(0, 8).map(inst => {
                          const isOverdue = new Date(inst.dueDate + 'T00:00:00') < new Date();
                          return (
                            <span key={inst.index} className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${isOverdue ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600 text-slate-500'}`}>
                              Kỳ {inst.index + 1}: {new Date(inst.dueDate + 'T00:00:00').toLocaleDateString("vi-VN", { day: "numeric", month: "short" })}
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
            <details className="bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-[20px] overflow-hidden">
              <summary className="p-3 text-[10px] font-bold text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Đã tất toán ({debts.filter(d => d.status === 'settled').length} khoản)
              </summary>
              <div className="px-3 pb-3 space-y-2">
                {debts.filter(d => d.status === 'settled').map(debt => (
                  <div key={debt.id} className="flex items-center justify-between text-[10px] gap-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-300 truncate min-w-0">{debt.name}</span>
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

  const renderCashflow = () => (
    <div className="space-y-5">
      <div>
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">KẾ HOẠCH TÀI CHÍNH</span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">Dòng Tiền Tháng</h1>
      </div>
      <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[24px] p-4 shadow-sm">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Chọn tháng</label>
        <input type="month" value={cashflowMonth} onChange={e => setCashflowMonth(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none dark:text-white" />
      </div>
      <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[24px] p-4 shadow-sm space-y-3">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Thu nhập dự kiến</label>
        <div className="relative">
          <Icon path={mdiCashMultiple} size={1} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={expectedIncome} onChange={e => setExpectedIncome(numFmt(e.target.value))} placeholder="VD: 15,000,000"
            className="w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-[16px] text-sm font-bold outline-none dark:text-white" />
        </div>
        <div className="text-[10px] text-slate-400 font-medium">
          Thực tế tháng này: <b className="text-slate-600 dark:text-slate-300">{formatVND(incomeThisMonth)}</b>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[24px] p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chi phí cố định</span>
          <button onClick={() => setCfFixedExpenses([...cfFixedExpenses, { name: "", amount: "" }])}
            className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-0.5">
            <Icon path={mdiPlus} size={0.667} />Thêm
          </button>
        </div>
        {cfFixedExpenses.map((fe, idx) => (
          <div key={idx} className="flex items-center gap-2 min-w-0">
            <input type="text" value={fe.name} onChange={e => { const c = [...cfFixedExpenses]; c[idx].name = e.target.value; setCfFixedExpenses(c); }} placeholder="VD: Tiền nhà" className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-lg px-2.5 py-2 text-[10px] font-semibold outline-none dark:text-white" />
            <input type="text" value={fe.amount} onChange={e => { const c = [...cfFixedExpenses]; c[idx].amount = numFmt(e.target.value); setCfFixedExpenses(c); }} placeholder="3,000,000" className="w-20 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-lg px-2 py-2 text-[10px] font-semibold text-right outline-none dark:text-white" />
            <button onClick={() => setCfFixedExpenses(cfFixedExpenses.filter((_, i) => i !== idx))} className="p-1 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 cursor-pointer shrink-0"><Icon path={mdiClose} size={0.667} /></button>
          </div>
        ))}
      </div>
      <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[24px] p-4 shadow-sm space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dự kiến trả nợ tháng này</span>
        <div className="text-xs font-bold text-rose-600">{formatVND(debtPaymentsThisMonth)}</div>
        <div className="text-[10px] text-slate-400 font-medium space-y-0.5">
          {debts.filter(d => d.status === 'active').map(d => (
            <div key={d.id} className="flex justify-between py-0.5 gap-2">
              <span className="truncate min-w-0">{d.name}</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300 shrink-0">{formatVND(d.monthlyPayment)}</span>
            </div>
          ))}
          {debts.filter(d => d.status === 'active').length === 0 && <span>Không có nợ cần trả</span>}
        </div>
      </div>
      <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 rounded-[24px] p-5 space-y-3">
        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Kết quả dự kiến</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><span className="text-[9px] font-bold text-slate-400 block">Thu nhập</span><span className="text-sm font-black text-slate-800 dark:text-white">{formatVND(expectedIncomeNum)}</span></div>
          <div className="text-right"><span className="text-[9px] font-bold text-slate-400 block">Trả nợ</span><span className="text-sm font-black text-rose-600">-{formatVND(debtPaymentsThisMonth)}</span></div>
          <div><span className="text-[9px] font-bold text-slate-400 block">Chi phí cố định</span><span className="text-sm font-black text-rose-500">-{formatVND(cfFixedTotal)}</span></div>
          <div className="text-right"><span className="text-[9px] font-bold text-slate-400 block">Còn lại</span>
            <span className={`text-sm font-black ${remainingCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatVND(Math.max(0, remainingCash))}</span>
          </div>
        </div>
        {remainingCash < 0 && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl p-2.5 text-[10px] font-bold text-rose-600 flex items-center gap-1.5">
            <Icon path={mdiAlertOutline} size={0.75} />Thiếu {formatVND(-remainingCash)} — cần giảm chi phí!
          </div>
        )}
        <button onClick={handleAiCashflowAdvice} disabled={isAiLoading || expectedIncomeNum <= 0}
          className="w-full bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 font-bold text-[10px] py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2">
          {isAiLoading ? <Icon path={mdiLoading} size={0.75} className="animate-spin" /> : <Icon path={mdiAutoFix} size={0.75} />}
          {isAiLoading ? "AI đang phân tích..." : "Cố vấn AI phân bổ thu nhập"}
        </button>
      </div>
    </div>
  );

  const renderSalary = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">DÒNG TIỀN</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">Quản Lý Lương</h1>
        </div>
        {!salaryEdit && (
          <button onClick={startEditSalary} className="bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs px-4 py-2.5 rounded-full hover:opacity-90 transition-all cursor-pointer shadow-sm flex items-center gap-1.5">
            <Icon path={mdiPencil} size={0.875} /><span>Cấu hình</span>
          </button>
        )}
      </div>

      {/* Summary cards */}
      {!salaryEdit && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[24px] p-4 text-white">
              <span className="text-[9px] font-bold uppercase opacity-80 block">Lương thực nhận</span>
              <p className="text-xl font-black mt-1">{formatVND(salaryConfig.netSalary)}</p>
              <span className="text-[9px] opacity-70 block mt-1">Gross: {formatVND(salaryConfig.grossSalary)}</span>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-[24px] p-4 text-white">
              <span className="text-[9px] font-bold uppercase opacity-80 block">Ngày nhận lương</span>
              <p className="text-xl font-black mt-1">Ngày {salaryConfig.receiveDay || '—'}</p>
              <span className="text-[9px] opacity-70 block mt-1">Hàng tháng</span>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[24px] p-4 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Công - Nghỉ</span>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-50 dark:bg-slate-700 rounded-2xl p-3 text-center">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Ngày công</span>
                <span className="text-lg font-black text-slate-800 dark:text-white">{salaryConfig.workDays || 0}</span>
              </div>
              <div className="flex-1 bg-slate-50 dark:bg-slate-700 rounded-2xl p-3 text-center">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Tổng nghỉ</span>
                <span className="text-lg font-black text-amber-600">{totalLeave}</span>
              </div>
            </div>
            {(salaryConfig.leaveDays || []).length > 0 && (
              <div className="space-y-1.5">
                {salaryConfig.leaveDays.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-slate-500">{LEAVE_TYPE_LABELS[l.type as LeaveType]}</span>
                    <span className="font-black text-slate-700 dark:text-slate-300">{l.count} ngày</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status auto-add */}
          <div className={`rounded-[20px] p-4 border flex items-center justify-between gap-3 ${salaryConfig.lastAutoAddMonth === currentMonth ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'}`}>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Lương tháng {currentMonth}</span>
              <span className={`text-xs font-black ${salaryConfig.lastAutoAddMonth === currentMonth ? 'text-emerald-600' : 'text-amber-600'}`}>
                {salaryConfig.lastAutoAddMonth === currentMonth ? '✓ Đã cộng vào sổ' : '⏳ Chưa cộng'}
              </span>
            </div>
            {salaryConfig.lastAutoAddMonth !== currentMonth && salaryConfig.netSalary > 0 && (
              <button onClick={handleAutoAdd} className="bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 text-[10px] font-black px-4 py-2 rounded-xl cursor-pointer hover:opacity-90 transition-all flex items-center gap-1 shrink-0">
                <Icon path={mdiCalendarCheck} size={0.75} />Cộng lương
              </button>
            )}
          </div>

          {salaryConfig.notes && (
            <div className="bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-[20px] p-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Ghi chú</span>
              <p className="text-xs text-slate-600 dark:text-slate-300">{salaryConfig.notes}</p>
            </div>
          )}

          {salaryConfig.netSalary <= 0 && (
            <div className="bg-white/60 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-600 rounded-[24px] p-8 text-center space-y-3">
              <Icon path={mdiCashMultiple} size={2} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-400">Chưa có config lương</p>
              <button onClick={startEditSalary} className="bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-full hover:bg-slate-800 cursor-pointer">
                Cấu hình ngay
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit form */}
      {salaryEdit && (
        <div className="bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700 rounded-[24px] p-5 shadow-lg space-y-4">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Cấu hình lương</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Lương gross (VND)</label>
              <input type="text" value={grossSalary} onChange={e => setGrossSalary(numFmt(e.target.value))} placeholder="VD: 18,000,000" className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Lương thực nhận (VND) *</label>
              <input type="text" value={netSalary} onChange={e => setNetSalary(numFmt(e.target.value))} placeholder="VD: 15,000,000" className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Ngày nhận lương</label>
                <input type="number" min="1" max="31" value={receiveDay} onChange={e => setReceiveDay(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Số ngày công</label>
                <input type="number" min="1" max="31" value={workDays} onChange={e => setWorkDays(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white" />
              </div>
            </div>

            {/* Leave days */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Ngày nghỉ</label>
                <button type="button" onClick={() => setIsAddingLeave(true)} className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full hover:bg-slate-200 cursor-pointer flex items-center gap-0.5">
                  <Icon path={mdiPlus} size={0.6} />Thêm
                </button>
              </div>
              {leaveDays.map((l, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-xl p-2.5">
                  <div className="flex-1">
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{LEAVE_TYPE_LABELS[l.type as LeaveType]}</span>
                    <span className="text-[10px] font-black text-slate-800 dark:text-white ml-2">{l.count} ngày</span>
                  </div>
                  <button type="button" onClick={() => setLeaveDays(leaveDays.filter((_, j) => j !== i))} className="p-1 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 cursor-pointer">
                    <Icon path={mdiClose} size={0.6} />
                  </button>
                </div>
              ))}
              {isAddingLeave && (
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 space-y-2">
                  <select value={newLeaveType} onChange={e => setNewLeaveType(e.target.value as LeaveType)} className="w-full bg-white dark:bg-slate-600 border border-slate-100 dark:border-slate-500 rounded-lg px-2 py-1.5 text-[10px] font-semibold outline-none dark:text-white">
                    <option value="annual">Phép năm</option>
                    <option value="personal">Phép cá nhân</option>
                    <option value="unpaid">Ngày nghỉ (không lương)</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0.5" step="0.5" value={newLeaveCount} onChange={e => setNewLeaveCount(e.target.value)} placeholder="Số ngày" className="flex-1 bg-white dark:bg-slate-600 border border-slate-100 dark:border-slate-500 rounded-lg px-2 py-1.5 text-[10px] font-semibold outline-none dark:text-white" />
                    <button type="button" onClick={() => {
                      const count = parseFloat(newLeaveCount) || 0;
                      if (count <= 0) return;
                      setLeaveDays([...leaveDays, { count, type: newLeaveType }]);
                      setNewLeaveCount("1"); setIsAddingLeave(false);
                    }} className="bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"><Icon path={mdiCheck} size={0.667} /></button>
                    <button type="button" onClick={() => setIsAddingLeave(false)} className="text-slate-400 text-[10px] px-2 py-1.5 cursor-pointer"><Icon path={mdiClose} size={0.667} /></button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Ghi chú</label>
              <input type="text" value={salaryNotes} onChange={e => setSalaryNotes(e.target.value)} placeholder="VD: Lương tháng 12 bonus..." className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <button onClick={() => setSalaryEdit(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-3 py-2 cursor-pointer">Hủy</button>
            <button onClick={handleSaveSalary} className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-slate-800 cursor-pointer shadow-md">Lưu cấu hình</button>
          </div>
        </div>
      )}
    </div>
  );

  const renderFixed = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">CHI TIÊU CỐ ĐỊNH</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">Task Chi Tiêu</h1>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={fixedMonth} onChange={e => setFixedMonth(e.target.value)} className="bg-slate-100 dark:bg-slate-700 border-0 rounded-xl px-2 py-1.5 text-[10px] font-bold outline-none dark:text-white" />
          <button onClick={() => { setShowCatForm(true); setEditCatId(null); setCatName(""); setCatIcon("cash"); setCatColor("slate"); }}
            className="bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 font-bold text-[10px] px-3 py-2 rounded-xl hover:opacity-90 cursor-pointer flex items-center gap-1">
            <Icon path={mdiPlus} size={0.75} />Danh mục
          </button>
        </div>
      </div>

      {/* Total summary */}
      <div className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-[24px] p-4 text-white flex items-center justify-between">
        <div>
          <span className="text-[9px] font-bold uppercase opacity-80 block">Tổng chi cố định</span>
          <p className="text-2xl font-black mt-0.5">{formatVND(totalFixed)}</p>
          <span className="text-[9px] opacity-70">Tháng {fixedMonth}</span>
        </div>
        <Icon path={mdiFormatListBulletedSquare} size={2} className="opacity-30" />
      </div>

      {/* Category add/edit form */}
      <AnimatePresence>
        {showCatForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700 rounded-[24px] p-4 shadow-lg space-y-3">
            <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{editCatId ? 'Sửa' : 'Thêm'} danh mục</h3>
            <input type="text" value={catName} onChange={e => setCatName(e.target.value)} placeholder="Tên danh mục (xăng, nhớt, điện...)" className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white" />
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">Icon</span>
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map(o => (
                  <button key={o.key} type="button" onClick={() => setCatIcon(o.key)}
                    className={`p-2 rounded-xl border-2 transition-all cursor-pointer ${catIcon === o.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}
                    title={o.label}>
                    <Icon path={o.icon} size={0.75} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">Màu sắc</span>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.key} type="button" onClick={() => setCatColor(c.key)} className={`w-7 h-7 rounded-full ${c.cls} ${catColor === c.key ? 'ring-2 ring-offset-1 ring-slate-700' : ''} cursor-pointer transition-all`} />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCatForm(false)} className="text-[10px] text-slate-400 px-3 py-2 cursor-pointer font-bold">Hủy</button>
              <button onClick={handleSaveCat} className="bg-slate-900 text-white text-[10px] font-black px-5 py-2 rounded-xl cursor-pointer hover:bg-slate-800">Lưu</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories + Tasks */}
      {fixedLoading ? (
        <div className="flex justify-center py-8"><Icon path={mdiLoading} size={1.5} className="text-slate-300 animate-spin" /></div>
      ) : fixedCats.length === 0 ? (
        <div className="bg-white/60 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-600 rounded-[28px] p-8 text-center space-y-3">
          <Icon path={mdiTag} size={2} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-400">Chưa có danh mục nào</p>
          <p className="text-[10px] text-slate-400">Nhấn "Danh mục" để thêm (xăng, nhớt, điện...)</p>
        </div>
      ) : (
        <div className="space-y-4">
          {fixedCats.map(cat => {
            const catTasks = fixedTasks.filter(t => t.categoryId === cat.id);
            const catTotal = catTasks.reduce((s, t) => s + t.amount, 0);
            const bgCls = COLOR_BG_MAP[cat.color] || COLOR_BG_MAP.slate;
            const catIcon = ICON_MAP[cat.icon] || mdiTag;
            return (
              <div key={cat.id} className="bg-white/90 dark:bg-slate-800/90 border border-slate-100 dark:border-slate-700 rounded-[24px] overflow-hidden shadow-sm">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${bgCls}`}>
                        <Icon path={catIcon} size={0.875} />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">{cat.name}</h3>
                        <span className="text-[9px] text-slate-400 font-semibold">{catTasks.length} khoản • {formatVND(catTotal)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditCatId(cat.id); setCatName(cat.name); setCatIcon(cat.icon); setCatColor(cat.color); setShowCatForm(true); }}
                        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 cursor-pointer transition-all">
                        <Icon path={mdiPencil} size={0.667} />
                      </button>
                      <button onClick={() => handleDeleteCat(cat.id)} className="p-1.5 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 cursor-pointer transition-all">
                        <Icon path={mdiDeleteOutline} size={0.667} />
                      </button>
                    </div>
                  </div>

                  {/* Tasks list */}
                  <div className="space-y-2 mb-3">
                    {catTasks.map(task => (
                      <div key={task.id} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-2xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate block">{task.name}</span>
                          {task.note && <span className="text-[9px] text-slate-400 truncate block">{task.note}</span>}
                        </div>
                        <span className="text-[11px] font-black text-slate-800 dark:text-white shrink-0">{formatVND(task.amount)}</span>
                        <button onClick={() => { setEditTaskId(task.id); setTaskName(task.name); setTaskAmount(numFmt(String(task.amount))); setTaskNote(task.note); setShowTaskForm(cat.id); }}
                          className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 cursor-pointer shrink-0">
                          <Icon path={mdiPencil} size={0.6} />
                        </button>
                        <button onClick={() => handleDeleteTask(task.id)} className="p-1 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 cursor-pointer shrink-0">
                          <Icon path={mdiDeleteOutline} size={0.6} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add task form */}
                  {showTaskForm === cat.id ? (
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-3 space-y-2">
                      <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="Tên khoản chi" className="w-full bg-white dark:bg-slate-600 border border-slate-100 dark:border-slate-500 rounded-xl px-3 py-2 text-[10px] font-semibold outline-none dark:text-white" />
                      <input type="text" value={taskAmount} onChange={e => setTaskAmount(numFmt(e.target.value))} placeholder="Số tiền" className="w-full bg-white dark:bg-slate-600 border border-slate-100 dark:border-slate-500 rounded-xl px-3 py-2 text-[10px] font-semibold outline-none dark:text-white" />
                      <input type="text" value={taskNote} onChange={e => setTaskNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)" className="w-full bg-white dark:bg-slate-600 border border-slate-100 dark:border-slate-500 rounded-xl px-3 py-2 text-[10px] font-semibold outline-none dark:text-white" />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setShowTaskForm(null); setEditTaskId(null); setTaskName(""); setTaskAmount(""); setTaskNote(""); }} className="text-[10px] text-slate-400 px-2 py-1 cursor-pointer font-bold">Hủy</button>
                        <button onClick={() => handleSaveTask(cat.id, cat.name)} className="bg-slate-900 text-white text-[10px] font-black px-4 py-1.5 rounded-xl cursor-pointer hover:bg-slate-800">Lưu</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setShowTaskForm(cat.id); setEditTaskId(null); setTaskName(""); setTaskAmount(""); setTaskNote(""); }}
                      className="w-full flex items-center justify-center gap-1 py-2 border border-dashed border-slate-200 dark:border-slate-600 rounded-2xl text-[10px] font-bold text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all cursor-pointer">
                      <Icon path={mdiPlus} size={0.667} />Thêm khoản chi
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 pb-40 min-w-0">
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[20px] p-1 shadow-sm">
        {([
          { key: 'debts' as ViewTab, label: 'Nợ', icon: mdiChartTimelineVariant },
          { key: 'cashflow' as ViewTab, label: 'Dòng tiền', icon: mdiCashMultiple },
          { key: 'salary' as ViewTab, label: 'Lương', icon: mdiCalendarCheck },
          { key: 'fixed' as ViewTab, label: 'Cố định', icon: mdiFormatListBulletedSquare },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${activeTab === tab.key ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
            <Icon path={tab.icon} size={0.75} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
          {activeTab === 'debts' && renderDebtDashboard()}
          {activeTab === 'cashflow' && renderCashflow()}
          {activeTab === 'salary' && renderSalary()}
          {activeTab === 'fixed' && renderFixed()}
        </motion.div>
      </AnimatePresence>

      {/* Payment modal portal */}
      {createPortal(
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
                  className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-10 max-h-[80vh] overflow-y-auto shadow-[0_-12px_48px_rgba(0,0,0,0.12)]">
                  <div className="flex items-start justify-between gap-2 mb-5">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-800 dark:text-white">Thanh toán</h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">{debt.name} — {formatVND(debt.currentBalance)} còn lại</p>
                    </div>
                    <button onClick={() => setPaymentDebtId(null)} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 cursor-pointer shrink-0">
                      <Icon path={mdiClose} size={1.25} />
                    </button>
                  </div>
                  <div className="space-y-2 mb-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chọn kỳ thanh toán</p>
                    {unpaid.map(inst => (
                      <label key={inst.index} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:border-slate-200">
                        <input type="checkbox" checked={selectedInstallments.includes(inst.index)}
                          onChange={() => setSelectedInstallments(prev => prev.includes(inst.index) ? prev.filter(i => i !== inst.index) : [...prev, inst.index])}
                          className="w-4 h-4 rounded border-slate-300 focus:ring-slate-900" />
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Kỳ {inst.index + 1}</span>
                            <span className="text-[9px] text-slate-400 ml-2">Hạn: {new Date(inst.dueDate + 'T00:00:00').toLocaleDateString("vi-VN", { month: "short", day: "numeric" })}</span>
                          </div>
                          <span className="text-xs font-extrabold text-slate-800 dark:text-white">{formatVND(inst.amount)}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="mb-5 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ghi chú</label>
                    <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="VD: Chuyển khoản ACB..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] px-4 py-2.5 text-sm font-semibold outline-none dark:text-white" />
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 mb-5">
                    <span className="text-xs font-semibold text-slate-500">Tổng thanh toán:</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">{formatVND(selectedInstallments.reduce((s, idx) => { const inst = debt.installments.find(i => i.index === idx); return s + (inst?.amount || 0); }, 0))}</span>
                  </div>
                  <button onClick={handlePaySubmit} disabled={selectedInstallments.length === 0}
                    className="w-full bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 font-black text-sm py-4 rounded-[20px] hover:opacity-90 disabled:opacity-40 cursor-pointer transition-all shadow-md">
                    Xác nhận thanh toán {selectedInstallments.length} kỳ
                  </button>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}