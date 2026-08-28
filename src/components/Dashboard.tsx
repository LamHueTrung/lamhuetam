import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@mdi/react";
import {
  mdiWallet,
  mdiTrendingUp,
  mdiTrendingDown,
  mdiArrowDownBold,
  mdiArrowUpBold,
  mdiAlertCircleOutline,
  mdiChartTimelineVariant,
  mdiChevronRight,
  mdiShieldAlertOutline,
  mdiShieldCheckOutline,
  mdiCheckCircleOutline,
  mdiChartLine,
  mdiChartAreaspline,
  mdiChartBar,
  mdiAutoFix,
  mdiCreation,
  mdiLoading,
  mdiRefresh,
  mdiAccountCircle,
  mdiBriefcaseOutline,
  mdiMapMarkerOutline,
  mdiEyeOutline,
  mdiEyeOffOutline,
  mdiViewGridOutline,
  mdiClose,
  mdiReceiptTextOutline,
  mdiLayersOutline,
  mdiSwapHorizontal,
  mdiCalendarClockOutline,
  mdiFire,
} from "@mdi/js";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import {
  Transaction,
  DebtAccount,
  Category,
  Budget,
  SavingsGoal,
  UserProfile,
  MLForecastResponse,
} from "../types";
import { api } from "../api/client";
import { getLocalDateString } from "../utils/date";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts";
import Markdown from "react-markdown";
import { calcRemainingBalance, calcPaidPercent } from "../lib/debtUtils";
type Debt = DebtAccount;

interface DashboardProps {
  transactions: Transaction[];
  debts: Debt[];
  categories: Category[];
  budgets?: Budget[];
  savings?: SavingsGoal[];
  totalFixed?: number;
  onNavigateToTab: (tab: number) => void;
  username?: string;
  userProfile?: UserProfile;
}

export default function Dashboard({
  transactions,
  debts,
  categories,
  budgets = [],
  savings = [],
  totalFixed = 0,
  onNavigateToTab,
  username = "bạn",
  userProfile,
}: DashboardProps) {
  const formatVND = (num: number) => {
    if (!num || num === 0) return "0đ";
    if (Math.abs(num) < 1000) return num + "đ";
    const valueInK = Math.round(num / 1000);
    return new Intl.NumberFormat("vi-VN").format(valueInK) + "k";
  };

  const formatFullVND = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(num) + "đ";
  };

  // ── Tính toán tài chính theo tháng hiện tại ──
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const incomeThisMonth = transactions
    .filter((t) => t.type === "income" && t.date.startsWith(currentMonthStr))
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseThisMonth = transactions
    .filter((t) => t.type === "expense" && t.date.startsWith(currentMonthStr))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = incomeThisMonth;
  const totalExpense = expenseThisMonth;

  const totalPayablesMonthly = debts
    .filter((d) => d.status === "active")
    .reduce((sum, d) => sum + d.monthlyPayment, 0);

  const totalDebtBalance = debts
    .filter((d) => d.status === "active")
    .reduce((sum, d) => sum + calcRemainingBalance(d), 0);

  const totalReceivables = 0;

  // Dòng tiền khả dụng = Thu nhập tháng này - Chi tiêu tháng này - Tiền trả nợ định kỳ tháng này
  const availableCashflow =
    totalReceivables +
    incomeThisMonth -
    (totalPayablesMonthly + expenseThisMonth);

  const netDebt = totalDebtBalance - totalReceivables;

  const totalIncomeAllTime = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenseAllTime = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  // ── Cơ cấu chi tiêu tháng này: lấy Top 5, còn lại gộp thành "Khác" ──
  const thisMonthExpenses = transactions.filter(
    (t) => t.type === "expense" && t.date.startsWith(currentMonthStr),
  );

  // If this month has no expenses yet, fallback to all expenses to avoid empty chart
  const expenseTarget =
    thisMonthExpenses.length > 0
      ? thisMonthExpenses
      : transactions.filter((t) => t.type === "expense");

  const rawCatMap: Record<string, number> = {};
  expenseTarget.forEach((t) => {
    const cat = t.category?.trim() || "Khác";
    rawCatMap[cat] = (rawCatMap[cat] || 0) + t.amount;
  });

  const colorHexMap: Record<string, string> = {
    red: "#ef4444",
    amber: "#f59e0b",
    blue: "#3b82f6",
    teal: "#0d9488",
    emerald: "#10b981",
    slate: "#64748b",
    indigo: "#6366f1",
    rose: "#f43f5e",
    purple: "#8b5cf6",
    orange: "#f97316",
  };

  const getColor = (name: string) => {
    const cat = categories.find((c) => c.name === name);
    if (cat) return colorHexMap[cat.color] || "#EDF2F7";
    return "#EDF2F7";
  };

  // Sort categories by spent amount descending (exclude 'Khác' first to group properly)
  const sortedNonKhac = Object.entries(rawCatMap)
    .filter(([name, val]) => val > 0 && name !== "Khác")
    .sort((a, b) => b[1] - a[1]);

  const top5Pairs = sortedNonKhac.slice(0, 5);
  const remainingPairs = sortedNonKhac.slice(5);

  const otherAmount =
    (rawCatMap["Khác"] || 0) +
    remainingPairs.reduce((sum, [, val]) => sum + val, 0);

  const categoriesData = top5Pairs.map(([name, value]) => ({
    name,
    value,
    color: getColor(name),
  }));

  if (otherAmount > 0) {
    categoriesData.push({
      name: "Khác",
      value: otherAmount,
      color: "#EDF2F7",
    });
  }

  const categorySpentMap: Record<string, number> = {};
  categoriesData.forEach((c) => {
    categorySpentMap[c.name] = c.value;
  });

  const totalExpenseComputed = categoriesData.reduce(
    (sum, c) => sum + c.value,
    0,
  );

  const [trendRange, setTrendRange] = useState<
    "7d" | "30d" | "12m" | "forecast"
  >("30d");
  const [showAmounts, setShowAmounts] = useState(false);
  const [spendingTab, setSpendingTab] = useState<"expense" | "income">(
    "expense",
  );

  // ── ML Finance Forecasting Layer with Stale-While-Revalidate Cache ──
  const [mlForecast, setMlForecast] = useState<MLForecastResponse | null>(
    () => {
      try {
        const cached = localStorage.getItem("ml_forecast_cache");
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    },
  );
  const [mlForecastLoading, setMlForecastLoading] = useState(false);

  // Compute a signature based on transactions & debts count/checksum
  const txSignature = useMemo(() => {
    if (!transactions || transactions.length === 0) return "";
    const count = transactions.length;
    const debtCount = (debts || []).length;
    const recentSample = transactions
      .slice(-5)
      .map((t) => `${t.id}_${t.amount}_${t.date}`)
      .join("|");
    const totalAmount = transactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );
    return `c${count}_d${debtCount}_t${totalAmount}_${recentSample}`;
  }, [transactions, debts]);

  const fetchMlForecast = useCallback(async () => {
    if (!transactions || transactions.length === 0) return;

    // 1. Kiểm tra cache trong localStorage
    const cachedSignature = localStorage.getItem("ml_forecast_tx_sig");
    const cachedData = localStorage.getItem("ml_forecast_cache");

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setMlForecast(parsed);
        // Nếu dữ liệu thu chi không thay đổi -> dùng cache, không cần gọi API
        if (cachedSignature === txSignature) {
          return;
        }
      } catch (e) {
        console.warn("[Dashboard] Cache parse error:", e);
      }
    }

    // 2. Có dữ liệu thu chi mới -> Đã trả cache gần nhất ở trên, tiếp tục gọi API để cập nhật cache mới nhất
    setMlForecastLoading(true);
    try {
      const resp = await api.ml.forecast({
        transactions: transactions.map((t) => ({
          id: t.id,
          date: t.date,
          type: t.type,
          amount: t.amount,
          category: t.category,
          description: t.description || "",
        })),
        debts: debts.map((d) => ({
          _id: d.id,
          name: d.name,
          installments: d.installments,
        })),
        plot: false,
      });
      if (resp && resp.runway_analysis) {
        setMlForecast(resp as MLForecastResponse);
        localStorage.setItem("ml_forecast_cache", JSON.stringify(resp));
        localStorage.setItem("ml_forecast_tx_sig", txSignature);
      }
    } catch (err) {
      console.warn("[Dashboard] ML forecast fetch error:", err);
    } finally {
      setMlForecastLoading(false);
    }
  }, [transactions, debts, txSignature]);

  useEffect(() => {
    fetchMlForecast();
  }, [fetchMlForecast]);

  const trendData = useMemo(() => {
    const filtered = transactions.filter((t) => {
      const d = new Date(t.date);
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      if (trendRange === "7d") return diff <= 7;
      if (trendRange === "30d") return diff <= 30;
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      return d >= yearAgo;
    });

    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));

    const daysAgo = trendRange === "7d" ? 7 : trendRange === "30d" ? 30 : 365;
    const map: Record<
      string,
      { date: string; income: number; expense: number; balance: number }
    > = {};
    let runningBalance = 0;
    for (let i = daysAgo - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = getLocalDateString(d);
      // Get all transactions up to this date to calculate running balance
      const upToDate = sorted.filter((t) => t.date <= key);
      runningBalance = upToDate.reduce(
        (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
        0,
      );
      map[key] = { date: key, income: 0, expense: 0, balance: runningBalance };
    }
    // Reset per-day sums
    filtered.forEach((t) => {
      if (map[t.date]) {
        if (t.type === "income") map[t.date].income += t.amount;
        else map[t.date].expense += t.amount;
      }
    });
    return Object.values(map);
  }, [transactions, trendRange]);

  const topCategories = useMemo(() => {
    return Object.entries(categorySpentMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [transactions, categories]);

  const formatChartDate = (val: string) => {
    if (!val) return "";
    if (trendRange === "12m") {
      const d = new Date(val + "T00:00:00");
      return isNaN(d.getTime()) ? val : `T${d.getMonth() + 1}`;
    }
    const d = new Date(val + "T00:00:00");
    if (isNaN(d.getTime())) return val;
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const totalIncomeForecast = transactions
    .filter((t) => t.type === "income" && t.isRecurring)
    .reduce((s, t) => s + t.amount, 0);
  const avgIncome =
    transactions.filter((t) => t.type === "income").length > 0
      ? Math.round(
          transactions
            .filter((t) => t.type === "income")
            .reduce((s, t) => s + t.amount, 0) /
            Math.max(
              1,
              new Set(
                transactions
                  .filter((t) => t.type === "income")
                  .map((t) => t.date.slice(0, 7)),
              ).size,
            ),
        )
      : 0;
  // Sử dụng lại biến incomeThisMonth đã được tính toán ở phần đầu của component
  const remainingDaysInMonth =
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() -
    now.getDate();
  const daysPassed = now.getDate();
  const projectedIncome =
    incomeThisMonth +
    (remainingDaysInMonth > 0
      ? Math.round((incomeThisMonth / daysPassed) * remainingDaysInMonth)
      : 0);
  const budgetRemaining = 0; // placeholder

  const urgentDebts = debts
    .filter(
      (d) =>
        d.currentBalance > 0 &&
        d.installments.some((i) => i.status === "pending"),
    )
    .sort((a, b) => {
      const aNext = a.installments.find((i) => i.status === "pending");
      const bNext = b.installments.find((i) => i.status === "pending");
      if (!aNext || !bNext) return 0;
      return (
        new Date(aNext.dueDate).getTime() - new Date(bNext.dueDate).getTime()
      );
    });

  // ── Tính toán dữ liệu so sánh Tháng này vs Tháng trước (MoM Radar) ──
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const lastMonthExpenses = transactions.filter(
    (t) => t.type === "expense" && t.date.startsWith(lastMonthStr),
  );

  // State chọn danh mục trên Treemap để xem Drill-down giao dịch
  const [selectedHeatmapCategory, setSelectedHeatmapCategory] = useState<
    string | null
  >(null);
  const [showAllMoMCats, setShowAllMoMCats] = useState(false);
  const dragControlsCategory = useDragControls();

  const totalExpenseThisMonth = thisMonthExpenses.reduce(
    (sum, t) => sum + t.amount,
    0,
  );
  const totalExpenseLastMonth = lastMonthExpenses.reduce(
    (sum, t) => sum + t.amount,
    0,
  );

  // ── Tính toán dữ liệu Bản Đồ Nhiệt Cấu Trúc MoM (Treemap Heatmap) ──
  const momHeatmapData = useMemo(() => {
    if (thisMonthExpenses.length === 0 && lastMonthExpenses.length === 0)
      return [];

    const categoriesSet = new Set<string>();
    const thisMonthMap: Record<string, number> = {};
    const lastMonthMap: Record<string, number> = {};
    const txCountMap: Record<string, number> = {};

    thisMonthExpenses.forEach((t) => {
      const cat = t.category?.trim() || "Khác";
      categoriesSet.add(cat);
      thisMonthMap[cat] = (thisMonthMap[cat] || 0) + t.amount;
      txCountMap[cat] = (txCountMap[cat] || 0) + 1;
    });

    lastMonthExpenses.forEach((t) => {
      const cat = t.category?.trim() || "Khác";
      categoriesSet.add(cat);
      lastMonthMap[cat] = (lastMonthMap[cat] || 0) + t.amount;
    });

    const list = Array.from(categoriesSet).map((cat) => {
      const thisVal = thisMonthMap[cat] || 0;
      const lastVal = lastMonthMap[cat] || 0;
      const diff = thisVal - lastVal;
      let percentChange = 0;
      if (lastVal > 0) {
        percentChange = Math.round((diff / lastVal) * 100);
      } else if (thisVal > 0) {
        percentChange = 100;
      }

      const sharePercent =
        totalExpenseThisMonth > 0
          ? Math.round((thisVal / totalExpenseThisMonth) * 100)
          : 0;
      const lastMonthSharePercent =
        totalExpenseLastMonth > 0
          ? Math.round((lastVal / totalExpenseLastMonth) * 100)
          : 0;

      // Phân cấp 5 dải màu Gradient nhiệt độ
      let status: "surge" | "increase" | "stable" | "decrease" | "heavy_drop" =
        "stable";
      let gradient = "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)";
      let glowColor = "rgba(99, 102, 241, 0.4)";
      let badgeBg = "bg-white/20 text-white";
      let badgeLabel = "Ổn định";

      if (percentChange > 20) {
        status = "surge";
        gradient =
          "linear-gradient(135deg, #e11d48 0%, #be123c 50%, #881337 100%)"; // Rich Crimson Ruby
        glowColor = "rgba(225, 29, 72, 0.5)";
        badgeBg = "bg-rose-950/60 text-rose-100 border border-rose-300/40";
        badgeLabel = `+${percentChange}% (Tăng mạnh)`;
      } else if (percentChange >= 5) {
        status = "increase";
        gradient = "linear-gradient(135deg, #f97316 0%, #c2410c 100%)"; // Deep Amber Orange
        glowColor = "rgba(234, 88, 12, 0.5)";
        badgeBg = "bg-orange-950/60 text-amber-100 border border-amber-300/40";
        badgeLabel = `+${percentChange}% (Tăng nhẹ)`;
      } else if (percentChange <= -20) {
        status = "heavy_drop";
        gradient = "linear-gradient(135deg, #10b981 0%, #047857 100%)"; // Rich Emerald
        glowColor = "rgba(5, 150, 105, 0.5)";
        badgeBg =
          "bg-emerald-950/60 text-emerald-100 border border-emerald-300/40";
        badgeLabel = `${percentChange}% (Giảm mạnh)`;
      } else if (percentChange <= -5) {
        status = "decrease";
        gradient = "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)"; // Vivid Teal
        glowColor = "rgba(13, 148, 136, 0.5)";
        badgeBg = "bg-teal-950/60 text-teal-100 border border-teal-300/40";
        badgeLabel = `${percentChange}% (Tiết kiệm)`;
      } else {
        status = "stable";
        gradient = "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)"; // Deep Indigo
        glowColor = "rgba(79, 70, 229, 0.5)";
        badgeBg =
          "bg-indigo-950/60 text-indigo-100 border border-indigo-300/40";
        badgeLabel = `${percentChange >= 0 ? "+" : ""}${percentChange}% (Ổn định)`;
      }

      return {
        category: cat,
        thisMonthAmount: thisVal,
        lastMonthAmount: lastVal,
        diff,
        percentChange,
        sharePercent,
        lastMonthSharePercent,
        txCount: txCountMap[cat] || 0,
        status,
        gradient,
        glowColor,
        badgeBg,
        badgeLabel,
      };
    });

    // Sắp xếp theo độ lớn chi tiêu tháng này giảm dần
    return list
      .filter((item) => item.thisMonthAmount > 0 || item.lastMonthAmount > 0)
      .sort((a, b) => b.thisMonthAmount - a.thisMonthAmount);
  }, [
    thisMonthExpenses,
    lastMonthExpenses,
    totalExpenseThisMonth,
    totalExpenseLastMonth,
  ]);

  // Chuẩn hóa dữ liệu cho Recharts Horizontal BarChart
  const momChartData = useMemo(() => {
    return momHeatmapData.map((item) => ({
      category: item.category,
      "Tháng này": item.thisMonthAmount,
      "Tháng trước": item.lastMonthAmount,
      thisMonthLabel:
        item.thisMonthAmount > 0
          ? `${formatVND(item.thisMonthAmount)} (${item.sharePercent}%)`
          : "",
      lastMonthLabel:
        item.lastMonthAmount > 0
          ? `${formatVND(item.lastMonthAmount)} (${item.lastMonthSharePercent}%)`
          : "",
      percentChange: item.percentChange,
      diff: item.diff,
      sharePercent: item.sharePercent,
      lastMonthSharePercent: item.lastMonthSharePercent,
      gradient: item.gradient,
      badgeBg: item.badgeBg,
    }));
  }, [momHeatmapData]);

  // Lấy Top 5 danh mục lớn nhất để biểu đồ luôn to rõ, dễ thao tác
  const displayedMoMData = useMemo(() => {
    if (showAllMoMCats) return momChartData;
    return momChartData.slice(0, 5);
  }, [momChartData, showAllMoMCats]);

  // Tính toán các danh mục biến động mạnh nhất phục vụ Smart Micro-insights
  const categoryChanges = useMemo(() => {
    const changes: Array<{
      category: string;
      diff: number;
      percent: number;
      type: "increase" | "decrease";
    }> = [];
    const categoriesSet = new Set<string>();
    const thisMonthMap: Record<string, number> = {};
    const lastMonthMap: Record<string, number> = {};

    thisMonthExpenses.forEach((t) => {
      const cat = t.category?.trim() || "Khác";
      categoriesSet.add(cat);
      thisMonthMap[cat] = (thisMonthMap[cat] || 0) + t.amount;
    });

    lastMonthExpenses.forEach((t) => {
      const cat = t.category?.trim() || "Khác";
      categoriesSet.add(cat);
      lastMonthMap[cat] = (lastMonthMap[cat] || 0) + t.amount;
    });

    categoriesSet.forEach((cat) => {
      const thisVal = thisMonthMap[cat] || 0;
      const lastVal = lastMonthMap[cat] || 0;
      const diff = thisVal - lastVal;
      if (diff !== 0 && lastVal > 0) {
        const percent = Math.round((diff / lastVal) * 100);
        changes.push({
          category: cat,
          diff,
          percent,
          type: diff > 0 ? "increase" : "decrease",
        });
      } else if (diff > 0 && lastVal === 0) {
        // Mới phát sinh chi tiêu trong tháng này
        changes.push({
          category: cat,
          diff,
          percent: 100,
          type: "increase",
        });
      }
    });

    const topIncrease = [...changes]
      .filter((c) => c.type === "increase")
      .sort((a, b) => b.diff - a.diff)[0];

    const topDecrease = [...changes]
      .filter((c) => c.type === "decrease")
      .sort((a, b) => a.diff - b.diff)[0]; // diff âm nhiều nhất

    return { topIncrease, topDecrease };
  }, [thisMonthExpenses, lastMonthExpenses]);

  const expenseChangePercent =
    totalExpenseLastMonth > 0
      ? Math.round(
          ((expenseThisMonth - totalExpenseLastMonth) / totalExpenseLastMonth) *
            100,
        )
      : 0;

  // AI Insights
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);

  const fetchAiInsight = useCallback(async () => {
    const cached = localStorage.getItem("ai_insight_cache");
    const cachedDate = localStorage.getItem("ai_insight_date");
    const today = getLocalDateString();
    if (cached && cachedDate === today) {
      setAiInsight(cached);
      setAiLoaded(true);
      return;
    }
    setAiLoading(true);
    try {
      const response = await fetch("/.netlify/functions/gemini-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions,
          budgets,
          debts,
          savings,
          promptType: "insights",
        }),
      });
      const data = await response.json();
      if (data.text) {
        setAiInsight(data.text);
        localStorage.setItem("ai_insight_cache", data.text);
        localStorage.setItem("ai_insight_date", today);
      }
    } catch {
    } finally {
      setAiLoading(false);
      setAiLoaded(true);
    }
  }, [transactions, budgets, debts, savings]);

  useEffect(() => {
    if (!aiLoaded && !aiLoading) fetchAiInsight();
  }, [fetchAiInsight, aiLoaded, aiLoading]);

  return (
    <div className="space-y-6 pb-10">
      {/* Personal Profile Summary Card */}
      <div
        id="header-section"
        onClick={() => onNavigateToTab(7)}
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-[28px] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.04)] cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={userProfile?.avatar || "/avatar.jpg"}
                alt={userProfile?.fullName}
                onError={(e) => {
                  e.currentTarget.src = "/avatar.jpg";
                }}
                className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  HỒ SƠ CỦA TÔI
                </span>
                <span className="bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-cyan-200/50 dark:border-cyan-800/50">
                  ⚡ {userProfile?.skills?.strongest || "Node.js"}
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate mt-0.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {userProfile?.fullName || "Lâm Huệ Trung"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium flex items-center gap-1">
                <Icon
                  path={mdiBriefcaseOutline}
                  size={0.55}
                  className="text-slate-400"
                />
                <span>{userProfile?.position || "Lập trình UI/UX và API"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0">
            <span className="text-[11px] font-bold hidden sm:inline">
              Chi tiết
            </span>
            <Icon
              path={mdiChevronRight}
              size={0.9}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </div>
        </div>
      </div>

      {/* ── 1. Account Overview ── */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[28px] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="p-2 rounded-2xl bg-slate-100 text-slate-700">
              <Icon path={mdiWallet} size={1} />
            </div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">
              Tài Khoản
            </span>
          </div>
          <button
            onClick={() => setShowAmounts((v) => !v)}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
            title={showAmounts ? "Ẩn số tiền" : "Hiện số tiền"}
          >
            <Icon
              path={showAmounts ? mdiEyeOutline : mdiEyeOffOutline}
              size={0.75}
            />
          </button>
        </div>

        <div className="mt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Số dư tích lũy
          </span>
          <h2
            className={`text-2xl font-extrabold tracking-tight ${totalIncomeAllTime - totalExpenseAllTime >= 0 ? "text-slate-900" : "text-rose-600"}`}
          >
            {showAmounts ? (
              formatVND(totalIncomeAllTime - totalExpenseAllTime)
            ) : (
              <span className="tracking-widest text-slate-300">••••••</span>
            )}
          </h2>
        </div>

        {/* Net Debt Badge */}
        {netDebt > 0 && (
          <div className="mt-2.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/60 rounded-xl flex items-center gap-1.5">
            <Icon
              path={mdiShieldAlertOutline}
              size={0.65}
              className="text-amber-500 shrink-0"
            />
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
              Dư nợ ròng: {formatVND(netDebt)}
            </span>
          </div>
        )}

        {/* 4-chip grid */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
              <Icon
                path={mdiArrowDownBold}
                size={0.65}
                className="text-emerald-500"
              />
              Thu tháng
            </span>
            <span className="text-xs font-extrabold text-emerald-600 block mt-0.5">
              {showAmounts ? formatVND(incomeThisMonth) : "••••"}
            </span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
              <Icon
                path={mdiArrowUpBold}
                size={0.65}
                className="text-rose-500"
              />
              Chi tháng
            </span>
            <span className="text-xs font-extrabold text-rose-500 block mt-0.5">
              {showAmounts ? formatVND(expenseThisMonth) : "••••"}
            </span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
              <Icon
                path={mdiArrowUpBold}
                size={0.65}
                className="text-blue-500"
              />
              Trả nợ tháng
            </span>
            <span className="text-xs font-extrabold text-blue-600 block mt-0.5">
              {showAmounts ? formatVND(totalPayablesMonthly) : "••••"}
            </span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
              <Icon path={mdiWallet} size={0.65} className="text-indigo-500" />
              Còn lại
            </span>
            <span
              className={`text-xs font-extrabold block mt-0.5 ${incomeThisMonth - expenseThisMonth - totalPayablesMonthly >= 0 ? "text-emerald-600" : "text-rose-500"}`}
            >
              {showAmounts
                ? formatVND(
                    Math.max(
                      0,
                      incomeThisMonth - expenseThisMonth - totalPayablesMonthly,
                    ),
                  )
                : "••••"}
            </span>
          </div>
        </div>

        {/* So sánh tháng trước inline */}
        {(() => {
          const lastMonthObj = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1,
          );
          const lastMonth = `${lastMonthObj.getFullYear()}-${String(lastMonthObj.getMonth() + 1).padStart(2, "0")}`;
          const lastIncome = transactions
            .filter((t) => t.type === "income" && t.date.startsWith(lastMonth))
            .reduce((s, t) => s + t.amount, 0);
          const lastExpense = transactions
            .filter((t) => t.type === "expense" && t.date.startsWith(lastMonth))
            .reduce((s, t) => s + t.amount, 0);
          const incomeChange =
            lastIncome > 0
              ? Math.round(((incomeThisMonth - lastIncome) / lastIncome) * 100)
              : 0;
          const expenseChange =
            lastExpense > 0
              ? Math.round(
                  ((expenseThisMonth - lastExpense) / lastExpense) * 100,
                )
              : 0;

          return (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-slate-400 font-medium">Thu:</span>
                <span
                  className={`font-black flex items-center gap-0.5 ${incomeChange >= 0 ? "text-emerald-600" : "text-rose-500"}`}
                >
                  <Icon
                    path={incomeChange >= 0 ? mdiTrendingUp : mdiTrendingDown}
                    size={0.6}
                  />
                  {incomeChange >= 0 ? "+" : ""}
                  {incomeChange}%
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-slate-400 font-medium">Chi:</span>
                <span
                  className={`font-black flex items-center gap-0.5 ${expenseChange <= 0 ? "text-emerald-600" : "text-rose-500"}`}
                >
                  <Icon
                    path={expenseChange <= 0 ? mdiTrendingDown : mdiTrendingUp}
                    size={0.6}
                  />
                  {expenseChange > 0 ? "+" : ""}
                  {expenseChange}%
                </span>
              </div>
              <span className="text-[9px] text-slate-400 ml-auto">
                vs tháng trước
              </span>
            </div>
          );
        })()}
      </div>

      {/* ── 2. UNIFIED TREND & ML CASHFLOW FORECAST CHART ── */}
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-100 dark:border-slate-700/60 rounded-[28px] p-4 sm:p-5 shadow-[0_12px_36px_rgba(0,0,0,0.03)] space-y-3">
        {/* Header Title & Segmented Range */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Icon path={mdiChartTimelineVariant} size={0.85} />
              </div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Xu hướng
              </h3>
            </div>
            {mlForecast?.runway_analysis && (
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                  mlForecast.runway_analysis.is_financially_safe
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/60"
                    : "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200/60"
                }`}
                title={
                  mlForecast.runway_analysis.is_financially_safe
                    ? "Dòng tiền an toàn"
                    : "Cảnh báo thâm hụt"
                }
              >
                <Icon
                  path={
                    mlForecast.runway_analysis.is_financially_safe
                      ? mdiShieldCheckOutline
                      : mdiShieldAlertOutline
                  }
                  size={0.65}
                />
              </div>
            )}
          </div>

          {/* Segmented Range Pills */}
          <div className="flex items-center gap-1 bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl p-1 overflow-x-auto no-scrollbar">
            {[
              { key: "7d" as const, label: "7 ngày" },
              { key: "30d" as const, label: "30 ngày" },
              { key: "12m" as const, label: "12 tháng" },
              { key: "forecast" as const, label: "Dự báo", icon: mdiCreation },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => setTrendRange(r.key)}
                className={`flex-1 min-w-[70px] py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  trendRange === r.key
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                {r.icon && <Icon path={r.icon} size={0.5} />}
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Smart AI Forecast Ribbon (Icon-driven, no tickers) */}
        {mlForecast?.runway_analysis && (
          <div className="bg-gradient-to-r from-indigo-50/70 via-slate-50/60 to-purple-50/70 dark:from-indigo-950/40 dark:via-slate-900/40 dark:to-purple-950/40 border border-indigo-100/60 dark:border-indigo-900/40 rounded-2xl px-3 py-1.5 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                <Icon path={mdiCreation} size={0.5} />
              </div>
              <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                <span
                  className="flex items-center gap-1"
                  title="Thời gian dự trữ duy trì"
                >
                  <Icon
                    path={mdiCalendarClockOutline}
                    size={0.55}
                    className="text-indigo-500 dark:text-indigo-400"
                  />
                  <strong className="font-black text-indigo-600 dark:text-indigo-400">
                    {mlForecast.runway_analysis.financial_runway_days} ngày
                  </strong>
                </span>

                <span className="text-slate-300 dark:text-slate-700 font-light">
                  •
                </span>

                <span
                  className="flex items-center gap-1"
                  title="Mức chi tiêu dự báo"
                >
                  <Icon path={mdiFire} size={0.55} className="text-rose-500" />
                  <strong className="font-black text-rose-600 dark:text-rose-400">
                    ~{formatVND(mlForecast.runway_analysis.daily_burn_rate)}
                    /ngày
                  </strong>
                </span>
              </div>
            </div>

            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 border ${
                mlForecast.runway_analysis.is_financially_safe
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              }`}
              title={
                mlForecast.runway_analysis.is_financially_safe
                  ? "Dòng tiền an toàn"
                  : "Cảnh báo thâm hụt"
              }
            >
              <Icon
                path={
                  mlForecast.runway_analysis.is_financially_safe
                    ? mdiShieldCheckOutline
                    : mdiShieldAlertOutline
                }
                size={0.55}
              />
            </div>
          </div>
        )}

        {/* Chart View */}
        <div className="h-52 pt-2 -ml-2 -mr-1">
          <ResponsiveContainer width="100%" height="100%">
            {trendRange === "forecast" ? (
              <AreaChart
                data={
                  mlForecast?.forecasts?.["30"] ||
                  mlForecast?.forecasts?.["7"] ||
                  []
                }
              >
                <defs>
                  <linearGradient
                    id="fanCorridorGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.35} />
                    <stop
                      offset="100%"
                      stopColor="#818cf8"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                  <linearGradient
                    id="predictedBalanceGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  opacity={0.6}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  width={34}
                  tick={{ fontSize: 8.5, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => {
                    if (Math.abs(v) >= 1000000)
                      return (
                        (v / 1000000).toFixed(1).replace(/\.0$/, "") + "tr"
                      );
                    if (Math.abs(v) >= 1000) return Math.round(v / 1000) + "k";
                    return String(v);
                  }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid #e0e7ff",
                    boxShadow: "0 8px 20px rgba(99,102,241,0.12)",
                    fontSize: 10.5,
                    padding: "6px 10px",
                  }}
                  formatter={(value: number, name: string) => [
                    formatFullVND(value),
                    name === "predicted_balance"
                      ? "Số dư dự báo"
                      : name === "upper_bound"
                        ? "Biên độ trên"
                        : name === "lower_bound"
                          ? "Biên độ dưới"
                          : "Chi tiêu/ngày",
                  ]}
                  labelFormatter={(label: string) =>
                    `Ngày ${formatChartDate(label)}`
                  }
                />
                {/* Fan corridor envelope */}
                <Area
                  type="monotone"
                  dataKey="upper_bound"
                  stroke="#818cf8"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                  fill="url(#fanCorridorGrad)"
                  dot={false}
                  name="upper_bound"
                />
                {/* Predicted Balance main line */}
                <Area
                  type="monotone"
                  dataKey="predicted_balance"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fill="url(#predictedBalanceGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#4f46e5" }}
                  name="predicted_balance"
                />
                {/* Daily expense predicted */}
                <Line
                  type="monotone"
                  dataKey="predicted_daily_expense"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  name="predicted_daily_expense"
                />
              </AreaChart>
            ) : (
              <ComposedChart data={trendData} barGap={2}>
                <defs>
                  {/* Gradient Cột Thu Nhập (Xanh Emerald) */}
                  <linearGradient
                    id="incomeBarGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>

                  {/* Gradient Cột Chi Tiêu (Đỏ Hồng Rose) */}
                  <linearGradient
                    id="expenseBarGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-slate-200/60 dark:text-slate-700/40"
                />

                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  width={36}
                  tick={{ fontSize: 8.5, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => {
                    if (Math.abs(v) >= 1000000)
                      return (
                        (v / 1000000).toFixed(1).replace(/\.0$/, "") + "tr"
                      );
                    if (Math.abs(v) >= 1000) return Math.round(v / 1000) + "k";
                    return String(v);
                  }}
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const incomeVal =
                      Number(
                        payload.find((p) => p.dataKey === "income")?.value,
                      ) || 0;
                    const expenseVal =
                      Number(
                        payload.find((p) => p.dataKey === "expense")?.value,
                      ) || 0;
                    const balanceVal =
                      Number(
                        payload.find((p) => p.dataKey === "balance")?.value,
                      ) || 0;
                    const netDiff = incomeVal - expenseVal;

                    return (
                      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-xl text-xs space-y-2 select-none min-w-[185px]">
                        <div className="font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
                          <span>
                            {label
                              ? `Ngày ${formatChartDate(String(label))}`
                              : "Thời điểm"}
                          </span>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              netDiff >= 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {netDiff >= 0 ? "Thặng dư" : "Bội chi"}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                              Thu nhập:
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatFullVND(incomeVal)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                              Chi tiêu:
                            </span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              {formatFullVND(expenseVal)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-[10.5px]">
                              <span className="w-2 h-0.5 bg-amber-500 rounded-full" />
                              Số dư tích lũy:
                            </span>
                            <span className="font-black text-slate-800 dark:text-slate-100">
                              {formatFullVND(balanceVal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />

                {/* Cột Thu Nhập */}
                <Bar
                  dataKey="income"
                  name="Thu nhập"
                  fill="url(#incomeBarGrad)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />

                {/* Cột Chi Tiêu */}
                <Bar
                  dataKey="expense"
                  name="Chi tiêu"
                  fill="url(#expenseBarGrad)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />

                {/* Đường Số Dư Tích Lũy */}
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Số dư"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{
                    r: 2.5,
                    fill: "#f59e0b",
                    stroke: "#ffffff",
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: 5,
                    stroke: "#ffffff",
                    strokeWidth: 2,
                    fill: "#f59e0b",
                  }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 3. Cơ cấu Thu / Chi (2 tabs) ── */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-100 dark:border-slate-700/50 rounded-[28px] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-1.5 mb-4 bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-full w-fit border border-slate-100/30 dark:border-slate-800/30">
          <button
            onClick={() => setSpendingTab("expense")}
            className={`text-[10px] font-bold px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 border ${
              spendingTab === "expense"
                ? "bg-rose-700 dark:bg-rose-600 text-white border-rose-700 dark:border-rose-600 shadow-sm"
                : "bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Icon path={mdiTrendingDown} size={0.667} />
            Chi tiêu
          </button>
          <button
            onClick={() => setSpendingTab("income")}
            className={`text-[10px] font-bold px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 border ${
              spendingTab === "income"
                ? "bg-emerald-700 dark:bg-emerald-600 text-white border-emerald-700 dark:border-emerald-600 shadow-sm"
                : "bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Icon path={mdiTrendingUp} size={0.667} />
            Thu nhập
          </button>
        </div>

        {spendingTab === "expense"
          ? (() => {
              const data = categoriesData.filter((c) => c.value > 0);
              if (data.length === 0)
                return (
                  <p className="text-xs text-slate-400 text-center py-8">
                    Chưa có dữ liệu chi tiêu
                  </p>
                );
              return (
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  {/* PieChart */}
                  <div className="w-full sm:w-40 h-40 shrink-0 mx-auto sm:mx-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          dataKey="value"
                        >
                          {data.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            fontSize: 11,
                          }}
                          formatter={(value: number) => [
                            new Intl.NumberFormat("vi-VN").format(value) + "đ",
                            "Chi tiêu",
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <p className="text-center text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mt-1">
                      Tổng chi: {formatVND(totalExpenseComputed)}
                    </p>
                  </div>
                  {/* Danh sách */}
                  <div className="flex-1 w-full space-y-2.5">
                    {data
                      .sort((a, b) => b.value - a.value)
                      .map((cat, idx) => {
                        const pct =
                          totalExpenseComputed > 0
                            ? Math.round(
                                (cat.value / totalExpenseComputed) * 100,
                              )
                            : 0;
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="font-bold text-slate-700 dark:text-slate-200 truncate">
                                {cat.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-slate-500 dark:text-slate-400 font-semibold">
                                {formatVND(cat.value)}
                              </span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-md min-w-[28px] text-center">
                                {pct}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })()
          : (() => {
              // Income breakdown (top sources)
              const incomeData = transactions.filter(
                (t) =>
                  t.type === "income" && t.date.startsWith(currentMonthStr),
              );
              const incomeMap: Record<string, number> = {};
              incomeData.forEach((t) => {
                const cat = t.category?.trim() || "Khác";
                incomeMap[cat] = (incomeMap[cat] || 0) + t.amount;
              });
              const sortedIncome = Object.entries(incomeMap)
                .filter(([, v]) => v > 0)
                .sort((a, b) => b[1] - a[1]);
              const topIncome = sortedIncome.slice(0, 6);
              const totalIncomeVal = sortedIncome.reduce(
                (s, [, v]) => s + v,
                0,
              );
              const incomeColors = [
                "#047857",
                "#059669",
                "#10b981",
                "#34d399",
                "#6ee7b7",
                "#a7f3d0",
              ];

              if (topIncome.length === 0)
                return (
                  <p className="text-xs text-slate-400 text-center py-8">
                    Chưa có dữ liệu thu nhập
                  </p>
                );
              return (
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="w-full sm:w-40 h-40 shrink-0 mx-auto sm:mx-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topIncome.map(([name, value]) => ({
                            name,
                            value,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          dataKey="value"
                        >
                          {topIncome.map((_, i) => (
                            <Cell
                              key={i}
                              fill={incomeColors[i % incomeColors.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            fontSize: 11,
                          }}
                          formatter={(value: number) => [
                            new Intl.NumberFormat("vi-VN").format(value) + "đ",
                            "Thu nhập",
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <p className="text-center text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mt-1">
                      Tổng thu: {formatVND(totalIncomeVal)}
                    </p>
                  </div>
                  <div className="flex-1 w-full space-y-2.5">
                    {topIncome.map(([name, value], idx) => {
                      const pct =
                        totalIncomeVal > 0
                          ? Math.round((value / totalIncomeVal) * 100)
                          : 0;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  incomeColors[idx % incomeColors.length],
                              }}
                            />
                            <span className="font-bold text-slate-700 dark:text-slate-200 truncate">
                              {name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-slate-500 dark:text-slate-400 font-semibold">
                              {formatVND(value)}
                            </span>
                            <span className="font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md min-w-[28px] text-center">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
      </div>

      {/* ── 4. Dự Báo Dòng Tiền ── */}
      <div className="bg-white/80 backdrop-blur-md border border-white/40 rounded-[28px] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <Icon path={mdiChartTimelineVariant} size={0.8} />
            </div>
            <h3 className="text-xs font-bold text-slate-800 tracking-tight">
              Dự Báo Dòng Tiền
            </h3>
          </div>
          <span className="text-[9px] font-bold text-slate-400">
            {now.toLocaleDateString("vi-VN", {
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-slate-50 rounded-xl p-2.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">
              Thu nhập
            </span>
            <span className="text-[11px] font-extrabold text-emerald-600 mt-0.5 block">
              {formatVND(incomeThisMonth)}
            </span>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">
              Đã chi
            </span>
            <span className="text-[11px] font-extrabold text-rose-600 mt-0.5 block">
              {formatVND(expenseThisMonth)}
            </span>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">
              Trả nợ
            </span>
            <span className="text-[11px] font-extrabold text-blue-600 mt-0.5 block">
              {formatVND(totalPayablesMonthly)}
            </span>
          </div>
          <div
            className={`rounded-xl p-2.5 ${projectedIncome - expenseThisMonth - totalPayablesMonthly - totalFixed >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}
          >
            <span className="text-[8px] font-bold text-slate-400 uppercase block">
              Tích lũy
            </span>
            <span
              className={`text-[11px] font-extrabold mt-0.5 block ${projectedIncome - expenseThisMonth - totalPayablesMonthly - totalFixed >= 0 ? "text-emerald-600" : "text-rose-600"}`}
            >
              {formatVND(
                projectedIncome -
                  expenseThisMonth -
                  totalPayablesMonthly -
                  totalFixed,
              )}
            </span>
          </div>
        </div>
        {projectedIncome -
          expenseThisMonth -
          totalPayablesMonthly -
          totalFixed <
          0 && (
          <div className="mt-2 bg-rose-50 border border-rose-100 rounded-xl p-2 flex items-center gap-1.5">
            <Icon
              path={mdiAlertCircleOutline}
              size={0.6}
              className="text-rose-500 shrink-0"
            />
            <span className="text-[9px] font-bold text-rose-600">
              Dự báo âm. Cần cắt giảm chi tiêu.
            </span>
          </div>
        )}
      </div>

      {/* ── 3. BẢN ĐỒ SO SÁNH CẤU TRÚC CHI TIÊU MoM (ICON-FIRST COMPACT REDESIGN) ── */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800 rounded-[32px] p-4 sm:p-6 shadow-[0_16px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.3)] space-y-4 transition-all">
        {/* Header Block */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Icon path={mdiChartBar} size={0.85} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Cấu Trúc Chi Tiêu MoM
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                So sánh cơ cấu danh mục với tháng trước
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs border ${
                expenseChangePercent <= 0
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60"
              }`}
            >
              <Icon
                path={
                  expenseChangePercent <= 0 ? mdiTrendingDown : mdiTrendingUp
                }
                size={0.6}
              />
              {expenseChangePercent > 0 ? "+" : ""}
              {expenseChangePercent}%
            </span>
          </div>
        </div>

        {/* Dual KPI Metric Highlights (Icon-driven 2 columns) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* Tháng này Card */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-white dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900/60 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Icon path={mdiWallet} size={0.55} />
                </div>
                Tháng này
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100/60 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded-full">
                {thisMonthExpenses.length} GD
              </span>
            </div>
            <div className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
              {formatFullVND(expenseThisMonth)}
            </div>
          </div>

          {/* Tháng trước Card */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50 rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-lg bg-slate-400 dark:bg-slate-600 text-white flex items-center justify-center shrink-0">
                  <Icon path={mdiCalendarClockOutline} size={0.55} />
                </div>
                Tháng trước
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-full">
                {lastMonthExpenses.length} GD
              </span>
            </div>
            <div className="text-sm sm:text-lg font-bold text-slate-700 dark:text-slate-300 tracking-tight truncate">
              {formatFullVND(totalExpenseLastMonth)}
            </div>
          </div>
        </div>

        {/* ── RECHARTS BAR CHART (TOP 5 CATEGORIES - BIG TOUCH TARGETS) ── */}
        {displayedMoMData.length > 0 ? (
          <div className="space-y-3">
            <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-2.5 sm:p-3.5 border border-slate-100 dark:border-slate-800 relative">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1 pb-2">
                <span>
                  {showAllMoMCats
                    ? `Tất cả ${momChartData.length} danh mục`
                    : `Top ${displayedMoMData.length} danh mục lớn nhất`}
                </span>
                {momChartData.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllMoMCats(!showAllMoMCats)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <span>
                      {showAllMoMCats
                        ? "Thu gọn Top 5"
                        : `Xem tất cả (${momChartData.length})`}
                    </span>
                    <Icon
                      path={showAllMoMCats ? mdiChevronRight : mdiChevronRight}
                      size={0.55}
                      className={showAllMoMCats ? "-rotate-90" : "rotate-90"}
                    />
                  </button>
                )}
              </div>

              <div
                style={{
                  height: `${showAllMoMCats ? Math.max(220, displayedMoMData.length * 44) : Math.max(180, displayedMoMData.length * 44)}px`,
                }}
                className="w-full transition-all duration-300"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={displayedMoMData}
                    margin={{ top: 4, right: 65, left: -18, bottom: 0 }}
                    barGap={4}
                    barSize={13}
                  >
                    <defs>
                      <linearGradient
                        id="barThisMonth"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>

                      <linearGradient
                        id="barLastMonth"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#cbd5e1" />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="currentColor"
                      className="text-slate-200/60 dark:text-slate-700/40"
                    />

                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatVND(v)}
                      tick={{ fontSize: 9, fill: "#94a3b8" }}
                      axisLine={{ stroke: "#cbd5e1", opacity: 0.3 }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }}
                      width={80}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0]?.payload;
                        if (!data) return null;
                        const diffVal =
                          (data["Tháng này"] || 0) - (data["Tháng trước"] || 0);

                        return (
                          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-800 shadow-xl text-xs space-y-1.5 select-none min-w-[160px]">
                            <div className="font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center justify-between gap-2">
                              <span>{data.category}</span>
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                  data.percentChange <= 0
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {data.percentChange >= 0
                                  ? `+${data.percentChange}%`
                                  : `${data.percentChange}%`}
                              </span>
                            </div>
                            <div className="space-y-1 text-[10.5px]">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500 dark:text-slate-400">
                                  Tháng này:
                                </span>
                                <span className="font-black text-indigo-600 dark:text-indigo-400">
                                  {formatFullVND(data["Tháng này"])}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-400">
                                  Tháng trước:
                                </span>
                                <span className="font-semibold text-slate-600 dark:text-slate-300">
                                  {formatFullVND(data["Tháng trước"])}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[9.5px]">
                                <span className="text-slate-400">Chênh lệch:</span>
                                <span
                                  className={`font-bold ${diffVal <= 0 ? "text-emerald-500" : "text-rose-500"}`}
                                >
                                  {diffVal >= 0 ? "+" : ""}
                                  {formatFullVND(diffVal)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />

                    <Bar
                      dataKey="Tháng này"
                      fill="url(#barThisMonth)"
                      radius={[0, 7, 7, 0]}
                      onClick={(entry: any) =>
                        setSelectedHeatmapCategory(entry.category)
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <LabelList
                        dataKey="thisMonthLabel"
                        position="right"
                        style={{
                          fontSize: "9px",
                          fontWeight: 800,
                          fill: "#6366f1",
                        }}
                      />
                    </Bar>
                    <Bar
                      dataKey="Tháng trước"
                      fill="url(#barLastMonth)"
                      radius={[0, 7, 7, 0]}
                      onClick={(entry: any) =>
                        setSelectedHeatmapCategory(entry.category)
                      }
                      style={{ cursor: "pointer", opacity: 0.8 }}
                    >
                      <LabelList
                        dataKey="lastMonthLabel"
                        position="right"
                        style={{
                          fontSize: "8.5px",
                          fontWeight: 600,
                          fill: "#94a3b8",
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── VISUAL HIGHLIGHTS: ICON BADGES & SMART INSIGHT ── */}
            <div className="space-y-2">
              {/* Row 1: Top Increase & Top Decrease Badges */}
              {(categoryChanges.topIncrease || categoryChanges.topDecrease) && (
                <div className="grid grid-cols-2 gap-2">
                  {categoryChanges.topIncrease && (
                    <div className="p-2.5 bg-rose-50/60 dark:bg-rose-950/30 rounded-2xl border border-rose-100/60 dark:border-rose-900/40 flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0">
                        <Icon path={mdiArrowUpBold} size={0.55} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">
                          Tăng mạnh
                        </span>
                        <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 truncate">
                          {categoryChanges.topIncrease.category}
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 shrink-0">
                        +{formatVND(categoryChanges.topIncrease.diff)}
                      </span>
                    </div>
                  )}

                  {categoryChanges.topDecrease && (
                    <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100/60 dark:border-emerald-900/40 flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Icon path={mdiArrowDownBold} size={0.55} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider block">
                          Giảm sâu
                        </span>
                        <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 truncate">
                          {categoryChanges.topDecrease.category}
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                        -{formatVND(Math.abs(categoryChanges.topDecrease.diff))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Row 2: AI Quick Summary Pill */}
              <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/50 flex items-center gap-2.5 text-[10.5px]">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Icon path={mdiAutoFix} size={0.55} />
                </div>
                <div className="text-slate-700 dark:text-slate-300 font-medium leading-tight flex-1 truncate">
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-300">
                    {expenseChangePercent <= 0 ? "Tiết kiệm" : "Tăng"}{" "}
                    {Math.abs(expenseChangePercent)}% MoM
                  </span>
                  {" • "}
                  <span>
                    {expenseChangePercent <= 0
                      ? "Kiểm soát chi tiêu rất tốt!"
                      : "Cần chú ý các nhóm chi tiêu tăng cao."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center text-slate-400 gap-1.5">
            <Icon path={mdiChartBar} size={1.2} className="opacity-40" />
            <span className="text-xs font-semibold">
              Chưa có đủ dữ liệu giao dịch để so sánh
            </span>
          </div>
        )}
      </div>

      {/* ── DRILL-DOWN MODAL XEM CHI TIẾT DANH MỤC (BOTTOM SHEET) ── */}
      {createPortal(
        <AnimatePresence>
          {selectedHeatmapCategory &&
            (() => {
              const item = momHeatmapData.find(
                (h) => h.category === selectedHeatmapCategory,
              );
              if (!item) return null;

              const categoryTransactions = thisMonthExpenses
                .filter(
                  (t) =>
                    (t.category?.trim() || "Khác") === selectedHeatmapCategory,
                )
                .sort((a, b) => b.date.localeCompare(a.date));

              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 overflow-hidden z-50 bg-slate-900/50 backdrop-blur-md flex items-end justify-center"
                  onClick={() => setSelectedHeatmapCategory(null)}
                >
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 26, stiffness: 240 }}
                    drag="y"
                    dragControls={dragControlsCategory}
                    dragListener={false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 0.5 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.y > 60 || info.velocity.y > 200) {
                        setSelectedHeatmapCategory(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] max-h-[88vh] flex flex-col overflow-hidden shadow-[0_-12px_48px_rgba(0,0,0,0.25)] border-t border-white/20 dark:border-slate-800 z-50"
                  >
                    {/* Header with Category Gradient & Drag Handle */}
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        dragControlsCategory.start(e);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      style={{
                        touchAction: "none",
                        background: item.gradient,
                      }}
                      className="p-5 pt-3 text-white relative overflow-hidden shrink-0 select-none cursor-grab active:cursor-grabbing shadow-inner"
                    >
                      {/* Ambient lighting */}
                      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/15 blur-2xl pointer-events-none" />

                      {/* Drag Handle Notch */}
                      <div className="w-12 h-1.5 bg-white/40 rounded-full mx-auto mb-3" />

                      {/* Close Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedHeatmapCategory(null)}
                        className="absolute top-4 right-4 w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer"
                      >
                        <Icon path={mdiClose} size={0.65} />
                      </button>

                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                        <h3 className="text-lg font-extrabold tracking-tight">
                          {item.category}
                        </h3>
                      </div>

                      <div className="text-2xl sm:text-3xl font-black tracking-tight mt-1 drop-shadow-sm">
                        {formatFullVND(item.thisMonthAmount)}
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-sm">
                          {item.badgeLabel}
                        </span>
                        <span className="text-[10px] text-white/90 font-medium">
                          Chiếm {item.sharePercent}% tổng chi tháng này
                        </span>
                      </div>
                    </div>

                    {/* MoM Comparison Stats */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-center shrink-0">
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">
                          Tháng trước
                        </span>
                        <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
                          {formatFullVND(item.lastMonthAmount)}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">
                          Chênh lệch MoM
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-black ${
                            item.diff > 0
                              ? "text-rose-500"
                              : item.diff < 0
                                ? "text-emerald-500"
                                : "text-slate-500"
                          }`}
                        >
                          {item.diff > 0
                            ? `+${formatFullVND(item.diff)}`
                            : item.diff < 0
                              ? `-${formatFullVND(Math.abs(item.diff))}`
                              : "0đ"}
                        </span>
                      </div>
                    </div>

                    {/* Transaction List */}
                    <div className="p-4 overflow-y-auto overscroll-contain space-y-2 flex-1">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        Giao dịch trong tháng ({categoryTransactions.length})
                      </span>

                      {categoryTransactions.length > 0 ? (
                        categoryTransactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {tx.description || "Chi tiêu không ghi chú"}
                              </p>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {tx.date}
                              </span>
                            </div>
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100 shrink-0">
                              {formatFullVND(tx.amount)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-slate-400 text-xs font-medium">
                          Không có giao dịch nào phát sinh trong tháng này
                        </div>
                      )}
                    </div>

                    {/* Footer Action */}
                    <div className="p-4 pb-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedHeatmapCategory(null)}
                        className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHeatmapCategory(null);
                          onNavigateToTab(2);
                        }}
                        className="flex-1 py-3 rounded-2xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        Xem trên Sổ cái
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })()}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
