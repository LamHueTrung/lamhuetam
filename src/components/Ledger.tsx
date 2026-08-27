import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@mdi/react";
import {
  mdiMagnify,
  mdiTune,
  mdiPlusCircle,
  mdiMinusCircleOutline,
  mdiTagOutline,
  mdiDeleteOutline,
  mdiChevronLeft,
  mdiChevronRight,
  mdiWallet,
  mdiDotsHorizontal,
  mdiPencilOutline,
  mdiInformationOutline,
  mdiBank,
  mdiCash,
  mdiWalletOutline,
  mdiClose,
  mdiAlertCircleOutline,
  mdiShieldAlertOutline,
} from "@mdi/js";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import { Transaction, Category, MLAnomalyItem } from "../types";
import { api } from "../api/client";
import { iconMap } from "../lib/iconMap";
import EditTransactionModal from "./EditTransactionModal";
import { getLocalDateString } from "../utils/date";
import toast from "react-hot-toast";

interface LedgerProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;

  onUpdateTransaction: (id: string, data: Partial<Transaction>) => void;
  categories: Category[];
  onOpenCategoryManager?: () => void;
}

const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function getDateLabel(dateStr: string) {
  const today = getLocalDateString();
  const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
  if (dateStr === today) return "Hôm nay";
  if (dateStr === yesterday) return "Hôm qua";
  const d = new Date(dateStr + "T00:00:00");
  const dayNames = [
    "Chủ nhật",
    "Thứ hai",
    "Thứ ba",
    "Thứ tư",
    "Thứ năm",
    "Thứ sáu",
    "Thứ bảy",
  ];
  return `${dayNames[d.getDay()]}, ${d.getDate()} Tháng ${d.getMonth() + 1}`;
}

function formatCurrency(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "tr";
  if (num >= 1000) return (num / 1000).toFixed(0) + "k";
  return num.toString();
}

function formatVND(num: number) {
  const valueInK = Math.round(num / 1000);
  return new Intl.NumberFormat("vi-VN").format(valueInK) + "k";
}

export default function Ledger({
  transactions,
  onDeleteTransaction,
  onUpdateTransaction,
  categories,
  onOpenCategoryManager,
}: LedgerProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [walletFilter, setWalletFilter] = useState<
    "all" | "Ngân hàng" | "Tiền mặt" | "Ví điện tử"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [detailTransaction, setDetailTransaction] =
    useState<Transaction | null>(null);
  const [moreActionTx, setMoreActionTx] = useState<Transaction | null>(null);
  const dragControlsAction = useDragControls();
  const dragControlsDetail = useDragControls();

  // ── ML Anomalies State ──
  const [anomalies, setAnomalies] = useState<MLAnomalyItem[]>([]);

  const anomalyMap = useMemo(() => {
    const map = new Map<string, MLAnomalyItem>();
    anomalies.forEach((a) => map.set(a.id, a));
    return map;
  }, [anomalies]);

  const markAnomalySeen = useCallback((id: string) => {
    try {
      const stored = localStorage.getItem("seen_anomaly_tx_ids");
      const current: string[] = stored ? JSON.parse(stored) : [];
      if (!current.includes(id)) {
        const updated = [...current, id];
        localStorage.setItem("seen_anomaly_tx_ids", JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleOpenDetail = useCallback((tx: Transaction) => {
    if (anomalyMap.has(tx.id)) {
      markAnomalySeen(tx.id);
    }
    setDetailTransaction(tx);
  }, [anomalyMap, markAnomalySeen]);

  const fetchAnomalies = useCallback(async () => {
    if (!transactions || transactions.length === 0) return;
    try {
      const resp = await api.ml.anomalies({
        transactions: transactions.map((t) => ({
          id: t.id,
          date: t.date,
          type: t.type,
          amount: t.amount,
          category: t.category,
          description: t.description || "",
        })),
        contamination: 0.05,
      });
      if (resp && Array.isArray(resp.anomalies)) {
        setAnomalies(resp.anomalies);

        // Kiểm tra chi tiêu bất thường chưa xem để hiển thị Toast
        try {
          const stored = localStorage.getItem("seen_anomaly_tx_ids");
          const seenIds: string[] = stored ? JSON.parse(stored) : [];
          const unseen = resp.anomalies.filter((a: MLAnomalyItem) => !seenIds.includes(a.id));

          if (unseen.length > 0) {
            const topAnomaly = unseen[0];
            const topTx = transactions.find((t) => t.id === topAnomaly.id);

            toast.custom(
              (t) => (
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDragEnd={(_, info) => {
                    if (Math.abs(info.offset.x) > 40 || Math.abs(info.velocity.x) > 200) {
                      toast.dismiss(t.id);
                    }
                  }}
                  animate={{
                    opacity: t.visible ? 1 : 0,
                    scale: t.visible ? 1 : 0.9,
                  }}
                  transition={{ duration: 0.15 }}
                  style={{
                    touchAction: "pan-y",
                    cursor: "grab",
                  }}
                  onClick={() => {
                    toast.dismiss(t.id);
                    // Đánh dấu tất cả các anomaly hiện tại là đã xem
                    const updated = Array.from(new Set([...seenIds, ...unseen.map((a: MLAnomalyItem) => a.id)]));
                    localStorage.setItem("seen_anomaly_tx_ids", JSON.stringify(updated));
                    if (topTx) {
                      if (topTx.date) setSelectedDate(topTx.date);
                      setDetailTransaction(topTx);
                    }
                  }}
                  className="max-w-sm w-full bg-white dark:bg-slate-800 shadow-xl rounded-2xl pointer-events-auto flex ring-1 ring-rose-500/30 p-3.5 items-center gap-3 cursor-pointer active:scale-98 transition-all border border-rose-100 dark:border-rose-900/50 select-none active:cursor-grabbing"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center shrink-0">
                    <Icon path={mdiShieldAlertOutline} size={0.9} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                      Phát hiện {unseen.length} chi tiêu bất thường
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {topTx ? `${topTx.description} (${formatCurrency(topTx.amount)})` : "Nhấn để kiểm tra chi tiết"}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg shrink-0">
                    Xem ngay
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.dismiss(t.id);
                    }}
                    className="p-1 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all shrink-0 cursor-pointer"
                    title="Đóng thông báo"
                    aria-label="Đóng thông báo"
                  >
                    <Icon path={mdiClose} size={0.65} />
                  </button>
                </motion.div>
              ),
              { duration: 6000, id: "anomaly-toast" }
            );
          }
        } catch (err) {
          console.warn("[Ledger] Anomaly toast error:", err);
        }
      }
    } catch (e) {
      console.warn("[Ledger] ML Anomaly detection fetch error:", e);
    }
  }, [transactions]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);


  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const todayStr = getLocalDateString(today);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const makeDateStr = (day: number) =>
    `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;

  const txsForDay = (day: number) => {
    const dateStr = makeDateStr(day);
    return transactions.filter((t) => t.date === dateStr);
  };

  const dayTotals = (day: number) => {
    const txs = txsForDay(day);
    const income = txs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expense = txs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  };

  const monthPrefix = `${currentYear}-${pad(currentMonth + 1)}`;
  const dateFilteredTxs = selectedDate
    ? transactions.filter((t) => t.date === selectedDate)
    : transactions.filter((t) => t.date.startsWith(monthPrefix));

  const selectedTxs = dateFilteredTxs
    .filter((t) => {
      if (filter === "income") return t.type === "income";
      if (filter === "expense") return t.type === "expense";
      return true;
    })
    .filter((t) => {
      if (walletFilter === "all") return true;
      return t.wallet === walletFilter;
    })
    .filter((t) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.wallet && t.wallet.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const selectedIncome = selectedTxs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const selectedExpense = selectedTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const monthName = firstDayOfMonth.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4 pb-40 min-w-0 max-w-full">
      <div>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
          LỊCH SỬ GIAO DỊCH
        </span>
      </div>

      <div className="flex items-center justify-between bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[24px] px-5 py-3 shadow-sm">
        <button
          onClick={prevMonth}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all"
        >
          <Icon path={mdiChevronLeft} size={1.25} />
        </button>
        <span className="text-sm font-bold text-slate-800 dark:text-white">{monthName}</span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all"
        >
          <Icon path={mdiChevronRight} size={1.25} />
        </button>
      </div>

      <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[24px] p-3 shadow-sm">
        <div className="grid grid-cols-7 mb-1">
          {dayNames.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1.5"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square p-1" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = makeDateStr(day);
            const { income, expense } = dayTotals(day);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const hasAnomaly = transactions.some(
              (t) => t.date === dateStr && anomalyMap.has(t.id)
            );

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`relative aspect-square p-1 rounded-[14px] flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.15)] scale-105"
                    : isToday
                      ? "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }`}
              >
                {/* Dot marker khi có giao dịch bất thường */}
                {hasAnomaly && (
                  <span
                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500 ring-1 ring-white dark:ring-slate-800 shadow-xs"
                    title="Có chi tiêu bất thường"
                  />
                )}
                <span
                  className={`text-[13px] font-bold leading-tight ${
                    isSelected
                      ? "text-white dark:text-slate-900"
                      : isToday
                        ? "text-slate-900 dark:text-white font-extrabold"
                        : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {day}
                </span>
                {income > 0 && (
                  <span
                    className={`text-[8px] font-bold leading-tight ${
                      isSelected
                        ? "text-emerald-300 dark:text-emerald-600"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    +{formatCurrency(income)}
                  </span>
                )}
                {expense > 0 && (
                  <span
                    className={`text-[8px] font-bold leading-tight ${
                      isSelected
                        ? "text-rose-300 dark:text-rose-600"
                        : "text-rose-500 dark:text-rose-400"
                    }`}
                  >
                    -{formatCurrency(expense)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SEARCH BAR & FILTERS */}
      <div className="space-y-2">
        <div className="relative">
          <Icon
            path={mdiMagnify}
            size={0.875}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm giao dịch, danh mục, ghi chú..."
            className="w-full pl-9 pr-9 py-2.5 bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-1 focus:ring-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
            >
              <Icon path={mdiClose} size={0.75} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none no-scrollbar no-swipe">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-[20px] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              filter === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-[0_6px_16px_rgba(15,23,42,0.15)]"
                : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <Icon path={mdiTune} size={0.875} />
            <span>Tất cả</span>
          </button>
          <button
            onClick={() => setFilter("income")}
            className={`px-4 py-2 rounded-[20px] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              filter === "income"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-[0_6px_16px_rgba(15,23,42,0.15)]"
                : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <Icon
              path={mdiPlusCircle}
              size={0.875}
              className="text-emerald-500"
            />
            <span>Khoản thu</span>
          </button>
          <button
            onClick={() => setFilter("expense")}
            className={`px-4 py-2 rounded-[20px] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              filter === "expense"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-[0_6px_16px_rgba(15,23,42,0.15)]"
                : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <Icon
              path={mdiMinusCircleOutline}
              size={0.875}
              className="text-rose-500"
            />
            <span>Khoản chi</span>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none no-scrollbar no-swipe">
          <button
            onClick={() => setWalletFilter("all")}
            title="Tất cả ví"
            className={`p-2.5 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              walletFilter === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.15)]"
                : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <Icon path={mdiWallet} size={0.875} />
          </button>
          <button
            onClick={() => setWalletFilter("Ngân hàng")}
            title="Ngân hàng"
            className={`p-2.5 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              walletFilter === "Ngân hàng"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.15)]"
                : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <Icon path={mdiBank} size={0.875} />
          </button>
          <button
            onClick={() => setWalletFilter("Tiền mặt")}
            title="Tiền mặt"
            className={`p-2.5 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              walletFilter === "Tiền mặt"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.15)]"
                : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <Icon path={mdiCash} size={0.875} />
          </button>
          <button
            onClick={() => setWalletFilter("Ví điện tử")}
            title="Ví điện tử"
            className={`p-2.5 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              walletFilter === "Ví điện tử"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.15)]"
                : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <Icon path={mdiWalletOutline} size={0.875} />
          </button>
        </div>
      </div>

      {/* TRANSACTION LIST SECTION */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              {selectedDate ? getDateLabel(selectedDate) : `Tất cả giao dịch ${monthName}`}
            </h3>
            {selectedDate ? (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md hover:underline cursor-pointer transition-colors"
              >
                ✕ Xem cả tháng
              </button>
            ) : (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md hover:underline cursor-pointer transition-colors"
              >
                Hôm nay
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold">
            {selectedIncome > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">
                +{formatVND(selectedIncome)}
              </span>
            )}
            {selectedExpense > 0 && (
              <span className="text-rose-500 dark:text-rose-400">
                -{formatVND(selectedExpense)}
              </span>
            )}
          </div>
        </div>

        {selectedTxs.length === 0 ? (
          <div className="bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-[28px] p-8 text-center text-slate-400 dark:text-slate-500">
            <Icon
              path={mdiTagOutline}
              size={2}
              className="mx-auto text-slate-300 dark:text-slate-600 mb-2"
            />
            <p className="text-sm font-semibold">Không có giao dịch nào</p>
          </div>
        ) : (
          <div className="space-y-[1px] bg-slate-100/50 dark:bg-slate-800/50 rounded-[20px] overflow-hidden border border-slate-100 dark:border-slate-800">
            <AnimatePresence initial={false}>
              {selectedTxs.map((transaction, idx) => {
                const getCategoryMeta = (catName: string) => {
                  const cat = categories.find((c) => c.name === catName);
                  const colorMap: Record<string, string> = {
                    red: "bg-red-100/80 dark:bg-red-950/50 text-red-700 dark:text-red-400",
                    amber: "bg-amber-100/80 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400",
                    blue: "bg-blue-100/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400",
                    teal: "bg-teal-100/80 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400",
                    emerald: "bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
                    slate: "bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                    indigo: "bg-indigo-100/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400",
                    rose: "bg-rose-100/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400",
                    purple: "bg-purple-100/80 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400",
                    orange: "bg-orange-100/80 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400",
                  };
                  const iconKey = cat?.icon || "Tag";
                  const color = cat?.color || "slate";
                  const bgColor = colorMap[color] || colorMap.slate;
                  const IconComp = iconMap[iconKey];
                  return {
                    icon: IconComp,
                    bg: bgColor.split(" ")[0],
                    text: bgColor.split(" ")[1],
                  };
                };
                const {
                  icon: CatIcon,
                  bg,
                  text,
                } = getCategoryMeta(transaction.category);
                const isIncome = transaction.type === "income";

                return (
                  <div
                    key={transaction.id}
                    className="relative overflow-hidden"
                  >
                    <motion.div
                      onClick={() => handleOpenDetail(transaction)}
                      className={`bg-white dark:bg-slate-800 p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/60 transition-colors relative z-10 ${idx > 0 ? "border-t border-slate-50 dark:border-slate-700/50" : ""}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-full ${bg} ${text} flex items-center justify-center shrink-0`}
                        >
                          {CatIcon && <CatIcon className="w-5 h-5" />}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                              {transaction.description}
                            </h4>
                            {anomalyMap.get(transaction.id) && (
                              <span
                                className={`shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                  anomalyMap.get(transaction.id)?.severity === "critical"
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                                }`}
                              >
                                {anomalyMap.get(transaction.id)?.severity === "critical"
                                  ? "Đột biến"
                                  : "Bất thường"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            <span className="flex items-center gap-0.5">
                              <Icon path={mdiWallet} size={0.75} />
                              {transaction.wallet}
                            </span>
                            {!selectedDate && (
                              <span>• {transaction.date.split("-").reverse().join("/")}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span
                            className={`text-xs font-extrabold ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}
                          >
                            {isIncome ? "+" : "-"}
                            {formatVND(transaction.amount)}
                          </span>
                          <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                            {transaction.category}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMoreActionTx(transaction);
                          }}
                          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer shrink-0"
                        >
                          <Icon path={mdiDotsHorizontal} size={0.875} />
                        </button>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold italic">
        Chọn ngày trên lịch để xem chi tiết ngày đó, hoặc chọn "Xem cả tháng" để xem tất cả.
      </div>

      {/* ACTION SHEET - Edit / Delete */}
      {createPortal(
        <AnimatePresence>
          {moreActionTx && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreActionTx(null)}
              className="fixed inset-0 overflow-hidden z-50 bg-slate-900/40 backdrop-blur-md flex items-end justify-center"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                drag="y"
                dragControls={dragControlsAction}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 60 || info.velocity.y > 200) {
                    setMoreActionTx(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white rounded-t-[32px] p-6 pb-10 shadow-[0_-12px_48px_rgba(0,0,0,0.12)]"
              >
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    dragControlsAction.start(e);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  style={{ touchAction: "none" }}
                  className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 cursor-grab active:cursor-grabbing touch-none select-none"
                />
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800">Tùy chọn</h3>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setEditingTransaction(moreActionTx);
                      setMoreActionTx(null);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                      <Icon path={mdiPencilOutline} size={1} />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-slate-800 block">
                        Chỉnh sửa giao dịch
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Thay đổi thông tin giao dịch
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      onDeleteTransaction(moreActionTx.id);
                      setMoreActionTx(null);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                      <Icon path={mdiDeleteOutline} size={1} />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-rose-600 block">
                        Xóa giao dịch
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Không thể khôi phục sau khi xóa
                      </span>
                    </div>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* TRANSACTION DETAIL BOTTOM SHEET */}
      {createPortal(
        <AnimatePresence>
          {detailTransaction && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailTransaction(null)}
              className="fixed inset-0 overflow-hidden z-50 bg-slate-900/40 backdrop-blur-md flex items-end justify-center"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                drag="y"
                dragControls={dragControlsDetail}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 60 || info.velocity.y > 200) {
                    setDetailTransaction(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white rounded-t-[32px] p-6 pb-10 shadow-[0_-12px_48px_rgba(0,0,0,0.12)]"
              >
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    dragControlsDetail.start(e);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  style={{ touchAction: "none" }}
                  className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 cursor-grab active:cursor-grabbing touch-none select-none"
                />
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-slate-900 rounded-full" />
                    <h3 className="text-base font-bold text-slate-800">
                      Chi Tiết Giao Dịch
                    </h3>
                  </div>
                </div>

                {(() => {
                  const tx = detailTransaction;
                  const cat = categories.find((c) => c.name === tx.category);
                  const colorMap: Record<string, string> = {
                    red: "bg-red-100/80 text-red-700",
                    amber: "bg-amber-100/80 text-amber-700",
                    blue: "bg-blue-100/80 text-blue-700",
                    teal: "bg-teal-100/80 text-teal-700",
                    emerald: "bg-emerald-100/80 text-emerald-700",
                    slate: "bg-slate-100/80 text-slate-700",
                    indigo: "bg-indigo-100/80 text-indigo-700",
                    rose: "bg-rose-100/80 text-rose-700",
                    purple: "bg-purple-100/80 text-purple-700",
                    orange: "bg-orange-100/80 text-orange-700",
                  };
                  const color = cat?.color || "slate";
                  const IconComp = iconMap[cat?.icon || "Tag"];

                  return (
                    <div className="space-y-4">
                      {anomalyMap.get(tx.id) && (
                        <div className={`p-3 rounded-2xl border flex items-start gap-2.5 ${
                          anomalyMap.get(tx.id)?.severity === "critical"
                            ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300"
                            : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300"
                        }`}>
                          <Icon path={mdiShieldAlertOutline} size={0.9} className="shrink-0 mt-0.5 text-rose-500" />
                          <div className="text-xs">
                            <span className="font-bold block">
                              {anomalyMap.get(tx.id)?.severity === "critical"
                                ? "Cảnh báo: Giao dịch đột biến chi phí lớn"
                                : "Phát hiện: Giao dịch có dấu hiệu bất thường"}
                            </span>
                            <span className="text-[11px] opacity-80 mt-0.5 block">
                              Mô hình Isolation Forest phát hiện khoản chi này lệch chuẩn so với thói quen sinh hoạt thường ngày.
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="bg-slate-50 rounded-[24px] p-5 text-center">
                        <div
                          className={`w-14 h-14 rounded-full ${colorMap[color] || colorMap.slate} flex items-center justify-center mx-auto mb-3`}
                        >
                          <IconComp className="w-7 h-7" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">
                          {tx.description}
                        </h2>
                        <span
                          className={`text-2xl font-black mt-1 block ${tx.type === "income" ? "text-emerald-600" : "text-rose-500"}`}
                        >
                          {tx.type === "income" ? "+" : "-"}
                          {new Intl.NumberFormat("vi-VN").format(tx.amount)}₫
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-slate-50">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Danh mục
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {tx.category}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-50">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Ngày
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {getDateLabel(tx.date)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-50">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Ví
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {tx.wallet}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-50">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Loại
                          </span>
                          <span
                            className={`text-xs font-bold ${tx.type === "income" ? "text-emerald-600" : "text-rose-500"}`}
                          >
                            {tx.type === "income" ? "Khoản thu" : "Khoản chi"}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => {
                            setEditingTransaction(tx);
                            setDetailTransaction(null);
                          }}
                          className="flex-1 bg-slate-900 text-white font-bold text-xs py-3 rounded-xl hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Icon path={mdiPencilOutline} size={0.875} />
                          Chỉnh sửa
                        </button>
                        <button
                          onClick={() => {
                            onDeleteTransaction(tx.id);
                            setDetailTransaction(null);
                          }}
                          className="flex-1 bg-white border border-rose-100 text-rose-600 font-bold text-xs py-3 rounded-xl hover:bg-rose-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Icon path={mdiDeleteOutline} size={0.875} />
                          Xóa
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* EDIT TRANSACTION MODAL */}
      <EditTransactionModal
        isOpen={!!editingTransaction}
        transaction={editingTransaction}
        categories={categories}
        onClose={() => setEditingTransaction(null)}
        onUpdateTransaction={onUpdateTransaction}
        onOpenCategoryManager={onOpenCategoryManager}
      />
    </div>
  );
}
