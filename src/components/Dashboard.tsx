import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Icon } from "@mdi/react";
import {
  mdiWallet, mdiTrendingUp, mdiTrendingDown, mdiArrowDownBold, mdiArrowUpBold,
  mdiAlertCircleOutline, mdiChartTimelineVariant, mdiChevronRight, mdiShieldAlertOutline,
  mdiCheckCircleOutline, mdiChartLine, mdiChartAreaspline, mdiChartBar, mdiAutoFix,
  mdiLoading, mdiRefresh
} from "@mdi/js";
import { Transaction, DebtAccount, Category, Budget } from "../types";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
type Debt = DebtAccount;

interface DashboardProps {
  transactions: Transaction[];
  debts: Debt[];
  categories: Category[];
  budgets?: Budget[];
  onNavigateToTab: (tab: number) => void;
  username?: string;
}

export default function Dashboard({
  transactions,
  debts,
  categories,
  budgets = [],
  onNavigateToTab,
  username = "bạn"
}: DashboardProps) {

  const formatVND = (num: number) => {
    const valueInK = Math.round(num / 1000);
    return new Intl.NumberFormat("vi-VN").format(valueInK) + "k";
  };

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayablesMonthly = debts
    .filter((d) => d.status === 'active')
    .reduce((sum, d) => sum + d.monthlyPayment, 0);

  const totalDebtBalance = debts
    .filter((d) => d.status === 'active')
    .reduce((sum, d) => sum + d.currentBalance, 0);

  const totalReceivables = 0;

  const availableCashflow = (totalReceivables + totalIncome) - (totalPayablesMonthly + totalExpense);

  const netDebt = totalDebtBalance - totalReceivables;

  const isPositiveTrend = totalIncome >= totalExpense;
  const trendPercentage = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  const categorySpentMap: { [key: string]: number } = {};
  categories.forEach(c => { categorySpentMap[c.name] = 0; });
  categorySpentMap["Khác"] = 0;

  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const cat = t.category;
      if (categorySpentMap[cat] !== undefined) {
        categorySpentMap[cat] += t.amount;
      } else {
        categorySpentMap["Khác"] += t.amount;
      }
    });

  const colorHexMap: Record<string, string> = {
    red: '#FED7D7', amber: '#FEEBC8', blue: '#EBF8FF', teal: '#E6FFFA',
    emerald: '#D1FAE5', slate: '#EDF2F7', indigo: '#E0E7FF', rose: '#FFE4E6',
    purple: '#F3E8FF', orange: '#FFEDD5',
  };

  const getColor = (name: string) => {
    const cat = categories.find(c => c.name === name);
    if (cat) return colorHexMap[cat.color] || '#EDF2F7';
    return '#EDF2F7';
  };

  const categoriesData = Object.keys(categorySpentMap).map((key) => ({
    name: key,
    value: categorySpentMap[key],
    color: getColor(key),
  }));

  const totalExpenseComputed = categoriesData.reduce((sum, c) => sum + c.value, 0);

  let cumulativePercent = 0;
  const donutSlices = categoriesData
    .filter(c => c.value > 0)
    .map((c) => {
      const percent = (c.value / (totalExpenseComputed || 1)) * 100;
      const startPercent = cumulativePercent;
      cumulativePercent += percent;

      const getCoordinatesForPercent = (percentValue: number) => {
        const x = Math.cos(2 * Math.PI * percentValue);
        const y = Math.sin(2 * Math.PI * percentValue);
        return [x, y];
      };

      const [startX, startY] = getCoordinatesForPercent(startPercent / 100);
      const [endX, endY] = getCoordinatesForPercent(cumulativePercent / 100);

      const largeArcFlag = percent > 50 ? 1 : 0;

      const pathData = [
        `M ${startX} ${startY}`,
        `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
        `L 0 0`
      ].join(' ');

      return {
        name: c.name,
        color: c.color,
        pathData,
        value: c.value,
        percent: Math.round(percent)
      };
    });

  const [trendRange, setTrendRange] = useState<'7d' | '30d' | '12m'>('30d');
  const [chartView, setChartView] = useState<'trend' | 'networth'>('trend');

  const now = new Date();
  const trendData = useMemo(() => {
    const filtered = transactions.filter(t => {
      const d = new Date(t.date);
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      if (trendRange === '7d') return diff <= 7;
      if (trendRange === '30d') return diff <= 30;
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      return d >= yearAgo;
    });

    const daysAgo = trendRange === '7d' ? 7 : trendRange === '30d' ? 30 : 365;
    const map: Record<string, { date: string; income: number; expense: number }> = {};
    for (let i = daysAgo - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      map[key] = { date: key, income: 0, expense: 0 };
    }
    filtered.forEach(t => {
      if (map[t.date]) {
        if (t.type === 'income') map[t.date].income += t.amount;
        else map[t.date].expense += t.amount;
      }
    });
    return Object.values(map);
  }, [transactions, trendRange]);

  const netWorthData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const map: Record<string, { date: string; netWorth: number }> = {};
    sorted.forEach(t => {
      const key = t.date;
      if (!map[key]) map[key] = { date: key, netWorth: running };
      running += t.type === 'income' ? t.amount : -t.amount;
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
    if (trendRange === '12m') {
      const d = new Date(val + 'T00:00:00');
      return d.toLocaleDateString('vi-VN', { month: 'short' });
    }
    const d = new Date(val + 'T00:00:00');
    return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
  };

  const totalIncomeForecast = transactions
    .filter(t => t.type === 'income' && t.isRecurring)
    .reduce((s, t) => s + t.amount, 0);
  const avgIncome = transactions.filter(t => t.type === 'income').length > 0
    ? Math.round(transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) / Math.max(1, new Set(transactions.filter(t => t.type === 'income').map(t => t.date.slice(0, 7))).size))
    : 0;
  const incomeThisMonth = transactions
    .filter(t => t.type === 'income' && t.date.startsWith(now.toISOString().slice(0, 7)))
    .reduce((s, t) => s + t.amount, 0);
  const remainingDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const daysPassed = now.getDate();
  const projectedIncome = incomeThisMonth + (remainingDaysInMonth > 0 ? Math.round((incomeThisMonth / daysPassed) * remainingDaysInMonth) : 0);
  const budgetRemaining = 0; // placeholder

  const urgentDebts = debts
    .filter(d => d.currentBalance > 0 && d.installments.some(i => i.status === 'pending'))
    .sort((a, b) => {
      const aNext = a.installments.find(i => i.status === 'pending');
      const bNext = b.installments.find(i => i.status === 'pending');
      if (!aNext || !bNext) return 0;
      return new Date(aNext.dueDate).getTime() - new Date(bNext.dueDate).getTime();
    });

  // AI Insights
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);

  const fetchAiInsight = useCallback(async () => {
    const cached = localStorage.getItem('ai_insight_cache');
    const cachedDate = localStorage.getItem('ai_insight_date');
    const today = new Date().toISOString().split('T')[0];
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
          transactions, budgets, debts, savings,
          promptType: 'insights'
        }),
      });
      const data = await response.json();
      if (data.text) {
        setAiInsight(data.text);
        localStorage.setItem('ai_insight_cache', data.text);
        localStorage.setItem('ai_insight_date', today);
      }
    } catch { } finally {
      setAiLoading(false);
      setAiLoaded(true);
    }
  }, [transactions, budgets, debts, savings]);

  useEffect(() => { if (!aiLoaded && !aiLoading) fetchAiInsight(); }, [fetchAiInsight, aiLoaded, aiLoading]);

  return (
    <div className="space-y-6 pb-40">
      <div id="header-section" className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">TÀI KHOẢN CỦA TÔI</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Chào {username}!</h1>
        </div>
      </div>

      <div id="net-balance-card" className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[28px] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="p-2 rounded-2xl bg-slate-100 text-slate-700">
              <Icon path={mdiWallet} size={1} />
            </div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Khả Dụng</span>
          </div>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
            isPositiveTrend ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}>
            {isPositiveTrend ? <Icon path={mdiTrendingUp} size={0.75} /> : <Icon path={mdiTrendingDown} size={0.75} />}
            <span>{isPositiveTrend ? `+${trendPercentage}%` : `-${trendPercentage}%`}</span>
          </div>
        </div>

        <div className="mt-3">
          <h2 className={`text-2xl font-extrabold tracking-tight ${availableCashflow >= 0 ? "text-slate-900" : "text-rose-600"}`}>
            {formatVND(availableCashflow)}
          </h2>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">Đã đồng bộ công nợ & thu chi</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
              <Icon path={mdiArrowDownBold} size={0.75} className="text-emerald-500" />
              Nợ thu (+)
            </span>
            <span className="text-xs font-extrabold text-emerald-600 block mt-0.5">{formatVND(totalReceivables)}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
              <Icon path={mdiArrowUpBold} size={0.75} className="text-rose-500" />
              Trả nợ tháng (-)
            </span>
            <span className="text-xs font-extrabold text-rose-500 block mt-0.5">{formatVND(totalPayablesMonthly)}</span>
          </div>
        </div>
      </div>

      <div id="quick-cashflow-split" className="grid grid-cols-2 gap-3">
        <div className="bg-white/80 backdrop-blur-md border border-white/40 rounded-[24px] p-3 flex items-center gap-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.02)]">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
            <Icon path={mdiArrowDownBold} size={1} />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">Thu nhập</span>
            <span className="text-xs font-extrabold text-emerald-700 block mt-0.5 truncate">{formatVND(totalIncome)}</span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md border border-white/40 rounded-[24px] p-3 flex items-center gap-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.02)]">
          <div className="p-2 rounded-xl bg-rose-100 text-rose-600 shrink-0">
            <Icon path={mdiArrowUpBold} size={1} />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block truncate">Chi tiêu</span>
            <span className="text-xs font-extrabold text-rose-700 block mt-0.5 truncate">{formatVND(totalExpense)}</span>
          </div>
        </div>
      </div>

      {/* MONTH COMPARISON */}
      {(() => {
        const now = new Date();
        const thisMonth = now.toISOString().slice(0, 7);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
        const monthIncome = transactions.filter(t => t.type === 'income' && t.date.startsWith(thisMonth)).reduce((s, t) => s + t.amount, 0);
        const monthExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(thisMonth)).reduce((s, t) => s + t.amount, 0);
        const lastIncome = transactions.filter(t => t.type === 'income' && t.date.startsWith(lastMonth)).reduce((s, t) => s + t.amount, 0);
        const lastExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(lastMonth)).reduce((s, t) => s + t.amount, 0);
        const incomeChange = lastIncome > 0 ? Math.round((monthIncome - lastIncome) / lastIncome * 100) : 0;
        const expenseChange = lastExpense > 0 ? Math.round((monthExpense - lastExpense) / lastExpense * 100) : 0;

        return (
          <div className="bg-white/80 backdrop-blur-md border border-white/40 rounded-[24px] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">So sánh tháng này / tháng trước</h3>
              <span className="text-[9px] text-slate-400 font-medium">{now.toLocaleDateString('vi-VN', { month: 'long' })}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Thu</span>
                  <span className={`text-[10px] font-black flex items-center gap-0.5 ${incomeChange >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    <Icon path={incomeChange >= 0 ? mdiTrendingUp : mdiTrendingDown} size={0.667} />
                    {incomeChange >= 0 ? '+' : ''}{incomeChange}%
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-slate-800">{formatVND(monthIncome)}</span>
                  <span className="text-[9px] text-slate-400 font-medium">{formatVND(lastIncome)}</span>
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Chi</span>
                  <span className={`text-[10px] font-black flex items-center gap-0.5 ${expenseChange <= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    <Icon path={expenseChange <= 0 ? mdiTrendingDown : mdiTrendingUp} size={0.667} />
                    {expenseChange > 0 ? '+' : ''}{expenseChange}%
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-slate-800">{formatVND(monthExpense)}</span>
                  <span className="text-[9px] text-slate-400 font-medium">{formatVND(lastExpense)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div id="charts-section" className="bg-white/80 backdrop-blur-md border border-white/40 rounded-[28px] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <button onClick={() => setChartView('trend')}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                chartView === 'trend' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
              }`}>
              <Icon path={mdiChartLine} size={0.667} />Xu hướng
            </button>
            <button onClick={() => setChartView('networth')}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                chartView !== 'trend' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'
              }`}>
              <Icon path={mdiChartAreaspline} size={0.667} />Tài sản
            </button>
          </div>
          {chartView === 'trend' && (
            <div className="flex items-center gap-1 bg-slate-50 rounded-full p-0.5">
              {(['7d', '30d', '12m'] as const).map(r => (
                <button key={r} onClick={() => setTrendRange(r)}
                  className={`text-[9px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                    trendRange === r ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  {r === '7d' ? '7 ngày' : r === '30d' ? '30 ngày' : '12 tháng'}
                </button>
              ))}
            </div>
          )}
        </div>

        {chartView === 'trend' ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => Math.round(v / 1000) + 'k'} />
                <Tooltip
                  contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', fontSize: 11 }}
                  formatter={(value: number, name: string) => [new Intl.NumberFormat('vi-VN').format(value) + 'đ', name === 'income' ? 'Thu nhập' : 'Chi tiêu']}
                  labelFormatter={(label: string) => new Date(label + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                />
                <Line type="monotone" dataKey="income" stroke="#059669" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#059669' }} />
                <Line type="monotone" dataKey="expense" stroke="#e11d48" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#e11d48' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netWorthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={(val: string) => new Date(val + 'T00:00:00').toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => Math.round(v / 1000) + 'k'} />
                <Tooltip
                  contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', fontSize: 11 }}
                  formatter={(value: number) => [new Intl.NumberFormat('vi-VN').format(value) + 'đ', 'Tài sản ròng']}
                  labelFormatter={(label: string) => new Date(label + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                />
                <defs>
                  <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="netWorth" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#netWorthGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div id="health-diagnostics-bar">
        {netDebt <= 0 ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-[24px] p-4 flex items-start gap-3">
            <Icon path={mdiCheckCircleOutline} size={1.25} className="text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-emerald-800">Dòng tiền an toàn</h3>
              <p className="text-xs text-emerald-600/90 mt-0.5">Các khoản nợ phải trả nhỏ hơn nợ thu hồi. Sức khỏe tài chính đang ở trạng thái an toàn tuyệt vời. Hãy duy trì tích lũy!</p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-100 rounded-[24px] p-4 flex items-start gap-3">
            <Icon path={mdiShieldAlertOutline} size={1.25} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-amber-800">Cảnh báo dư nợ ròng dương</h3>
              <p className="text-xs text-amber-600/90 mt-0.5">Bạn đang nợ nhiều hơn số tiền có thể thu hồi ({formatVND(netDebt)} ròng). Hãy cân nhắc sử dụng tính năng **Cố vấn AI Gemini** để nhận giải pháp cơ cấu nợ.</p>
            </div>
          </div>
        )}
      </div>

      <div id="cashflow-forecast-card" className="bg-white/80 backdrop-blur-md border border-white/40 rounded-[28px] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Dự Báo Dòng Tiền</h3>
          <span className="text-[10px] font-bold text-slate-400">{new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-slate-50 rounded-2xl p-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Thu nhập</span>
            <span className="text-xs font-extrabold text-emerald-600 mt-0.5 block">{formatVND(incomeThisMonth)}</span>
            <span className="text-[9px] text-slate-400 font-medium">Dự kiến: {formatVND(projectedIncome)}</span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Đã chi</span>
            <span className="text-xs font-extrabold text-rose-600 mt-0.5 block">{formatVND(totalExpense)}</span>
            <span className="text-[9px] text-slate-400 font-medium">Trả nợ: {formatVND(totalPayablesMonthly)}</span>
          </div>
          <div className="bg-slate-50 rounded-2xl p-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Dự báo</span>
            <span className={`text-xs font-extrabold mt-0.5 block ${projectedIncome - totalExpense - totalPayablesMonthly >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatVND(projectedIncome - totalExpense - totalPayablesMonthly)}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">Cuối tháng</span>
          </div>
        </div>
        {projectedIncome - totalExpense - totalPayablesMonthly < 0 && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 flex items-center gap-2">
            <Icon path={mdiAlertCircleOutline} size={0.75} className="text-rose-500 shrink-0" />
            <span className="text-[10px] font-bold text-rose-600">Dự báo âm. Cần cắt giảm chi tiêu hoặc tăng thu nhập.</span>
          </div>
        )}
      </div>

      <div className="bg-white/80 backdrop-blur-md border border-white/40 rounded-[28px] p-6 shadow-[0_12px_36px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Cơ Cấu Chi Tiêu Tháng Này</h3>
          <button onClick={() => setChartView(chartView === 'trend' ? 'networth' : 'trend')}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer">
            <Icon path={mdiChartBar} size={0.667} />
          </button>
        </div>
        <div className="h-32 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCategories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => Math.round(v / 1000) + 'k'} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip
                contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', fontSize: 11 }}
                formatter={(value: number) => [new Intl.NumberFormat('vi-VN').format(value) + 'đ', 'Chi tiêu']}
              />
              <Bar dataKey="value" fill="#0ea5e9" radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col items-center gap-6 mt-6">
          <div className="relative w-36 h-36 shrink-0">
            {totalExpenseComputed === 0 ? (
              <div className="w-full h-full rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs text-center p-4">Chưa có dữ liệu chi tiêu</div>
            ) : (
              <svg className="w-full h-full transform -rotate-90" viewBox="-1.2 -1.2 2.4 2.4">
                {donutSlices.map((slice, index) => (
                  <path key={index} d={slice.pathData} fill={slice.color} className="hover:opacity-90 transition-opacity cursor-pointer" />
                ))}
                <circle cx="0" cy="0" r="0.65" fill="#ffffff" />
              </svg>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng chi</span>
              <span className="text-sm font-black text-slate-800 mt-0.5">{formatVND(totalExpenseComputed)}</span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-3">
            {categoriesData.sort((a, b) => b.value - a.value).map((cat, idx) => {
              const pct = totalExpenseComputed > 0 ? Math.round((cat.value / totalExpenseComputed) * 100) : 0;
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border border-white/60" style={{ backgroundColor: cat.color }} />
                    <span className="font-semibold text-slate-600">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-medium">{formatVND(cat.value)}</span>
                    <span className="font-bold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded-md min-w-[32px] text-center">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {urgentDebts.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md border border-white/40 rounded-[28px] p-6 shadow-[0_12px_36px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Icon path={mdiAlertCircleOutline} size={1} className="text-rose-500" />
              Hồ Sơ Nợ Khẩn Cấp
            </h3>
            <button onClick={() => onNavigateToTab(4)} className="text-xs font-bold text-slate-500 flex items-center hover:text-slate-800 transition-colors cursor-pointer">
              Xem tất cả <Icon path={mdiChevronRight} size={1} />
            </button>
          </div>

          <div className="space-y-3">
            {urgentDebts.slice(0, 2).map((debt) => {
              const typeLabel: Record<string, string> = { installment: 'Trả góp', credit_card: 'Thẻ TD', friend: 'Bạn bè' };
              const percentPaid = debt.originalAmount > 0 ? Math.round(((debt.originalAmount - debt.currentBalance) / debt.originalAmount) * 100) : 0;

              return (
                <div key={debt.id} className="bg-white/40 border border-white/60 rounded-2xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">
                        {typeLabel[debt.type] || 'Nợ'}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{debt.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      Còn {debt.totalInstallments - debt.paidInstallments}/{debt.totalInstallments} kỳ
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 block">{formatVND(debt.currentBalance)}</span>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Đã trả {percentPaid}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI INSIGHTS CARD */}
      <div id="ai-insights-card" className="bg-white/80 backdrop-blur-md border border-white/40 rounded-[28px] p-5 shadow-[0_12px_36px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Icon path={mdiAutoFix} size={0.875} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Gợi Ý từ AI</h3>
          </div>
          <button
            onClick={() => { setAiLoaded(false); localStorage.removeItem('ai_insight_cache'); }}
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
            <p className="text-xs text-slate-600 leading-relaxed font-medium">{aiInsight}</p>
          ) : (
            <p className="text-xs text-slate-400 font-medium italic">Chưa có dữ liệu. Thêm giao dịch để AI phân tích.</p>
          )}
        </div>
      </div>
    </div>
  );
}