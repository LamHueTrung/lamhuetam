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
  mdiCheckCircleOutline,
  mdiChartLine,
  mdiChartAreaspline,
  mdiChartBar,
  mdiAutoFix,
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
} from "../types";
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

  const [trendRange, setTrendRange] = useState<"7d" | "30d" | "12m">("30d");
  const [showAmounts, setShowAmounts] = useState(false);
  const [spendingTab, setSpendingTab] = useState<"expense" | "income">(
    "expense",
  );

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
      const key = d.toISOString().split("T")[0];
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
    if (trendRange === "12m") {
      const d = new Date(val + "T00:00:00");
      return d.toLocaleDateString("vi-VN", { month: "short" });
    }
    const d = new Date(val + "T00:00:00");
    return d.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
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

  // AI Insights
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);

  const fetchAiInsight = useCallback(async () => {
    const cached = localStorage.getItem("ai_insight_cache");
    const cachedDate = localStorage.getItem("ai_insight_date");
    const today = new Date().toISOString().split("T")[0];
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

  // useEffect(() => {
  //   if (!aiLoaded && !aiLoading) fetchAiInsight();
  // }, [fetchAiInsight, aiLoaded, aiLoading]);

  return (
    <div className="space-y-6 pb-40">
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

      {/* ── 2. Combined Trend Chart ── */}
      <div className="bg-white/80 backdrop-blur-md border border-white/40 rounded-[28px] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <Icon path={mdiChartTimelineVariant} size={0.875} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">
              Xu Hướng Thu Chi
            </h3>
          </div>
          <div className="flex items-center gap-1 bg-slate-50 rounded-full p-0.5">
            {(["7d", "30d", "12m"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTrendRange(r)}
                className={`text-[9px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  trendRange === r
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {r === "7d" ? "7 ngày" : r === "30d" ? "30 ngày" : "12 tháng"}
              </button>
            ))}
          </div>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => Math.round(v / 1000) + "k"}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                  fontSize: 11,
                }}
                formatter={(value: number, name: string) => [
                  new Intl.NumberFormat("vi-VN").format(value) + "đ",
                  name === "income"
                    ? "Thu nhập"
                    : name === "expense"
                      ? "Chi tiêu"
                      : "Chênh lệch",
                ]}
                labelFormatter={(label: string) =>
                  new Date(label + "T00:00:00").toLocaleDateString("vi-VN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                }
              />
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
              <Area
                type="monotone"
                dataKey="income"
                stroke="#059669"
                strokeWidth={2}
                fill="url(#incomeGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#059669" }}
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#e11d48"
                strokeWidth={2}
                fill="url(#expenseGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#e11d48" }}
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

      {urgentDebts.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md border border-white/40 rounded-[28px] p-6 shadow-[0_12px_36px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Icon
                path={mdiAlertCircleOutline}
                size={1}
                className="text-rose-500"
              />
              Hồ Sơ Nợ Khẩn Cấp
            </h3>
            <button
              onClick={() => onNavigateToTab(4)}
              className="text-xs font-bold text-slate-500 flex items-center hover:text-slate-800 transition-colors cursor-pointer"
            >
              Xem tất cả <Icon path={mdiChevronRight} size={1} />
            </button>
          </div>

          <div className="space-y-3">
            {urgentDebts.slice(0, 2).map((debt) => {
              const typeLabel: Record<string, string> = {
                installment: "Trả góp",
                credit_card: "Thẻ TD",
                friend: "Bạn bè",
              };
              const percentPaid = calcPaidPercent(debt);

              return (
                <div
                  key={debt.id}
                  className="bg-white/40 border border-white/60 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">
                        {typeLabel[debt.type] || "Nợ"}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {debt.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      Còn {debt.totalInstallments - debt.paidInstallments}/
                      {debt.totalInstallments} kỳ
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 block">
                      {formatVND(debt.currentBalance)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                      Đã trả {percentPaid}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI INSIGHTS CARD */}
      {/* <div
        id="ai-insights-card"
        className="bg-white/80 backdrop-blur-md border border-white/40 rounded-[28px] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.03)]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Icon path={mdiAutoFix} size={0.875} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">
              Gợi Ý từ AI
            </h3>
          </div>
          <button
            onClick={() => {
              setAiLoaded(false);
              localStorage.removeItem("ai_insight_cache");
            }}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
          >
            <Icon path={mdiRefresh} size={0.75} />
            Làm mới
          </button>
        </div>
        <div className="min-h-[40px]">
          {aiLoading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Icon path={mdiLoading} size={1} className="animate-spin" />
              <span className="text-xs font-medium">AI đang phân tích...</span>
            </div>
          ) : aiInsight ? (
            <div className="markdown-body prose prose-sm max-w-none prose-slate dark:prose-invert text-xs leading-relaxed font-medium">
              <Markdown>{aiInsight}</Markdown>
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-medium italic">
              Chưa có dữ liệu. Thêm giao dịch để AI phân tích.
            </p>
          )}
        </div>
      </div> */}
    </div>
  );
}
