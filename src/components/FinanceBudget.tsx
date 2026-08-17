import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@mdi/react";
import {
  mdiCheckCircleOutline,
  mdiPlus,
  mdiMinus,
  mdiAlertCircleOutline,
  mdiDeleteOutline,
  mdiClose,
  mdiCurrencyUsd,
  mdiLoading,
  mdiBank,
  mdiCreditCard,
  mdiAccountGroup,
  mdiCashMultiple,
  mdiChartTimelineVariant,
  mdiCalendarMonth,
  mdiWalletOutline,
  mdiPencil,
  mdiCheck,
  mdiCash,
  mdiCalendarCheck,
  mdiClockOutline,
  mdiFormatListBulletedSquare,
  mdiTag,
  mdiFire,
  mdiCoffee,
  mdiLightningBolt,
  mdiCarSide,
  mdiMotorbike,
  mdiOil,
  mdiHomeCity,
  mdiWifi,
  mdiPhone,
  mdiShoppingOutline,
  mdiSmoking,
  mdiKettlebell,
  mdiBeerOutline,
  mdiMedicalBag,
  mdiFoodForkDrink,
  mdiGamepadVariantOutline,
  mdiCat,
  mdiGift,
  mdiBookOpenVariant,
  mdiContentCut,
  mdiEye,
  mdiEyeOff,
  mdiTrashCanOutline,
  mdiSwapHorizontal,
  mdiChevronDown,
  mdiChevronRight,
} from "@mdi/js";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import {
  DebtAccount,
  Transaction,
  DebtInstallment,
  SalaryConfig,
  LeaveDay,
  LeaveType,
  FixedExpenseCategory,
  FixedExpenseTask,
} from "../types";
import { useSalary } from "../hooks/useSalary";
import { useFixedExpenses } from "../hooks/useFixedExpenses";
import {
  calcRemainingBalance,
  calcInstallmentAmount,
  calcPaidPercent,
  calcInterestRate,
  calcInstallmentDueDate,
  generateDebtInstallments,
  getNextUnpaidInstallment,
  calcTotalDue,
  calcTotalPaid,
} from "../lib/debtUtils";
import { getLocalDateString, getLocalMonthString } from "../utils/date";

interface FinanceBudgetProps {
  debts: DebtAccount[];
  transactions: Transaction[];
  onPayMultipleInstallments: (
    debtId: string,
    installmentIndices: number[],
    partialAmounts?: Record<number, number>,
    note?: string,
  ) => void;
  onAddDebt: (debt: Omit<DebtAccount, "id">) => void;
  onDeleteDebt: (id: string) => void;
  onUpdateDebt: (id: string, data: Partial<DebtAccount>) => void;
  onTransactionAdded?: () => void;
}

type ViewTab = "debts" | "salary" | "fixed";

const debtTypeMeta: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  installment: {
    icon: mdiBank,
    label: "Trả góp",
    color: "bg-blue-50 text-blue-700",
  },
  credit_card: {
    icon: mdiCreditCard,
    label: "Thẻ tín dụng",
    color: "bg-purple-50 text-purple-700",
  },
  friend: {
    icon: mdiAccountGroup,
    label: "Bạn bè",
    color: "bg-amber-50 text-amber-700",
  },
};

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Phép năm",
  personal: "Phép cá nhân",
  unpaid: "Ngày nghỉ",
};

const ICON_OPTIONS = [
  { key: "cash", icon: mdiCash, label: "Tiền mặt" },
  { key: "fire", icon: mdiFire, label: "Xăng" },
  { key: "oil", icon: mdiOil, label: "Nhớt" },
  { key: "coffee", icon: mdiCoffee, label: "Cà phê" },
  { key: "lightning", icon: mdiLightningBolt, label: "Điện" },
  { key: "car", icon: mdiCarSide, label: "Xe hơi" },
  { key: "motorbike", icon: mdiMotorbike, label: "Xe máy" },
  { key: "home", icon: mdiHomeCity, label: "Nhà" },
  { key: "wifi", icon: mdiWifi, label: "Internet" },
  { key: "phone", icon: mdiPhone, label: "Điện thoại" },
  { key: "shopping", icon: mdiShoppingOutline, label: "Mua sắm" },
  { key: "smoking", icon: mdiSmoking, label: "Thuốc lá" },
  { key: "gym", icon: mdiKettlebell, label: "Gym" },
  { key: "beer", icon: mdiBeerOutline, label: "Bia / Nhậu" },
  { key: "medical", icon: mdiMedicalBag, label: "Thuốc / Y tế" },
  { key: "food", icon: mdiFoodForkDrink, label: "Ăn uống" },
  { key: "game", icon: mdiGamepadVariantOutline, label: "Giải trí" },
  { key: "pet", icon: mdiCat, label: "Thú cưng" },
  { key: "gift", icon: mdiGift, label: "Quà tặng" },
  { key: "book", icon: mdiBookOpenVariant, label: "Sách / Học" },
  { key: "scissors", icon: mdiContentCut, label: "Cắt tóc" },
  { key: "tag", icon: mdiTag, label: "Khác" },
];

const ICON_MAP: Record<string, string> = Object.fromEntries(
  ICON_OPTIONS.map((o) => [o.key, o.icon]),
);

const COLOR_OPTIONS = [
  { key: "slate", cls: "bg-slate-500", label: "Xám" },
  { key: "rose", cls: "bg-rose-500", label: "Hồng" },
  { key: "red", cls: "bg-red-500", label: "Đỏ" },
  { key: "amber", cls: "bg-amber-500", label: "Vàng" },
  { key: "orange", cls: "bg-orange-500", label: "Cam" },
  { key: "emerald", cls: "bg-emerald-500", label: "Xanh lá" },
  { key: "teal", cls: "bg-teal-500", label: "Xanh ngọc" },
  { key: "cyan", cls: "bg-cyan-500", label: "Cyan" },
  { key: "blue", cls: "bg-blue-500", label: "Xanh dương" },
  { key: "indigo", cls: "bg-indigo-500", label: "Chàm" },
  { key: "purple", cls: "bg-purple-500", label: "Tím" },
  { key: "pink", cls: "bg-pink-500", label: "Hồng đậm" },
];

const COLOR_BG_MAP: Record<string, string> = {
  slate: "bg-slate-100   text-slate-700",
  rose: "bg-rose-100    text-rose-700",
  red: "bg-red-100     text-red-700",
  amber: "bg-amber-100   text-amber-700",
  orange: "bg-orange-100  text-orange-700",
  emerald: "bg-emerald-100 text-emerald-700",
  teal: "bg-teal-100    text-teal-700",
  cyan: "bg-cyan-100    text-cyan-700",
  blue: "bg-blue-100    text-blue-700",
  indigo: "bg-indigo-100  text-indigo-700",
  purple: "bg-purple-100  text-purple-700",
  pink: "bg-pink-100    text-pink-700",
};

function formatVND(num: number) {
  if (num >= 1_000_000_000) {
    const v = Math.round(num / 100_000_000) / 10;
    return (
      new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(v) + " tỷ"
    );
  }
  const valueInK = Math.round(num / 1000);
  return new Intl.NumberFormat("vi-VN").format(valueInK) + "k";
}

function formatFullVND(num: number) {
  return new Intl.NumberFormat("vi-VN").format(num) + "đ";
}

function getNextInstallment(
  inst: DebtInstallment[],
): DebtInstallment | undefined {
  return inst.find((i) => i.status === "pending");
}

function getOverdueCount(inst: DebtInstallment[]): number {
  const todayStr = getLocalDateString();
  return inst.filter((i) => i.status === "pending" && i.dueDate < todayStr)
    .length;
}

function numFmt(val: string) {
  const clean = val.replace(/\D/g, "");
  if (!clean) return "";
  return new Intl.NumberFormat("vi-VN").format(parseInt(clean));
}

function handleAmountKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (
    [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "Enter",
      "Escape",
      "Home",
      "End",
      "Unidentified",
      "Process",
    ].includes(e.key) ||
    e.ctrlKey ||
    e.metaKey ||
    e.key.length > 1
  ) {
    return;
  }
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
}

export default function FinanceBudget({
  debts,
  transactions,
  onPayMultipleInstallments,
  onAddDebt,
  onDeleteDebt,
  onUpdateDebt,
  onTransactionAdded,
}: FinanceBudgetProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>("debts");
  const [showSalary, setShowSalary] = useState(false);
  const currentMonth = getLocalMonthString();
  const [fixedMonth, setFixedMonth] = useState(currentMonth);

  const {
    salaryConfig,
    loading: salaryLoading,
    saveConfig,
    autoAddSalary,
  } = useSalary();
  const {
    categories: fixedCats,
    tasks: fixedTasks,
    totalFixed,
    loading: fixedLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    addTask,
    updateTask,
    deleteTask,
  } = useFixedExpenses(fixedMonth);

  // ── Debt states ───────────────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [debtType, setDebtType] = useState<
    "installment" | "credit_card" | "friend"
  >("installment");
  const [debtName, setDebtName] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [interestRate, setInterestRate] = useState("0");
  const [paymentDay, setPaymentDay] = useState("5");
  const [totalInstallments, setTotalInstallments] = useState("1");
  const [paidInstallments, setPaidInstallments] = useState("0");
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [notes, setNotes] = useState("");
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null);
  const [openDebtId, setOpenDebtId] = useState<string | null>(null);
  const [selectedInstallments, setSelectedInstallments] = useState<number[]>(
    [],
  );
  const [paymentNote, setPaymentNote] = useState("");
  const [editDebtId, setEditDebtId] = useState<string | null>(null);
  const dragControlsPayment = useDragControls();
  const dragControlsDebt = useDragControls();

  type KeypadField =
    | "originalAmount"
    | "monthlyPayment"
    | "totalInstallments"
    | "paymentDay"
    | "paidInstallments"
    | "grossSalary"
    | "netSalary"
    | "receiveDay"
    | "workDays"
    | "taskAmount";

  const [activeKeypadField, setActiveKeypadField] = useState<KeypadField | null>(null);

  const handleKeypadPress = useCallback((key: string) => {
    setActiveKeypadField((field) => {
      if (!field) return null;

      if (field === "originalAmount" || field === "monthlyPayment" || field === "grossSalary" || field === "netSalary" || field === "taskAmount") {
        let setter: React.Dispatch<React.SetStateAction<string>>;
        if (field === "originalAmount") setter = setOriginalAmount;
        else if (field === "monthlyPayment") setter = setMonthlyPayment;
        else if (field === "grossSalary") setter = setGrossSalary;
        else if (field === "netSalary") setter = setNetSalary;
        else setter = setTaskAmount;

        setter((prev) => {
          let rawDigits = prev.replace(/\D/g, "");
          if (key === "C") return "";
          if (key === "BACK") {
            const next = rawDigits.slice(0, -1);
            return next ? numFmt(next) : "";
          }
          if (key === "000") {
            if (!rawDigits || rawDigits === "0") return prev;
            return numFmt(rawDigits + "000");
          }
          if (rawDigits === "0") rawDigits = "";
          return numFmt(rawDigits + key);
        });
      } else if (field === "totalInstallments" || field === "paidInstallments") {
        const setter = field === "totalInstallments" ? setTotalInstallments : setPaidInstallments;
        setter((prev) => {
          let rawDigits = prev.replace(/\D/g, "");
          if (key === "C") return "0";
          if (key === "BACK") {
            const next = rawDigits.slice(0, -1);
            return next || "0";
          }
          if (rawDigits === "0") rawDigits = "";
          const combined = rawDigits + key;
          if (parseInt(combined) <= 360) return combined;
          return prev;
        });
      } else if (field === "paymentDay" || field === "receiveDay" || field === "workDays") {
        const setter = field === "paymentDay" ? setPaymentDay : field === "receiveDay" ? setReceiveDay : setWorkDays;
        setter((prev) => {
          let rawDigits = prev.replace(/\D/g, "");
          if (key === "C") return "1";
          if (key === "BACK") {
            const next = rawDigits.slice(0, -1);
            return next || "1";
          }
          if (rawDigits === "0") rawDigits = "";
          const combined = rawDigits + key;
          const val = parseInt(combined);
          if (val >= 1 && val <= 31) return String(val);
          if (val < 1) return "1";
          return prev;
        });
      }
      return field;
    });
  }, []);

  const handleKeypadPreset = (val: string | number) => {
    if (!activeKeypadField) return;

    if (activeKeypadField === "originalAmount" || activeKeypadField === "monthlyPayment" || activeKeypadField === "grossSalary" || activeKeypadField === "netSalary" || activeKeypadField === "taskAmount") {
      let currentVal = "";
      let setter: (v: string) => void = setOriginalAmount;
      if (activeKeypadField === "originalAmount") { currentVal = originalAmount; setter = setOriginalAmount; }
      else if (activeKeypadField === "monthlyPayment") { currentVal = monthlyPayment; setter = setMonthlyPayment; }
      else if (activeKeypadField === "grossSalary") { currentVal = grossSalary; setter = setGrossSalary; }
      else if (activeKeypadField === "netSalary") { currentVal = netSalary; setter = setNetSalary; }
      else { currentVal = taskAmount; setter = setTaskAmount; }

      if (typeof val === "number") {
        const currentRaw = parseInt(currentVal.replace(/\D/g, "")) || 0;
        setter(numFmt(String(currentRaw + val)));
      } else {
        setter(numFmt(String(val)));
      }
    } else if (activeKeypadField === "totalInstallments") {
      setTotalInstallments(String(val));
    } else if (activeKeypadField === "paymentDay") {
      setPaymentDay(String(val));
    } else if (activeKeypadField === "paidInstallments") {
      setPaidInstallments(String(val));
    } else if (activeKeypadField === "receiveDay") {
      setReceiveDay(String(val));
    } else if (activeKeypadField === "workDays") {
      setWorkDays(String(val));
    }
  };

  React.useEffect(() => {
    if (!activeKeypadField) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleKeypadPress(e.key);
      } else if (e.key === "Backspace") {
        handleKeypadPress("BACK");
      } else if (e.key === "Delete" || e.key.toLowerCase() === "c") {
        handleKeypadPress("C");
      } else if (e.key === "Enter" || e.key === "Escape") {
        setActiveKeypadField(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeKeypadField, handleKeypadPress]);

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
  const [newLeaveType, setNewLeaveType] = useState<LeaveType>("personal");

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
  const totalDebt = debts
    .filter((d) => d.status === "active")
    .reduce((s, d) => s + calcRemainingBalance(d), 0);
  const totalMonthlyPayment = debts
    .filter((d) => d.status === "active")
    .reduce((s, d) => s + d.monthlyPayment, 0);
  const activeDebtCount = debts.filter((d) => d.status === "active").length;

  // ── Debt calculated properties ────────────────────────────
  const rawAmt = parseInt(originalAmount.replace(/\D/g, "")) || 0;
  const rawMonthly = parseInt(monthlyPayment.replace(/\D/g, "")) || 0;
  const totalInst = parseInt(totalInstallments) || 0;
  const computedInterestRate = calcInterestRate(rawAmt, rawMonthly, totalInst);
  const computedInterestAmount = Math.max(0, rawMonthly * totalInst - rawAmt);

  const resetDebtForm = () => {
    setDebtName("");
    setOriginalAmount("");
    setMonthlyPayment("");
    setInterestRate("0");
    setPaymentDay("12");
    setTotalInstallments("1");
    setPaidInstallments("0");
    setStartDate(getLocalDateString());
    setNotes("");
    setEditDebtId(null);
    setShowAddForm(false);
  };

  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const rawAmount = parseInt(originalAmount.replace(/\D/g, "")) || 0;
    const rawMonthly = parseInt(monthlyPayment.replace(/\D/g, "")) || 0;
    const totalInst = parseInt(totalInstallments) || 1;
    const paidInst = parseInt(paidInstallments) || 0;
    const day = parseInt(paymentDay) || 12;

    if (!debtName.trim() || rawAmount <= 0) {
      toast.error("Nhập tên khoản nợ và số tiền!");
      return;
    }

    const calculatedMonthlyPayment = rawMonthly > 0
      ? rawMonthly
      : calcInstallmentAmount(rawAmount, computedInterestRate, totalInst);

    const autoRate = computedInterestRate;

    const instData = generateDebtInstallments(
      rawAmount,
      calculatedMonthlyPayment,
      totalInst,
      paidInst,
      startDate,
      day
    );

    // Tính số dư nợ dựa trên các kỳ chưa trả
    const unpaidInstallments = instData.slice(paidInst);
    const balance = unpaidInstallments.reduce((s, i) => s + (i.amount - (i.paidAmount || 0)), 0);

    const maturityDate =
      instData.length > 0 ? instData[instData.length - 1].dueDate : startDate;

    const debtData = {
      type: debtType,
      name: debtName.trim(),
      originalAmount: rawAmount,
      currentBalance: Math.max(0, balance),
      monthlyPayment: calculatedMonthlyPayment,
      interestRate: autoRate,
      paymentDay: day,
      startDate,
      maturityDate,
      totalInstallments: totalInst,
      paidInstallments: paidInst,
      status: balance > 0 ? ("active" as const) : ("settled" as const),
      installments: instData,
      notes,
    };

    if (editDebtId) {
      onUpdateDebt(editDebtId, debtData);
      toast.success("Đã cập nhật khoản nợ!");
    } else {
      onAddDebt(debtData);
      toast.success("Đã thêm khoản nợ!");
    }
    resetDebtForm();
  };

  const handleEditOpen = (debt: DebtAccount) => {
    setEditDebtId(debt.id);
    setDebtType(debt.type);
    setDebtName(debt.name);
    setOriginalAmount(numFmt(String(debt.originalAmount)));
    setMonthlyPayment(numFmt(String(debt.monthlyPayment)));
    const computedRate = calcInterestRate(debt.originalAmount, debt.monthlyPayment, debt.totalInstallments);
    setInterestRate(String(computedRate || debt.interestRate || 0));
    setPaymentDay(String(debt.paymentDay));
    setTotalInstallments(String(debt.totalInstallments));
    setPaidInstallments(String(debt.paidInstallments));
    setStartDate(debt.startDate);
    setNotes(debt.notes || "");
    setShowAddForm(true);
  };

  const handlePayOpen = (debt: DebtAccount) => {
    setPaymentDebtId(debt.id);
    const nextUnpaid = debt.installments.find(
      (i) => i.status === "pending" || i.status === "partial",
    );
    setSelectedInstallments(nextUnpaid ? [nextUnpaid.index] : []);
    setPaymentNote("");
  };

  const handlePaySubmit = async () => {
    if (!paymentDebtId || selectedInstallments.length === 0) {
      toast.error("Chọn ít nhất 1 kỳ để thanh toán");
      return;
    }
    await onPayMultipleInstallments(
      paymentDebtId,
      selectedInstallments,
      undefined,
      paymentNote || undefined,
    );
    setPaymentDebtId(null);
    if (onTransactionAdded) {
      onTransactionAdded();
    }
    toast.success(`Đã thanh toán ${selectedInstallments.length} kỳ!`);
  };

  // ── Salary helpers ────────────────────────────────────────────────────────
  const startEditSalary = () => {
    setGrossSalary(
      salaryConfig.grossSalary ? numFmt(String(salaryConfig.grossSalary)) : "",
    );
    setNetSalary(
      salaryConfig.netSalary ? numFmt(String(salaryConfig.netSalary)) : "",
    );
    setReceiveDay(String(salaryConfig.receiveDay || 1));
    setWorkDays(String(salaryConfig.workDays || 26));
    setLeaveDays(salaryConfig.leaveDays ? [...salaryConfig.leaveDays] : []);
    setSalaryNotes(salaryConfig.notes || "");
    setSalaryEdit(true);
  };

  const handleSaveSalary = async () => {
    const gross = parseInt(grossSalary.replace(/\D/g, "")) || 0;
    const net = parseInt(netSalary.replace(/\D/g, "")) || 0;
    if (net <= 0) {
      toast.error("Nhập lương thực nhận!");
      return;
    }
    try {
      await saveConfig({
        grossSalary: gross,
        netSalary: net,
        receiveDay: parseInt(receiveDay) || 1,
        workDays: parseInt(workDays) || 26,
        leaveDays,
        notes: salaryNotes,
      });
      setSalaryEdit(false);
      toast.success("Đã lưu config lương!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAutoAdd = async () => {
    try {
      const result = await autoAddSalary();
      if (result.skipped) {
        toast(result.message, { icon: "ℹ️" });
      } else {
        toast.success(result.message);
        if (onTransactionAdded) onTransactionAdded();
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi cộng lương");
    }
  };

  const totalLeave = (salaryConfig.leaveDays || []).reduce(
    (s, l) => s + (l.count || 0),
    0,
  );

  // ── Fixed expense helpers ─────────────────────────────────────────────────
  const handleSaveCat = async () => {
    if (!catName.trim()) {
      toast.error("Nhập tên danh mục!");
      return;
    }
    try {
      if (editCatId) {
        await updateCategory({
          id: editCatId,
          name: catName,
          icon: catIcon,
          color: catColor,
        });
        toast.success("Đã cập nhật danh mục!");
      } else {
        await addCategory({ name: catName, icon: catIcon, color: catColor });
        toast.success("Đã thêm danh mục!");
      }
      setCatName("");
      setCatIcon("cash");
      setCatColor("slate");
      setEditCatId(null);
      setShowCatForm(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteCat = async (id: string) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-slate-800">Xóa danh mục?</p>
          <p className="text-xs text-slate-500">
            Tất cả khoản chi trong danh mục này sẽ bị xóa.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await deleteCategory(id);
                  toast.success("Đã xóa danh mục!");
                } catch (e: any) {
                  toast.error(e.message);
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
            >
              Xóa
            </button>
          </div>
        </div>
      ),
      { duration: 10000 },
    );
  };

  const handleSaveTask = async (catId: string, catName: string) => {
    if (!taskName.trim() || !taskAmount) {
      toast.error("Nhập đủ thông tin!");
      return;
    }
    const amount = parseInt(taskAmount.replace(/\D/g, "")) || 0;
    try {
      if (editTaskId) {
        await updateTask({
          id: editTaskId,
          name: taskName,
          amount,
          note: taskNote,
        });
        toast.success("Đã cập nhật khoản chi!");
      } else {
        await addTask({
          categoryId: catId,
          categoryName: catName,
          name: taskName,
          amount,
          month: fixedMonth,
          note: taskNote,
        });
        toast.success("Đã thêm khoản chi!");
      }
      setTaskName("");
      setTaskAmount("");
      setTaskNote("");
      setEditTaskId(null);
      setShowTaskForm(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const calcActualSpendForCategory = useCallback(
    (catName: string, monthStr: string) => {
      if (!transactions || transactions.length === 0) return 0;
      return transactions
        .filter((t) => {
          // Lọc các giao dịch chi tiêu trong tháng tương ứng
          const isExpense = t.type === "expense";
          const isSameMonth = t.date.startsWith(monthStr);
          if (!isExpense || !isSameMonth) return false;

          // Thực hiện đối chiếu từ khóa (Mapping)
          const categoryClean = (t.category || "").trim().toLowerCase();
          const descClean = (t.description || "").trim().toLowerCase();
          const searchKey = catName.trim().toLowerCase();

          // Khớp nếu tên danh mục giao dịch hoặc mô tả giao dịch chứa tên danh mục cố định
          return categoryClean === searchKey || descClean.includes(searchKey);
        })
        .reduce((sum, t) => sum + t.amount, 0);
    },
    [transactions],
  );

  const handleDeleteTask = async (id: string) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-slate-800">Xóa khoản chi này?</p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await deleteTask(id);
                  toast.success("Đã xóa!");
                } catch (e: any) {
                  toast.error(e.message);
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
            >
              Xóa
            </button>
          </div>
        </div>
      ),
      { duration: 10000 },
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER TABS
  // ═══════════════════════════════════════════════════════════════════════════

  const renderDebtDashboard = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            QUẢN LÝ NỢ
          </span>
          {/* <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Hồ Sơ Nợ
          </h1> */}
        </div>
        <button
          onClick={() => {
            resetDebtForm();
            setShowAddForm(true);
          }}
          className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs px-4 py-2.5 rounded-full hover:opacity-90 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
        >
          <Icon path={mdiPlus} size={0.875} />
          <span>Thêm nợ</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "Tổng nợ",
            val: formatVND(totalDebt),
            sub: `${activeDebtCount} khoản`,
            color: "text-slate-900 dark:text-white",
          },
          {
            label: "Trả/kỳ",
            val: formatVND(totalMonthlyPayment),
            sub: "Tổng các kỳ",
            color: "text-rose-600",
          },
          {
            label: "Nợ còn lại",
            val: formatVND(Math.max(0, totalDebt - totalMonthlyPayment)),
            sub: "Sau trả kỳ này",
            color: "text-emerald-600",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[20px] p-3 min-w-0"
          >
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              {c.label}
            </span>
            <p className={`text-sm font-black mt-1 truncate ${c.color}`}>
              {c.val}
            </p>
            <span className="text-[9px] font-semibold text-slate-400">
              {c.sub}
            </span>
          </div>
        ))}
      </div>



      {debts.length === 0 ? (
        <div className="bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-[28px] p-8 text-center text-slate-400">
          <Icon
            path={mdiAlertCircleOutline}
            size={2}
            className="mx-auto text-slate-300 mb-2"
          />
          <p className="text-sm font-semibold">Chưa có khoản nợ nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {debts
            .filter((d) => d.status === "active")
            .map((debt) => {
              const meta = debtTypeMeta[debt.type] || debtTypeMeta.installment;
              const nextInst = getNextInstallment(debt.installments);
              const overdue = getOverdueCount(debt.installments);
              const paidPct = calcPaidPercent(debt);
              return (
                <div
                  key={debt.id}
                  className="bg-white/95 dark:bg-slate-800/95 border border-slate-100 dark:border-slate-700 rounded-[24px] shadow-sm overflow-hidden"
                >
                  {/* Collapsible Header */}
                  <div
                    onClick={() =>
                      setOpenDebtId(openDebtId === debt.id ? null : debt.id)
                    }
                    className="p-4 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                        <Icon path={meta.icon} size={1} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white truncate">
                          {debt.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${meta.color}`}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[10px] font-black text-slate-800 dark:text-white">
                            {formatVND(debt.currentBalance)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {overdue > 0 && (
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full animate-pulse whitespace-nowrap">
                          Quá hạn {overdue}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditOpen(debt);
                        }}
                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-all cursor-pointer"
                        title="Sửa khoản nợ"
                      >
                        <Icon path={mdiPencil} size={0.75} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDebt(debt.id);
                        }}
                        className="p-1.5 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all cursor-pointer"
                        title="Xóa khoản nợ"
                      >
                        <Icon path={mdiDeleteOutline} size={0.75} />
                      </button>
                      <Icon
                        path={
                          openDebtId === debt.id
                            ? mdiChevronDown
                            : mdiChevronRight
                        }
                        size={0.875}
                        className="text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Collapsible Body */}
                  <AnimatePresence>
                    {openDebtId === debt.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-slate-50 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/10 p-4 pt-3 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">
                              Dư nợ / Gốc
                            </span>
                            <span className="text-sm font-black text-slate-800 dark:text-white truncate block">
                              {formatVND(debt.currentBalance)}{" "}
                              <span className="text-[10px] text-slate-400 font-medium font-normal">
                                / {formatVND(debt.originalAmount)}
                              </span>
                            </span>
                          </div>
                          <div className="text-right min-w-0">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">
                              Trả mỗi kỳ
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate block">
                              {formatVND(debt.monthlyPayment)}
                              <span className="text-[9px] text-slate-400 font-medium">
                                /kỳ ({debt.paidInstallments}/
                                {debt.totalInstallments} kỳ)
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-900 dark:bg-slate-200 rounded-full transition-all"
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-2 border border-slate-100 dark:border-slate-700/60">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">
                              Ngày bắt đầu
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {debt.startDate ? debt.startDate.split('-').reverse().join('/') : '—'}
                            </span>
                          </div>
                          <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-2 border border-slate-100 dark:border-slate-700/60">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">
                              Lãi suất tự động
                            </span>
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                              {debt.interestRate > 0 ? `${debt.interestRate}%` : '0% (Không lãi)'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {nextInst ? (
                              <>
                                <Icon
                                  path={mdiCalendarMonth}
                                  size={0.75}
                                  className="text-slate-400 shrink-0"
                                />
                                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold truncate">
                                  Kỳ {nextInst.index + 1}:{" "}
                                  <span className="text-slate-900 dark:text-white">
                                    {nextInst.dueDate.split('-').reverse().join('/')}
                                  </span>{" "}
                                  ({formatVND(nextInst.amount)})
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                <Icon
                                  path={mdiCheckCircleOutline}
                                  size={0.75}
                                />{" "}
                                Đã tất toán xong
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handlePayOpen(debt)}
                            className="bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 font-bold text-[9px] px-3 py-1.5 rounded-lg hover:opacity-80 transition-all cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
                          >
                            <Icon path={mdiCurrencyUsd} size={0.667} />
                            Thanh toán
                          </button>
                        </div>

                        {debt.installments.filter(
                          (i) =>
                            i.status === "pending" || i.status === "partial",
                        ).length > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1.5">
                              Lịch thanh toán các kỳ tiếp theo (Hạn ngày {debt.paymentDay} hàng tháng)
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                              {debt.installments
                                .filter(
                                  (i) =>
                                    i.status === "pending" ||
                                    i.status === "partial",
                                )
                                .map((inst) => {
                                  const isOverdue =
                                    inst.dueDate < getLocalDateString();
                                  return (
                                    <span
                                      key={inst.index}
                                      className={`text-[9px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 ${isOverdue ? "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300" : "bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300"}`}
                                    >
                                      <span>Kỳ {inst.index + 1}:</span>
                                      <span>{inst.dueDate.split('-').reverse().join('/')}</span>
                                    </span>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          {debts.filter((d) => d.status === "settled").length > 0 && (
            <details className="bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-[20px] overflow-hidden">
              <summary className="p-3 text-[10px] font-bold text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Đã tất toán (
                {debts.filter((d) => d.status === "settled").length} khoản)
              </summary>
              <div className="px-3 pb-3 space-y-2">
                {debts
                  .filter((d) => d.status === "settled")
                  .map((debt) => (
                    <div
                      key={debt.id}
                      className="flex items-center justify-between text-[10px] gap-2"
                    >
                      <span className="font-semibold text-slate-600 dark:text-slate-300 truncate min-w-0">
                        {debt.name}
                      </span>
                      <span className="text-emerald-600 font-bold shrink-0">
                        Đã trả {formatVND(debt.originalAmount)}
                      </span>
                    </div>
                  ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );

  const renderSalary = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            DÒNG TIỀN
          </span>
          {/* <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Quản Lý Lương
          </h1> */}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSalary((s) => !s)}
            className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer"
            title={showSalary ? "Ẩn số tiền" : "Hiển thị số tiền"}
          >
            <Icon path={showSalary ? mdiEye : mdiEyeOff} size={0.875} />
          </button>
          {!salaryEdit && (
            <button
              onClick={startEditSalary}
              className="bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs px-4 py-2.5 rounded-full hover:opacity-90 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Icon path={mdiPencil} size={0.875} />
              <span>Cấu hình</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {!salaryEdit && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 rounded-[24px] p-4 text-white shadow-lg shadow-purple-200/60">
              <span className="text-[9px] font-bold uppercase opacity-80 block">
                Lương thực nhận
              </span>
              <p className="text-xl font-black mt-1 tracking-wide">
                {showSalary ? formatVND(salaryConfig.netSalary) : "••••••"}
              </p>
              <span className="text-[9px] opacity-70 block mt-1">
                Gross:{" "}
                {showSalary ? formatVND(salaryConfig.grossSalary) : "••••••"}
              </span>
            </div>
            <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-[24px] p-4 text-white shadow-lg shadow-orange-200/60">
              <span className="text-[9px] font-bold uppercase opacity-80 block">
                Ngày nhận lương
              </span>
              <p className="text-xl font-black mt-1">
                Ngày {salaryConfig.receiveDay || "—"}
              </p>
              <span className="text-[9px] opacity-70 block mt-1">
                Hàng tháng
              </span>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[24px] p-4 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Công - Nghỉ
            </span>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-50 dark:bg-slate-700 rounded-2xl p-3 text-center">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">
                  Ngày công
                </span>
                <span className="text-lg font-black text-slate-800 dark:text-white">
                  {salaryConfig.workDays || 0}
                </span>
              </div>
              <div className="flex-1 bg-slate-50 dark:bg-slate-700 rounded-2xl p-3 text-center">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">
                  Tổng nghỉ
                </span>
                <span className="text-lg font-black text-amber-600">
                  {totalLeave}
                </span>
              </div>
            </div>
            {(salaryConfig.leaveDays || []).length > 0 && (
              <div className="space-y-1.5">
                {salaryConfig.leaveDays.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[10px]"
                  >
                    <span className="font-semibold text-slate-500">
                      {LEAVE_TYPE_LABELS[l.type as LeaveType]}
                    </span>
                    <span className="font-black text-slate-700 dark:text-slate-300">
                      {l.count} ngày
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status auto-add */}
          <div
            className={`rounded-[20px] p-4 border flex items-center justify-between gap-3 ${salaryConfig.lastAutoAddMonth === currentMonth ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800" : "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800"}`}
          >
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                Lương tháng {currentMonth}
              </span>
              <span
                className={`text-xs font-black ${salaryConfig.lastAutoAddMonth === currentMonth ? "text-emerald-600" : "text-amber-600"}`}
              >
                {salaryConfig.lastAutoAddMonth === currentMonth
                  ? "✓ Đã cộng vào sổ"
                  : "⏳ Chưa cộng"}
              </span>
            </div>
            {salaryConfig.lastAutoAddMonth !== currentMonth &&
              salaryConfig.netSalary > 0 && (
                <button
                  onClick={handleAutoAdd}
                  className="bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 text-[10px] font-black px-4 py-2 rounded-xl cursor-pointer hover:opacity-90 transition-all flex items-center gap-1 shrink-0"
                >
                  <Icon path={mdiCalendarCheck} size={0.75} />
                  Cộng lương
                </button>
              )}
          </div>

          {salaryConfig.notes && (
            <div className="bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-[20px] p-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                Ghi chú
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {salaryConfig.notes}
              </p>
            </div>
          )}

          {salaryConfig.netSalary <= 0 && (
            <div className="bg-white/60 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-600 rounded-[24px] p-8 text-center space-y-3">
              <Icon
                path={mdiCashMultiple}
                size={2}
                className="mx-auto text-slate-300"
              />
              <p className="text-sm font-semibold text-slate-400">
                Chưa có config lương
              </p>
              <button
                onClick={startEditSalary}
                className="bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-full hover:bg-slate-800 cursor-pointer"
              >
                Cấu hình ngay
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit form */}
      {salaryEdit && (
        <div className="bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700 rounded-[24px] p-5 shadow-lg space-y-4">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Cấu hình lương
          </h3>
          <div className="space-y-3">
            <div onClick={() => setActiveKeypadField("grossSalary")} className="cursor-pointer group">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center justify-between">
                <span>Lương gross (VND)</span>
                <span className="text-[8px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                  Bàn phím số 🔢
                </span>
              </label>
              <input
                type="text"
                readOnly
                value={grossSalary}
                placeholder="VD: 18,000,000"
                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-bold rounded-xl px-3 py-2.5 outline-none dark:text-white cursor-pointer group-hover:border-blue-500 transition-colors"
              />
            </div>
            <div onClick={() => setActiveKeypadField("netSalary")} className="cursor-pointer group">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center justify-between">
                <span>Lương thực nhận (VND) *</span>
                <span className="text-[8px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                  Bàn phím số 🔢
                </span>
              </label>
              <input
                type="text"
                readOnly
                value={netSalary}
                placeholder="VD: 15,000,000"
                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-bold rounded-xl px-3 py-2.5 outline-none dark:text-white cursor-pointer group-hover:border-blue-500 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div onClick={() => setActiveKeypadField("receiveDay")} className="cursor-pointer group">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center justify-between">
                  <span>Ngày nhận lương</span>
                  <span className="text-[8px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                    Bàn phím số 🔢
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={receiveDay ? `Ngày ${receiveDay}` : "Ngày 1"}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-bold rounded-xl px-3 py-2.5 outline-none dark:text-white cursor-pointer group-hover:border-blue-500 transition-colors"
                />
              </div>
              <div onClick={() => setActiveKeypadField("workDays")} className="cursor-pointer group">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center justify-between">
                  <span>Số ngày công</span>
                  <span className="text-[8px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                    Bàn phím số 🔢
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={workDays ? `${workDays} ngày` : "26 ngày"}
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-bold rounded-xl px-3 py-2.5 outline-none dark:text-white cursor-pointer group-hover:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Leave days */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Ngày nghỉ
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingLeave(true)}
                  className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full hover:bg-slate-200 cursor-pointer flex items-center gap-0.5"
                >
                  <Icon path={mdiPlus} size={0.6} />
                  Thêm
                </button>
              </div>
              {leaveDays.map((l, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-xl p-2.5"
                >
                  <div className="flex-1">
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      {LEAVE_TYPE_LABELS[l.type as LeaveType]}
                    </span>
                    <span className="text-[10px] font-black text-slate-800 dark:text-white ml-2">
                      {l.count} ngày
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setLeaveDays(leaveDays.filter((_, j) => j !== i))
                    }
                    className="p-1 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 cursor-pointer"
                  >
                    <Icon path={mdiClose} size={0.6} />
                  </button>
                </div>
              ))}
              {isAddingLeave && (
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 space-y-2">
                  <select
                    value={newLeaveType}
                    onChange={(e) =>
                      setNewLeaveType(e.target.value as LeaveType)
                    }
                    className="w-full bg-white dark:bg-slate-600 border border-slate-100 dark:border-slate-500 rounded-lg px-2 py-1.5 text-[10px] font-semibold outline-none dark:text-white"
                  >
                    <option value="annual">Phép năm</option>
                    <option value="personal">Phép cá nhân</option>
                    <option value="unpaid">Ngày nghỉ (không lương)</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={newLeaveCount}
                      onChange={(e) => setNewLeaveCount(e.target.value)}
                      placeholder="Số ngày"
                      className="flex-1 bg-white dark:bg-slate-600 border border-slate-100 dark:border-slate-500 rounded-lg px-2 py-1.5 text-[10px] font-semibold outline-none dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const count = parseFloat(newLeaveCount) || 0;
                        if (count <= 0) return;
                        setLeaveDays([
                          ...leaveDays,
                          { count, type: newLeaveType },
                        ]);
                        setNewLeaveCount("1");
                        setIsAddingLeave(false);
                      }}
                      className="bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      <Icon path={mdiCheck} size={0.667} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingLeave(false)}
                      className="text-slate-400 text-[10px] px-2 py-1.5 cursor-pointer"
                    >
                      <Icon path={mdiClose} size={0.667} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Ghi chú
              </label>
              <input
                type="text"
                value={salaryNotes}
                onChange={(e) => setSalaryNotes(e.target.value)}
                placeholder="VD: Lương tháng 12 bonus..."
                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setSalaryEdit(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-3 py-2 cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleSaveSalary}
              className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-slate-800 cursor-pointer shadow-md"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderFixed = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            CHI TIÊU CỐ ĐỊNH
          </span>
          {/* <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">Task Chi Tiêu</h1> */}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={fixedMonth}
            onChange={(e) => setFixedMonth(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 border-0 rounded-xl px-2 py-1.5 text-[10px] font-bold outline-none dark:text-white"
          />
          <button
            onClick={() => {
              setShowCatForm(true);
              setEditCatId(null);
              setCatName("");
              setCatIcon("cash");
              setCatColor("slate");
            }}
            title="Thêm danh mục"
            className="bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 font-bold p-2.5 rounded-xl hover:opacity-90 cursor-pointer flex items-center justify-center"
          >
            <Icon path={mdiPlus} size={0.75} />
          </button>
        </div>
      </div>

      {/* Total summary */}
      <div className="bg-gradient-to-r from-rose-500 via-pink-600 to-fuchsia-600 rounded-[24px] p-4 text-white flex items-center justify-between shadow-lg shadow-rose-200/60">
        <div>
          <span className="text-[9px] font-bold uppercase opacity-80 block">
            Tổng chi cố định
          </span>
          <p className="text-2xl font-black mt-0.5">{formatVND(totalFixed)}</p>
          <span className="text-[9px] opacity-70">Tháng {fixedMonth}</span>
        </div>
        <Icon
          path={mdiFormatListBulletedSquare}
          size={2}
          className="opacity-30"
        />
      </div>

      {/* Category add/edit form */}
      <AnimatePresence>
        {showCatForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700 rounded-[24px] p-4 shadow-lg space-y-3"
          >
            <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              {editCatId ? "Sửa" : "Thêm"} danh mục
            </h3>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Tên danh mục (xăng, nhớt, điện...)"
              className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none dark:text-white"
            />
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">
                Icon
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setCatIcon(o.key)}
                    className={`p-2 rounded-xl border-2 transition-all cursor-pointer ${catIcon === o.key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 text-slate-500 hover:border-slate-300"}`}
                    title={o.label}
                  >
                    <Icon path={o.icon} size={0.75} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">
                Màu sắc
              </span>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCatColor(c.key)}
                    title={c.label}
                    className={`w-7 h-7 rounded-full ${c.cls} ${catColor === c.key ? "ring-2 ring-offset-2 ring-slate-700 scale-110" : "hover:scale-105"} cursor-pointer transition-all`}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCatForm(false)}
                className="text-[10px] text-slate-400 px-3 py-2 cursor-pointer font-bold"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveCat}
                className="bg-slate-900 text-white text-[10px] font-black px-5 py-2 rounded-xl cursor-pointer hover:bg-slate-800"
              >
                Lưu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories + Tasks */}
      {fixedLoading ? (
        <div className="flex justify-center py-8">
          <Icon
            path={mdiLoading}
            size={1.5}
            className="text-slate-300 animate-spin"
          />
        </div>
      ) : fixedCats.length === 0 ? (
        <div className="bg-white/60 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-600 rounded-[28px] p-8 text-center space-y-3">
          <Icon path={mdiTag} size={2} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-400">
            Chưa có danh mục nào
          </p>
          <p className="text-[10px] text-slate-400">
            Nhấn "Danh mục" để thêm (xăng, nhớt, điện...)
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {fixedCats.map((cat) => {
            const catTasks = fixedTasks.filter((t) => t.categoryId === cat.id);
            const catTotal = catTasks.reduce((s, t) => s + t.amount, 0);
            const bgCls = COLOR_BG_MAP[cat.color] || COLOR_BG_MAP.slate;
            const catIcon = ICON_MAP[cat.icon] || mdiTag;
            return (
              <div
                key={cat.id}
                className="bg-white/90 dark:bg-slate-800/90 border border-slate-100 dark:border-slate-700 rounded-[24px] overflow-hidden shadow-sm"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2.5 rounded-2xl ${bgCls}`}>
                        <Icon path={catIcon} size={1} />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">
                          {cat.name}
                        </h3>
                        <span className="text-[9px] text-slate-400 font-semibold">
                          {catTasks.length} khoản • {formatVND(catTotal)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditCatId(cat.id);
                          setCatName(cat.name);
                          setCatIcon(cat.icon);
                          setCatColor(cat.color);
                          setShowCatForm(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 cursor-pointer transition-all text-[9px] font-bold"
                      >
                        <Icon path={mdiPencil} size={0.6} />
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteCat(cat.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 text-rose-500 dark:text-rose-400 cursor-pointer transition-all text-[9px] font-bold"
                      >
                        <Icon path={mdiTrashCanOutline} size={0.6} />
                        Xóa
                      </button>
                    </div>
                  </div>

                  {/* Tasks list */}
                  <div className="space-y-2 mb-3">
                    {catTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-2xl px-3 py-2.5"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate block">
                            {task.name}
                          </span>
                          {task.note && (
                            <span className="text-[9px] text-slate-400 truncate block">
                              {task.note}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-black text-slate-800 dark:text-white shrink-0 mr-1">
                          {formatVND(task.amount)}
                        </span>
                        <button
                          onClick={() => {
                            setEditTaskId(task.id);
                            setTaskName(task.name);
                            setTaskAmount(numFmt(String(task.amount)));
                            setTaskNote(task.note);
                            setShowTaskForm(cat.id);
                          }}
                          title="Sửa khoản chi"
                          className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-slate-500 hover:text-blue-600 cursor-pointer shrink-0 transition-all"
                        >
                          <Icon path={mdiPencil} size={0.6} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          title="Xóa khoản chi"
                          className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 text-rose-400 hover:text-rose-600 cursor-pointer shrink-0 transition-all"
                        >
                          <Icon path={mdiTrashCanOutline} size={0.6} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add task form */}
                  {showTaskForm === cat.id ? (
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl p-3 space-y-2">
                      <input
                        type="text"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        placeholder="Tên khoản chi"
                        className="w-full bg-white dark:bg-slate-600 border border-slate-100 dark:border-slate-500 rounded-xl px-3 py-2 text-[10px] font-semibold outline-none dark:text-white"
                      />
                      <div onClick={() => setActiveKeypadField("taskAmount")} className="cursor-pointer group relative">
                        <input
                          type="text"
                          readOnly
                          value={taskAmount ? `${taskAmount} đ` : ""}
                          placeholder="Số tiền (Bàn phím số 🔢)"
                          className="w-full bg-white dark:bg-slate-600 border border-slate-100 dark:border-slate-500 rounded-xl px-3 py-2 text-[10px] font-bold outline-none dark:text-white cursor-pointer group-hover:border-blue-500 transition-colors"
                        />
                      </div>
                      <input
                        type="text"
                        value={taskNote}
                        onChange={(e) => setTaskNote(e.target.value)}
                        placeholder="Ghi chú (không bắt buộc)"
                        className="w-full bg-white dark:bg-slate-600 border border-slate-100 dark:border-slate-500 rounded-xl px-3 py-2 text-[10px] font-semibold outline-none dark:text-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setShowTaskForm(null);
                            setEditTaskId(null);
                            setTaskName("");
                            setTaskAmount("");
                            setTaskNote("");
                          }}
                          className="text-[10px] text-slate-400 px-2 py-1 cursor-pointer font-bold"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleSaveTask(cat.id, cat.name)}
                          className="bg-slate-900 text-white text-[10px] font-black px-4 py-1.5 rounded-xl cursor-pointer hover:bg-slate-800"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setShowTaskForm(cat.id);
                        setEditTaskId(null);
                        setTaskName("");
                        setTaskAmount("");
                        setTaskNote("");
                      }}
                      className="w-full flex items-center justify-center gap-1 py-2 border border-dashed border-slate-200 dark:border-slate-600 rounded-2xl text-[10px] font-bold text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                    >
                      <Icon path={mdiPlus} size={0.667} />
                      Thêm khoản chi
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BÁO CÁO ĐỐI CHIẾU CHI TIÊU CỐ ĐỊNH (Dự kiến vs Thực tế) */}
      {fixedCats.length > 0 && (
        <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[28px] p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
              📊 Đối Chiếu Chi Tiêu Cố Định
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              So sánh mức thiết lập cố định định kỳ với Sổ Cái thực tế (Tháng{" "}
              {fixedMonth})
            </p>
          </div>

          <div className="space-y-4">
            {fixedCats.map((cat) => {
              const catTasks = fixedTasks.filter(
                (t) => t.categoryId === cat.id,
              );
              const projected = catTasks.reduce((s, t) => s + t.amount, 0);
              const actual = calcActualSpendForCategory(cat.name, fixedMonth);

              if (projected === 0 && actual === 0) return null;

              const diff = actual - projected;
              const maxVal = Math.max(projected, actual, 1);
              const projectedPct = (projected / maxVal) * 100;
              const actualPct = (actual / maxVal) * 100;

              return (
                <div
                  key={cat.id}
                  className="space-y-1.5 pb-2 border-b border-slate-50 dark:border-slate-700/50 last:border-b-0"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-700 dark:text-slate-200">
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {diff > 0 ? (
                        <span className="text-[9px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded-full font-bold">
                          Vượt chi +{formatVND(diff)}
                        </span>
                      ) : diff < 0 ? (
                        <span className="text-[9px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-full font-bold">
                          Tiết kiệm {formatVND(diff)}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 rounded-full font-bold">
                          Khớp dự kiến
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {/* Thanh dự kiến */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-400 font-semibold w-12 shrink-0">
                        Dự kiến:
                      </span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-400 dark:bg-slate-500 rounded-full transition-all"
                          style={{ width: `${projectedPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold w-12 text-right">
                        {formatVND(projected)}
                      </span>
                    </div>

                    {/* Thanh thực tế */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-400 font-semibold w-12 shrink-0">
                        Thực tế:
                      </span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${diff > 0 ? "bg-rose-500" : "bg-emerald-500"}`}
                          style={{ width: `${actualPct}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-black w-12 text-right ${diff > 0 ? "text-rose-500" : "text-emerald-600"}`}
                      >
                        {formatVND(actual)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 pb-10 min-w-0">
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[20px] p-1 shadow-sm">
        {[
          {
            key: "debts" as ViewTab,
            label: "Nợ",
            icon: mdiChartTimelineVariant,
          },
          { key: "salary" as ViewTab, label: "Lương", icon: mdiCalendarCheck },
          {
            key: "fixed" as ViewTab,
            label: "Cố định",
            icon: mdiFormatListBulletedSquare,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${activeTab === tab.key ? "bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            <Icon path={tab.icon} size={0.75} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "debts" && renderDebtDashboard()}
          {activeTab === "salary" && renderSalary()}
          {activeTab === "fixed" && renderFixed()}
        </motion.div>
      </AnimatePresence>

      {/* Payment modal portal */}
      {createPortal(
        <AnimatePresence>
          {paymentDebtId &&
            (() => {
              const debt = debts.find((d) => d.id === paymentDebtId);
              if (!debt) return null;
              const unpaid = debt.installments.filter(
                (i) => i.status === "pending" || i.status === "partial",
              );
              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 overflow-hidden z-50 bg-slate-900/40 backdrop-blur-md flex items-end justify-center"
                  onClick={() => setPaymentDebtId(null)}
                >
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    drag="y"
                    dragControls={dragControlsPayment}
                    dragListener={false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 0.5 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.y > 60 || info.velocity.y > 200) {
                        setPaymentDebtId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] max-h-[80vh] flex flex-col overflow-hidden shadow-[0_-12px_48px_rgba(0,0,0,0.12)]"
                  >
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        dragControlsPayment.start(e);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      style={{ touchAction: "none" }}
                      className="w-full pt-4 pb-3 px-6 cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
                    >
                      <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-800 dark:text-white">
                            Thanh toán
                          </h3>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                            {debt.name} — {formatVND(debt.currentBalance)} còn
                            lại
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-2">
                      <div className="space-y-2 mb-5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Chọn kỳ thanh toán
                        </p>
                        {unpaid.map((inst) => (
                          <label
                            key={inst.index}
                            className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:border-slate-200"
                          >
                            <input
                              type="checkbox"
                              checked={selectedInstallments.includes(
                                inst.index,
                              )}
                              onChange={() =>
                                setSelectedInstallments((prev) =>
                                  prev.includes(inst.index)
                                    ? prev.filter((i) => i !== inst.index)
                                    : [...prev, inst.index],
                                )
                              }
                              className="w-4 h-4 rounded border-slate-300 focus:ring-slate-900"
                            />
                            <div className="flex-1 flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                  Kỳ {inst.index + 1}
                                </span>
                                <span className="text-[9px] text-slate-400 ml-2">
                                  Hạn: {inst.dueDate ? inst.dueDate.split('-').reverse().join('/') : '—'}
                                </span>
                              </div>
                              <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                                {formatVND(inst.amount)}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                      <div className="mb-5 space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Ghi chú
                        </label>
                        <input
                          type="text"
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          placeholder="VD: Chuyển khoản ACB..."
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[16px] px-4 py-2.5 text-sm font-semibold outline-none dark:text-white"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 mb-5">
                        <span className="text-xs font-semibold text-slate-500">
                          Tổng thanh toán:
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {formatVND(
                            selectedInstallments.reduce((s, idx) => {
                              const inst = debt.installments.find(
                                (i) => i.index === idx,
                              );
                              return s + (inst?.amount || 0);
                            }, 0),
                          )}
                        </span>
                      </div>
                      <button
                        onClick={handlePaySubmit}
                        disabled={selectedInstallments.length === 0}
                        className="w-full bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 font-black text-sm py-4 rounded-[20px] hover:opacity-90 disabled:opacity-40 cursor-pointer transition-all shadow-md"
                      >
                        Xác nhận thanh toán {selectedInstallments.length} kỳ
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })()}
        </AnimatePresence>,
        document.body,
      )}

      {/* Add / Edit Debt Modal Portal */}
      {createPortal(
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 overflow-hidden z-50 bg-slate-900/40 backdrop-blur-md flex items-end justify-center"
              onClick={resetDebtForm}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                drag="y"
                dragControls={dragControlsDebt}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 60 || info.velocity.y > 200) {
                    resetDebtForm();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] max-h-[90vh] flex flex-col overflow-hidden shadow-[0_-12px_48px_rgba(0,0,0,0.18)]"
              >
                {/* Header with Drag Handle */}
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    dragControlsDebt.start(e);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  style={{ touchAction: "none" }}
                  className="w-full pt-4 pb-3 px-6 cursor-grab active:cursor-grabbing touch-none select-none shrink-0 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                      {editDebtId ? "Sửa khoản nợ" : "Thêm khoản nợ mới"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Quản lý chi tiết khoản nợ & lịch thanh toán
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetDebtForm}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Icon path={mdiClose} size={0.75} />
                  </button>
                </div>

                {/* Form Content */}
                <form
                  onSubmit={handleCreateDebt}
                  className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-4 space-y-4"
                >
                  {/* Debt Type Selector */}
                  <div className="grid grid-cols-3 gap-2">
                    {(["installment", "credit_card", "friend"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDebtType(t)}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          debtType === t
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {t === "installment"
                          ? "Trả góp"
                          : t === "credit_card"
                            ? "Thẻ TD"
                            : "Bạn bè"}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {/* Tên khoản nợ */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">
                        Tên khoản nợ
                      </label>
                      <input
                        type="text"
                        required
                        value={debtName}
                        onChange={(e) => setDebtName(e.target.value)}
                        placeholder="VD: Home Credit, Thẻ VIB..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl px-3.5 py-3 outline-none dark:text-white focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Tổng nợ (VND) - Opens Keypad */}
                      <div
                        onClick={() => setActiveKeypadField("originalAmount")}
                        className="cursor-pointer group"
                      >
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1 flex items-center justify-between">
                          <span>Tổng nợ (VND)</span>
                          <span className="text-[8px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                            Bàn phím số 🔢
                          </span>
                        </label>
                        <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl px-3.5 py-3 text-slate-800 dark:text-white group-hover:border-blue-500 transition-colors flex items-center justify-between">
                          <span>{originalAmount || "0"}</span>
                          <span className="text-[10px] text-slate-400 font-medium">VND</span>
                        </div>
                      </div>

                      {/* Trả mỗi kỳ (VND) - Opens Keypad */}
                      <div
                        onClick={() => setActiveKeypadField("monthlyPayment")}
                        className="cursor-pointer group"
                      >
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1 flex items-center justify-between">
                          <span>Trả mỗi kỳ (VND)</span>
                          <span className="text-[8px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                            Bàn phím số 🔢
                          </span>
                        </label>
                        <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl px-3.5 py-3 text-slate-800 dark:text-white group-hover:border-blue-500 transition-colors flex items-center justify-between">
                          <span>{monthlyPayment || "0"}</span>
                          <span className="text-[10px] text-slate-400 font-medium">VND</span>
                        </div>
                      </div>

                      {/* Tổng số kỳ - Opens Keypad */}
                      <div
                        onClick={() => setActiveKeypadField("totalInstallments")}
                        className="cursor-pointer group"
                      >
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1 flex items-center justify-between">
                          <span>Tổng số kỳ</span>
                          <span className="text-[8px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                            Bàn phím số 🔢
                          </span>
                        </label>
                        <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl px-3.5 py-3 text-slate-800 dark:text-white group-hover:border-blue-500 transition-colors flex items-center justify-between">
                          <span>{totalInstallments || "1"}</span>
                          <span className="text-[10px] text-slate-400 font-medium">Tháng</span>
                        </div>
                      </div>

                      {/* Ngày đến hạn (hàng tháng) - Opens Keypad */}
                      <div
                        onClick={() => setActiveKeypadField("paymentDay")}
                        className="cursor-pointer group"
                      >
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1 flex items-center justify-between">
                          <span>Hạn đóng (Ngày)</span>
                          <span className="text-[8px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                            Bàn phím số 🔢
                          </span>
                        </label>
                        <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl px-3.5 py-3 text-slate-800 dark:text-white group-hover:border-blue-500 transition-colors flex items-center justify-between">
                          <span>Hàng tháng: Ngày {paymentDay || "5"}</span>
                        </div>
                      </div>

                      {/* Lãi suất (%) (Tự động) */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1 flex items-center justify-between">
                          <span>Lãi suất (%)</span>
                          <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">Tự động</span>
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={computedInterestRate > 0 ? `${computedInterestRate}%` : "0%"}
                          className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-black rounded-xl px-3.5 py-3 text-slate-700 dark:text-slate-200 cursor-not-allowed"
                        />
                      </div>

                      {/* Tiền lãi (VND) (Tự động) */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1 flex items-center justify-between">
                          <span>Tiền lãi (VND)</span>
                          <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">Tự động</span>
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={computedInterestAmount > 0 ? `+${numFmt(String(computedInterestAmount))}` : "0đ"}
                          className={`w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-black rounded-xl px-3.5 py-3 cursor-not-allowed ${computedInterestAmount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-200"}`}
                        />
                      </div>

                      {/* Đã trả (kỳ) - Opens Keypad */}
                      <div
                        onClick={() => setActiveKeypadField("paidInstallments")}
                        className="cursor-pointer group col-span-2"
                      >
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1 flex items-center justify-between">
                          <span>Đã trả trước đó (kỳ)</span>
                          <span className="text-[8px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                            Bàn phím số 🔢
                          </span>
                        </label>
                        <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl px-3.5 py-3 text-slate-800 dark:text-white group-hover:border-blue-500 transition-colors flex items-center justify-between">
                          <span>Đã trả: {paidInstallments || "0"} / {totalInstallments || "1"} kỳ</span>
                        </div>
                      </div>

                      {/* Ngày bắt đầu */}
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">
                          Ngày bắt đầu vay
                        </label>
                        <input
                          type="date"
                          required
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl px-3.5 py-2.5 outline-none dark:text-white"
                        />
                      </div>

                      {/* Ghi chú */}
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">
                          Ghi chú
                        </label>
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="VD: Lãi suất 1.5%/tháng"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl px-3.5 py-3 outline-none dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Interest & Installment Schedule Previews */}
                  {(() => {
                    const rawAmt = parseInt(originalAmount.replace(/\D/g, "")) || 0;
                    const rawMonthly = parseInt(monthlyPayment.replace(/\D/g, "")) || 0;
                    const totalInst = parseInt(totalInstallments) || 0;
                    const paidInst = parseInt(paidInstallments) || 0;
                    const day = parseInt(paymentDay) || 12;
                    const totalPay = rawMonthly * totalInst;
                    const interestAmt = totalPay - rawAmt;
                    const hasAmount = rawAmt > 0 && totalInst > 0;
                    if (!hasAmount) return null;

                    const tempInsts = generateDebtInstallments(
                      rawAmt,
                      rawMonthly,
                      totalInst,
                      paidInst,
                      startDate,
                      day
                    );
                    const firstDueDate = tempInsts[0]?.dueDate;
                    const lastDueDate = tempInsts[tempInsts.length - 1]?.dueDate;

                    const fmtDate = (dStr?: string) => {
                      if (!dStr) return "—";
                      const p = dStr.split("-");
                      return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dStr;
                    };

                    return (
                      <div className="space-y-2 pt-1">
                        {rawMonthly > 0 && (
                          <div className="text-[10px] bg-slate-100 dark:bg-slate-800/80 rounded-xl p-3 flex items-center justify-between text-slate-600 dark:text-slate-300 font-semibold border border-slate-200/60 dark:border-slate-700">
                            <span>Tổng phải trả: <strong className="text-slate-900 dark:text-white font-extrabold">{formatVND(totalPay)}</strong></span>
                            <span>Lãi tự động: <strong className={interestAmt > 0 ? "text-rose-500 dark:text-rose-400 font-black" : "text-emerald-600 font-bold"}>{interestAmt > 0 ? `+${formatVND(interestAmt)} (${computedInterestRate}%)` : "0% (Không lãi)"}</strong></span>
                          </div>
                        )}

                        {startDate && day > 0 && (
                          <div className="text-[10px] bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl p-3 space-y-1">
                            <div className="flex items-center justify-between font-bold text-blue-900 dark:text-blue-200">
                              <span>Kỳ 1 ({paidInst > 0 ? "Đã trả" : "Hạn đóng"}): <strong className="text-blue-700 dark:text-blue-300">{fmtDate(firstDueDate)}</strong></span>
                              <span>Tất toán: <strong className="text-blue-700 dark:text-blue-300">{fmtDate(lastDueDate)}</strong></span>
                            </div>
                            <p className="text-[9px] text-blue-700/80 dark:text-blue-300/80 leading-normal">
                              💡 Hạn ngày {day} hàng tháng {"->"} Kỳ 1: {fmtDate(firstDueDate)}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={resetDebtForm}
                      className="px-4 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-black uppercase tracking-wider px-6 py-3 rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-md"
                    >
                      {editDebtId ? "Cập nhật khoản nợ" : "Lưu khoản nợ"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Numeric Keypad Bottom Sheet Portal */}
      {createPortal(
        <AnimatePresence>
          {activeKeypadField && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 overflow-hidden z-[99999] bg-slate-900/50 backdrop-blur-sm flex items-end justify-center"
              onClick={() => setActiveKeypadField(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 240 }}
                onClick={(e) => e.stopPropagation()}
                className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] p-5 shadow-2xl flex flex-col space-y-4 border-t border-slate-200 dark:border-slate-800 z-[99999]"
              >
                {/* Drag pill & Header */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                      BÀN PHÍM SỐ
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-1">
                      {activeKeypadField === "originalAmount"
                        ? "Tổng nợ ban đầu (VND)"
                        : activeKeypadField === "monthlyPayment"
                          ? "Số tiền trả mỗi kỳ (VND)"
                          : activeKeypadField === "totalInstallments"
                            ? "Tổng số kỳ trả (Tháng)"
                            : activeKeypadField === "paymentDay"
                              ? "Ngày đến hạn (Hàng tháng)"
                              : activeKeypadField === "paidInstallments"
                                ? "Số kỳ đã trả trước đó"
                                : activeKeypadField === "grossSalary"
                                  ? "Lương Gross (VND)"
                                  : activeKeypadField === "netSalary"
                                    ? "Lương thực nhận (VND)"
                                    : activeKeypadField === "receiveDay"
                                      ? "Ngày nhận lương hàng tháng"
                                      : activeKeypadField === "workDays"
                                        ? "Số ngày công trong tháng"
                                        : "Số tiền khoản chi (VND)"}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveKeypadField(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Icon path={mdiClose} size={0.75} />
                  </button>
                </div>

                {/* Display Value Box */}
                <div className="bg-slate-50 dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Giá trị hiện tại
                    </span>
                    <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate block">
                      {activeKeypadField === "originalAmount"
                        ? originalAmount ? `${originalAmount} đ` : "0 đ"
                        : activeKeypadField === "monthlyPayment"
                          ? monthlyPayment ? `${monthlyPayment} đ` : "0 đ"
                          : activeKeypadField === "totalInstallments"
                            ? `${totalInstallments || "1"} kỳ`
                            : activeKeypadField === "paymentDay"
                              ? `Ngày ${paymentDay || "5"} hàng tháng`
                              : activeKeypadField === "paidInstallments"
                                ? `${paidInstallments || "0"} kỳ`
                                : activeKeypadField === "grossSalary"
                                  ? grossSalary ? `${grossSalary} đ` : "0 đ"
                                  : activeKeypadField === "netSalary"
                                    ? netSalary ? `${netSalary} đ` : "0 đ"
                                    : activeKeypadField === "receiveDay"
                                      ? `Ngày ${receiveDay || "1"}`
                                      : activeKeypadField === "workDays"
                                        ? `${workDays || "26"} ngày`
                                        : taskAmount ? `${taskAmount} đ` : "0 đ"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("C")}
                    className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Xóa hết
                  </button>
                </div>

                {/* Quick Presets Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {activeKeypadField === "originalAmount" && (
                    <>
                      {[
                        { label: "+1tr", val: 1000000 },
                        { label: "+5tr", val: 5000000 },
                        { label: "+10tr", val: 10000000 },
                        { label: "+50tr", val: 50000000 },
                        { label: "10tr", val: "10000000" },
                        { label: "30tr", val: "30000000" },
                        { label: "50tr", val: "50000000" },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleKeypadPreset(p.val)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </>
                  )}
                  {activeKeypadField === "monthlyPayment" && (
                    <>
                      {[
                        { label: "+500k", val: 500000 },
                        { label: "+1tr", val: 1000000 },
                        { label: "+2tr", val: 2000000 },
                        { label: "+5tr", val: 5000000 },
                        { label: "1tr", val: "1000000" },
                        { label: "2tr", val: "2000000" },
                        { label: "5tr", val: "5000000" },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleKeypadPreset(p.val)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </>
                  )}
                  {(activeKeypadField === "grossSalary" || activeKeypadField === "netSalary") && (
                    <>
                      {[
                        { label: "+1tr", val: 1000000 },
                        { label: "+2tr", val: 2000000 },
                        { label: "+5tr", val: 5000000 },
                        { label: "10tr", val: "10000000" },
                        { label: "15tr", val: "15000000" },
                        { label: "20tr", val: "20000000" },
                        { label: "30tr", val: "30000000" },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleKeypadPreset(p.val)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </>
                  )}
                  {activeKeypadField === "taskAmount" && (
                    <>
                      {[
                        { label: "+50k", val: 50000 },
                        { label: "+100k", val: 100000 },
                        { label: "+500k", val: 500000 },
                        { label: "+1tr", val: 1000000 },
                        { label: "100k", val: "100000" },
                        { label: "500k", val: "500000" },
                        { label: "1tr", val: "1000000" },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleKeypadPreset(p.val)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </>
                  )}
                  {activeKeypadField === "totalInstallments" && (
                    <>
                      {[3, 6, 12, 18, 24, 36, 48, 60].map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleKeypadPreset(k)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer transition-colors"
                        >
                          {k} kỳ
                        </button>
                      ))}
                    </>
                  )}
                  {activeKeypadField === "paymentDay" && (
                    <>
                      {[1, 5, 10, 12, 15, 20, 25, 28, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleKeypadPreset(d)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer transition-colors"
                        >
                          Ngày {d}
                        </button>
                      ))}
                    </>
                  )}
                  {(activeKeypadField === "receiveDay" || activeKeypadField === "workDays") && (
                    <>
                      {[1, 5, 10, 15, 20, 25, 26, 28, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleKeypadPreset(d)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer transition-colors"
                        >
                          {activeKeypadField === "receiveDay" ? `Ngày ${d}` : `${d} ngày`}
                        </button>
                      ))}
                    </>
                  )}
                  {activeKeypadField === "paidInstallments" && (
                    <>
                      {[0, 1, 2, 3, 5, 6, 10, 12].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleKeypadPreset(p)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer transition-colors"
                        >
                          {p} kỳ
                        </button>
                      ))}
                    </>
                  )}
                </div>

                {/* 3x4 Keypad Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-lg font-black text-slate-800 dark:text-white transition-all cursor-pointer shadow-sm flex items-center justify-center"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("C")}
                    className="h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 active:scale-95 text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center"
                  >
                    C
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("0")}
                    className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-lg font-black text-slate-800 dark:text-white transition-all cursor-pointer shadow-sm flex items-center justify-center"
                  >
                    0
                  </button>
                  {activeKeypadField === "originalAmount" || activeKeypadField === "monthlyPayment" || activeKeypadField === "grossSalary" || activeKeypadField === "netSalary" || activeKeypadField === "taskAmount" ? (
                    <button
                      type="button"
                      onClick={() => handleKeypadPress("000")}
                      className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-sm font-black text-slate-800 dark:text-white transition-all cursor-pointer shadow-sm flex items-center justify-center"
                    >
                      000
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleKeypadPress("BACK")}
                      className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-sm font-black text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center justify-center"
                    >
                      ⌫
                    </button>
                  )}
                  {(activeKeypadField === "originalAmount" || activeKeypadField === "monthlyPayment" || activeKeypadField === "grossSalary" || activeKeypadField === "netSalary" || activeKeypadField === "taskAmount") && (
                    <button
                      type="button"
                      onClick={() => handleKeypadPress("BACK")}
                      className="col-span-3 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-sm font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center justify-center gap-1 mt-1"
                    >
                      <span>⌫ Xóa ký tự cuối</span>
                    </button>
                  )}
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  onClick={() => setActiveKeypadField(null)}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl hover:opacity-90 transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Icon path={mdiCheck} size={0.875} />
                  <span>Xác nhận</span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
