import React, { useState, useMemo, useEffect, useCallback } from "react";
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
} from "@mdi/js";
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
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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
  const [mlForecast, setMlForecast] = useState<MLForecastResponse | null>(() => {
    try {
      const cached = localStorage.getItem("ml_forecast_cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
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
    const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
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

  const netWorthData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    let running = 0;
    const map: Record<string, { date: string; netWorth: number }> = {};
    sorted.forEach((t) => {
      const key = t.date;
      if (!map[key]) map[key] = { date: key, netWorth: running };
      running += t.type === "income" ? t.amount : -t.amount;
      map[key].netWorth = running;
    });
    return Object.values(map);
  }, [transactions]);

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
    (t) => t.type === "expense" && t.date.startsWith(lastMonthStr)
  );



  // State toggle loại dữ liệu hiển thị trên Radar: 'absolute' (k) hoặc 'percentage' (%)
  const [radarDataType, setRadarDataType] = useState<"absolute" | "percentage">("percentage");

  const totalExpenseThisMonth = thisMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenseLastMonth = lastMonthExpenses.reduce((sum, t) => sum + t.amount, 0);

  const momRadarData = useMemo(() => {
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

    const list = Array.from(categoriesSet).map((cat) => {
      const thisMonthVal = thisMonthMap[cat] || 0;
      const lastMonthVal = lastMonthMap[cat] || 0;

      if (radarDataType === "percentage") {
        const thisMonthPct = totalExpenseThisMonth > 0 ? Math.round((thisMonthVal / totalExpenseThisMonth) * 100) : 0;
        const lastMonthPct = totalExpenseLastMonth > 0 ? Math.round((lastMonthVal / totalExpenseLastMonth) * 100) : 0;
        return {
          category: cat,
          "Tháng trước": lastMonthPct,
          "Tháng này": thisMonthPct,
          rawThisMonth: thisMonthVal,
          rawLastMonth: lastMonthVal,
        };
      } else {
        return {
          category: cat,
          "Tháng trước": Math.round(lastMonthVal / 1000), // đơn vị 'k'
          "Tháng này": Math.round(thisMonthVal / 1000), // đơn vị 'k'
          rawThisMonth: thisMonthVal,
          rawLastMonth: lastMonthVal,
        };
      }
    });

    // Sắp xếp theo tổng độ lớn chi tiêu của 2 tháng
    return list
      .sort((a, b) => {
        const aVal = (a.rawThisMonth || 0) + (a.rawLastMonth || 0);
        const bVal = (b.rawThisMonth || 0) + (b.rawLastMonth || 0);
        return bVal - aVal;
      })
      .slice(0, 6); // Lấy tối đa 6 danh mục lớn nhất để biểu đồ gọn gàng
  }, [thisMonthExpenses, lastMonthExpenses, radarDataType, totalExpenseThisMonth, totalExpenseLastMonth]);

  // Tính toán các danh mục biến động mạnh nhất phục vụ Smart Micro-insights
  const categoryChanges = useMemo(() => {
    const changes: Array<{ category: string; diff: number; percent: number; type: "increase" | "decrease" }> = [];
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

  const expenseChangePercent = totalExpenseLastMonth > 0 
    ? Math.round(((expenseThisMonth - totalExpenseLastMonth) / totalExpenseLastMonth) * 100)
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

        {/* Mini net worth sparkline */}
        {netWorthData.length > 1 && (
          <div className="h-10 mt-2 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netWorthData}>
                <defs>
                  <linearGradient id="nwMiniGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#0ea5e9"
                  strokeWidth={1.5}
                  fill="url(#nwMiniGrad)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Net Debt Badge */}
        {netDebt > 0 && (
          <div className="mt-2 px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-1.5">
            <Icon
              path={mdiShieldAlertOutline}
              size={0.6}
              className="text-amber-500 shrink-0"
            />
            <span className="text-[9px] font-bold text-amber-700">
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
                title={mlForecast.runway_analysis.is_financially_safe ? "Dòng tiền an toàn" : "Cảnh báo thâm hụt"}
              >
                <Icon
                  path={mlForecast.runway_analysis.is_financially_safe ? mdiShieldCheckOutline : mdiShieldAlertOutline}
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

        {/* Mini Runway & Burn Rate Badges */}
        {mlForecast?.runway_analysis && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-slate-50/80 dark:bg-slate-900/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">Runway</span>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                {mlForecast.runway_analysis.financial_runway_days} ngày
              </span>
            </div>
            <div className="bg-slate-50/80 dark:bg-slate-900/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">Chi tiêu AI</span>
              <span className="text-xs font-black text-rose-500">
                {formatVND(mlForecast.runway_analysis.daily_burn_rate)}/ngày
              </span>
            </div>
          </div>
        )}

        {/* Chart View */}
        <div className="h-52 pt-2 -ml-2 -mr-1">
          <ResponsiveContainer width="100%" height="100%">
            {trendRange === "forecast" ? (
              <AreaChart data={mlForecast?.forecasts?.["30"] || mlForecast?.forecasts?.["7"] || []}>
                <defs>
                  <linearGradient id="fanCorridorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="predictedBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" opacity={0.6} />
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
                    if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, "") + "tr";
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
                  labelFormatter={(label: string) => `Ngày ${formatChartDate(label)}`}
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
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" opacity={0.6} />
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
                    if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, "") + "tr";
                    if (Math.abs(v) >= 1000) return Math.round(v / 1000) + "k";
                    return String(v);
                  }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
                    fontSize: 10.5,
                    padding: "6px 10px",
                  }}
                  formatter={(value: number, name: string) => [
                    formatFullVND(value),
                    name === "income"
                      ? "Thu nhập"
                      : name === "expense"
                        ? "Chi tiêu"
                        : "Số dư",
                  ]}
                  labelFormatter={(label: string) => `Ngày ${formatChartDate(label)}`}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#incomeGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#059669" }}
                  name="income"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#e11d48"
                  strokeWidth={2}
                  fill="url(#expenseGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#e11d48" }}
                  name="expense"
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#0ea5e9"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  name="balance"
                />
              </AreaChart>
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
              Dự báo
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

      {/* SO SÁNH CHI TIÊU THÁNG NÀY VS THÁNG TRƯỚC (RADAR CHART) */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/40 dark:border-slate-800/80 rounded-[28px] p-6 shadow-[0_12px_36px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Icon
                path={mdiChartTimelineVariant}
                size={0.875}
                className="text-indigo-500"
              />
              Cấu Trúc Chi Tiêu MoM
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              So sánh cơ cấu chi tiêu với tháng trước ({radarDataType === "percentage" ? "tỷ lệ phần trăm %" : "đơn vị: nghìn đồng"})
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Toggle hiển thị % / Số tiền tuyệt đối */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              <button
                onClick={() => setRadarDataType("percentage")}
                className={`text-[9px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  radarDataType === "percentage"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Tỷ lệ %
              </button>
              <button
                onClick={() => setRadarDataType("absolute")}
                className={`text-[9px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  radarDataType === "absolute"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Số tiền (k)
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${expenseChangePercent <= 0 ? "bg-emerald-500 text-white shadow-sm" : "bg-rose-500 text-white shadow-sm"}`}>
                {expenseChangePercent <= 0 ? "Giảm" : "Tăng"} {Math.abs(expenseChangePercent)}%
              </span>
            </div>
          </div>
        </div>

        {momRadarData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
            {/* Chart Area */}
            <div className="md:col-span-3 h-56 relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="48%" outerRadius="68%" data={momRadarData}>
                  <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fill: "#64748b", fontSize: 8.5, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, "auto"]}
                    tick={{ fill: "#94a3b8", fontSize: 7.5 }}
                  />
                  <Radar
                    name="Tháng trước"
                    dataKey="Tháng trước"
                    stroke="#94a3b8"
                    fill="#cbd5e1"
                    fillOpacity={0.15}
                  />
                  <Radar
                    name="Tháng này"
                    dataKey="Tháng này"
                    stroke="#8b5cf6"
                    fill="#c084fc"
                    fillOpacity={0.3}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}${radarDataType === "percentage" ? "%" : "k"}`, ""]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "16px",
                      border: "1px solid rgba(255, 255, 255, 0.6)",
                      backdropFilter: "blur(12px)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.05)",
                      fontSize: "10.5px",
                      fontWeight: 600,
                      color: "#1e293b",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
              
              {/* Custom Legend inside chart container */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 text-[10px] font-bold text-slate-500">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-400" />
                  Tháng trước
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-400 border border-violet-500" />
                  Tháng này
                </div>
              </div>
            </div>

            {/* Quick stats and micro-insights */}
            <div className="md:col-span-2 space-y-3">
              <div className="bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-slate-700/50 rounded-2xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  Tổng chi tháng này
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-black text-slate-800 dark:text-slate-100">
                    {formatFullVND(expenseThisMonth)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold block">
                  Tháng trước: {formatFullVND(totalExpenseLastMonth)}
                </span>
              </div>

              {/* Smart Micro-insights Details */}
              {(categoryChanges.topIncrease || categoryChanges.topDecrease) && (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Phân tích biến động
                  </span>
                  
                  {categoryChanges.topIncrease && (
                    <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/30 rounded-xl p-2.5 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                      <div className="text-[10.5px]">
                        <span className="font-bold text-rose-600 dark:text-rose-400">Tăng mạnh nhất: </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {categoryChanges.topIncrease.category} (+{formatFullVND(categoryChanges.topIncrease.diff)})
                        </span>
                      </div>
                    </div>
                  )}

                  {categoryChanges.topDecrease && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/30 rounded-xl p-2.5 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      <div className="text-[10.5px]">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Tiết kiệm nhất: </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {categoryChanges.topDecrease.category} ({formatFullVND(categoryChanges.topDecrease.diff)})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/30 rounded-2xl p-3.5">
                <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 block mb-1">
                  Nhận xét nhanh
                </span>
                <p className="text-[10.5px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  {expenseChangePercent <= 0
                    ? `Chi tiêu của bạn đang kiểm soát tốt, giảm ${Math.abs(expenseChangePercent)}% so với tháng trước. Hãy tiếp tục duy trì!`
                    : `Bạn đã chi nhiều hơn tháng trước ${Math.abs(expenseChangePercent)}%. Hãy xem lại các hạng mục có vùng phủ lớn trên biểu đồ để cân đối.`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-1.5">
            <Icon path={mdiChartTimelineVariant} size={1.5} className="opacity-40" />
            <span className="text-xs font-semibold">Chưa có đủ dữ liệu giao dịch để so sánh</span>
          </div>
        )}
      </div>
    </div>
  );
}
