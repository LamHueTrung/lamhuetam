import React, { useState, useMemo, useEffect } from 'react';
import { Icon } from '@mdi/react';
import {
  mdiFirework,
  mdiGiftOutline,
  mdiTune,
  mdiCreation,
  mdiShieldCheckOutline,
  mdiAlertCircleOutline,
  mdiChartTimelineVariant,
  mdiChevronDown,
  mdiChevronUp,
  mdiClose,
  mdiCalendarClockOutline,
  mdiBookOpenVariantOutline,
  mdiCashMultiple,
  mdiLayersOutline,
  mdiChartAreaspline,
  mdiTrendingUp,
  mdiCreditCardOutline,
  mdiPiggyBankOutline,
} from '@mdi/js';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import {
  generateTetProjection,
  TetPlannerConfig,
} from '../utils/tetFinancialPlanner';
import { DebtAccount, Transaction, SalaryConfig } from '../types';
import { useSalary } from '../hooks/useSalary';
import { calcRemainingBalance } from '../lib/debtUtils';

interface TetFinancialPlannerProps {
  salaryConfig?: SalaryConfig | null;
  debts?: DebtAccount[];
  totalFixed?: number;
  transactions?: Transaction[];
  initialSavings?: number;
  onNavigateToTab?: (tab: number) => void;
  onClose?: () => void;
}

export default function TetFinancialPlanner({
  salaryConfig: externalSalaryConfig,
  debts = [],
  totalFixed = 0,
  transactions = [],
  initialSavings: propInitialSavings,
  onNavigateToTab,
  onClose,
}: TetFinancialPlannerProps) {
  const { salaryConfig: internalSalaryConfig } = useSalary();
  const salaryConfig = externalSalaryConfig || internalSalaryConfig;

  // Lương thực nhận mặc định
  const defaultNetSalary = salaryConfig?.netSalary && salaryConfig.netSalary > 0
    ? salaryConfig.netSalary
    : 15000000;

  // Chuẩn bị danh sách nợ với số dư thực tế còn lại
  const debtPlanItems = useMemo(() => {
    return debts
      .filter((d) => d.status === 'active')
      .map((d) => ({
        id: d.id,
        name: d.name,
        currentBalance: calcRemainingBalance(d),
        monthlyPayment: d.monthlyPayment || 0,
      }));
  }, [debts]);

  const totalRemainingDebt = useMemo(() => {
    return debtPlanItems.reduce((sum, d) => sum + d.currentBalance, 0);
  }, [debtPlanItems]);

  // Tính chi tiêu sinh hoạt bình quân thực tế từ Sổ cái (loại trừ nợ & cố định để tránh tính trùng)
  const { ledgerMonthlyAvg, ledgerMonthsCount } = useMemo(() => {
    if (!transactions.length) {
      return { ledgerMonthlyAvg: 5000000, ledgerMonthsCount: 0 };
    }

    const monthlyExpensesMap: Record<string, number> = {};
    const debtOrFixedKeywords = [
      'trả nợ',
      'tra no',
      'khoản nợ',
      'khoan no',
      'vay',
      'nợ',
      'cố định',
      'co dinh',
      'tiền nhà',
      'thuê nhà',
    ];

    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      const desc = (t.description || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      const isDebtOrFixed = debtOrFixedKeywords.some(
        (kw) => desc.includes(kw) || cat.includes(kw)
      );

      if (!isDebtOrFixed) {
        const mKey = t.date.substring(0, 7); // YYYY-MM
        monthlyExpensesMap[mKey] = (monthlyExpensesMap[mKey] || 0) + t.amount;
      }
    }

    const monthKeys = Object.keys(monthlyExpensesMap);
    if (monthKeys.length === 0) {
      return { ledgerMonthlyAvg: 5000000, ledgerMonthsCount: 0 };
    }

    // Lấy trung bình 3 tháng gần nhất
    monthKeys.sort().reverse();
    const recentMonths = monthKeys.slice(0, 3);
    const totalSpent = recentMonths.reduce((sum, k) => sum + monthlyExpensesMap[k], 0);
    const avg = Math.round(totalSpent / recentMonths.length);

    return {
      ledgerMonthlyAvg: avg > 0 ? avg : 5000000,
      ledgerMonthsCount: recentMonths.length,
    };
  }, [transactions]);

  // Tính số dư ví khả dụng ban đầu từ Sổ cái
  const defaultInitialSavings = useMemo(() => {
    if (typeof propInitialSavings === 'number') {
      return Math.max(0, propInitialSavings);
    }
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    return Math.max(0, income - expense);
  }, [propInitialSavings, transactions]);

  // Config States (Sliders & Inputs)
  const [netSalary, setNetSalary] = useState<number>(defaultNetSalary);
  const [expectedBonus, setExpectedBonus] = useState<number>(defaultNetSalary);
  const [solarExpense, setSolarExpense] = useState<number>(2000000);
  const [lunarExpense, setLunarExpense] = useState<number>(8000000);
  const [monthlyLiving, setMonthlyLiving] = useState<number>(ledgerMonthlyAvg);
  const [initialSavings, setInitialSavings] = useState<number>(defaultInitialSavings);

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'timeline'>('chart');
  const [chartMode, setChartMode] = useState<'overview' | 'breakdown'>('overview');

  // Đồng bộ khi salaryConfig hoặc ledger thay đổi
  useEffect(() => {
    if (salaryConfig?.netSalary && salaryConfig.netSalary > 0) {
      setNetSalary(salaryConfig.netSalary);
      setExpectedBonus(salaryConfig.netSalary);
    }
  }, [salaryConfig]);

  useEffect(() => {
    setMonthlyLiving(ledgerMonthlyAvg);
  }, [ledgerMonthlyAvg]);

  useEffect(() => {
    setInitialSavings(defaultInitialSavings);
  }, [defaultInitialSavings]);

  // Sinh kết quả dự phóng với dữ liệu nợ thực tế
  const projection = useMemo(() => {
    const config: TetPlannerConfig = {
      netSalary,
      expectedBonus,
      solarNewYearExpense: solarExpense,
      lunarNewYearExpense: lunarExpense,
      monthlyFixedExpense: totalFixed,
      debts: debtPlanItems,
      monthlyLivingBudget: monthlyLiving,
      initialSavings,
    };
    return generateTetProjection(config);
  }, [
    netSalary,
    expectedBonus,
    solarExpense,
    lunarExpense,
    totalFixed,
    debtPlanItems,
    monthlyLiving,
    initialSavings,
  ]);

  const { countdown, months, finalTetFund, safeScore, isSafe } = projection;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
  };

  const formatCompactVND = (num: number) => {
    if (Math.abs(num) >= 1000000) {
      return (num / 1000000).toFixed(1).replace('.0', '') + ' tr';
    }
    if (Math.abs(num) >= 1000) {
      return Math.round(num / 1000) + ' k';
    }
    return num + ' đ';
  };

  const chartData = useMemo(() => {
    return months.map((m) => ({
      name: m.monthLabel,
      monthKey: m.monthKey,
      income: m.income,
      bonus: m.bonus,
      totalIncome: m.income + m.bonus,
      debtPayment: m.debtPayment,
      fixedExpense: m.fixedExpense,
      livingBudget: m.livingBudget,
      holidayExpense: m.holidayExpense,
      totalExpense: m.fixedExpense + m.debtPayment + m.livingBudget + m.holidayExpense,
      cumulativeFund: m.cumulativeFund,
      netSavings: m.netSavings,
      isSolar: m.isSolarMonth,
      isLunar: m.isLunarMonth,
      isCurrent: m.isCurrentMonth,
    }));
  }, [months]);

  // Tìm tháng sạch bóng nợ
  const debtFreeMonth = useMemo(() => {
    if (totalRemainingDebt === 0) return 'Đã hết nợ';
    const lastDebtMonth = [...months].reverse().find((m) => m.debtPayment > 0);
    if (!lastDebtMonth) return 'Đã hết nợ';
    const idx = months.findIndex((m) => m.monthKey === lastDebtMonth.monthKey);
    if (idx < months.length - 1) {
      return `Hết nợ từ ${months[idx + 1].monthLabel.split(' ')[0]}`;
    }
    return 'Hết nợ tháng Tết';
  }, [months, totalRemainingDebt]);

  // Đỉnh tích lũy
  const peakFund = useMemo(() => {
    return Math.max(...months.map((m) => m.cumulativeFund), finalTetFund);
  }, [months, finalTetFund]);

  // Custom Glassmorphism Tooltip
  const CustomTetTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-slate-950/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-amber-400/50 rounded-2xl p-3.5 shadow-2xl text-white text-xs max-w-xs space-y-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-white/15 pb-2 gap-2">
          <div className="font-black text-amber-300 flex items-center gap-1.5 text-xs sm:text-sm">
            {data.isLunar && <span>🌸</span>}
            {data.isSolar && !data.isLunar && <span>🎆</span>}
            <span>{data.name}</span>
          </div>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              data.netSavings >= 0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            {data.netSavings >= 0 ? '+' : ''}
            {formatVND(data.netSavings)}
          </span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          {/* Nguồn Thu */}
          <div className="flex justify-between items-center text-emerald-300 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs" />
              Lương thực nhận:
            </span>
            <span className="font-bold">{formatVND(data.income)}</span>
          </div>

          {data.bonus > 0 && (
            <div className="flex justify-between items-center text-amber-300 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-xs" />
                🧧 Thưởng Tết:
              </span>
              <span>+{formatVND(data.bonus)}</span>
            </div>
          )}

          <div className="h-px bg-white/10 my-1" />

          {/* Các Khoản Chi */}
          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-400 shadow-xs" />
              Sinh hoạt phí:
            </span>
            <span className="font-medium">-{formatVND(data.livingBudget)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 shadow-xs" />
              Chi phí cố định:
            </span>
            <span className="font-medium">-{formatVND(data.fixedExpense)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-rose-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-xs" />
              Trả nợ định kỳ:
            </span>
            <span className={`font-bold ${data.debtPayment > 0 ? 'text-rose-300' : 'text-emerald-400'}`}>
              {data.debtPayment > 0 ? `-${formatVND(data.debtPayment)}` : '0 đ (Đã hết nợ)'}
            </span>
          </div>

          {data.holidayExpense > 0 && (
            <div className="flex justify-between items-center text-pink-300 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pink-500 shadow-xs" />
                🌸 Tiêu & Sắm Tết:
              </span>
              <span>-{formatVND(data.holidayExpense)}</span>
            </div>
          )}
        </div>

        {/* Tổng Quỹ Tích Lũy */}
        <div className="pt-2 border-t border-white/15 flex justify-between items-center font-black">
          <span className="text-[10px] text-amber-200 uppercase tracking-wider">Quỹ tích lũy:</span>
          <span className={`text-xs ${data.cumulativeFund >= 0 ? 'text-amber-300 drop-shadow-xs' : 'text-rose-400'}`}>
            {formatVND(data.cumulativeFund)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-2 text-slate-800 dark:text-slate-100">
      {/* 🌸 Hero Header: Lễ Hội Tết Sang Trọng & Rực Rỡ */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#e11d48] via-[#dc2626] to-[#b45309] dark:from-[#881337] dark:via-[#7f1d1d] dark:to-[#78350f] text-white p-4 sm:p-6 border-2 border-amber-300/60 dark:border-amber-500/40 shadow-2xl">
        {/* Glow ambient effects & decorative lights */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-300/30 dark:bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-rose-500/40 dark:bg-rose-600/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-yellow-400/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Header Row: Chống bể layout linh hoạt */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-red-950 shadow-lg shadow-amber-500/30 border border-yellow-200 shrink-0">
                <Icon path={mdiFirework} size={1.1} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black tracking-tight text-white drop-shadow-md">
                    Kế Hoạch Tài Chính Đón Tết
                  </h2>
                  <span className="text-[10px] sm:text-[11px] bg-gradient-to-r from-amber-300 to-yellow-300 text-red-950 font-black px-2.5 py-0.5 rounded-full shadow-md border border-amber-100 shrink-0">
                    🌸 Năm {countdown.lunarAnimal}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-amber-100/95 font-medium mt-0.5 drop-shadow-xs">
                  Dự phóng dòng tiền thực tế từ Sổ cái & Sổ nợ đến Tết Nguyên Đán
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setIsCustomizing(!isCustomizing)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border shadow-md active:scale-95 ${
                  isCustomizing
                    ? 'bg-amber-300 text-red-950 border-amber-200 shadow-amber-400/30'
                    : 'bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-md'
                }`}
              >
                <Icon path={mdiTune} size={0.7} />
                <span>{isCustomizing ? 'Đóng' : 'Tùy chỉnh'}</span>
                <Icon path={isCustomizing ? mdiChevronUp : mdiChevronDown} size={0.65} />
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/30 hover:bg-black/50 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20 shadow-sm shrink-0"
                  title="Đóng"
                >
                  <Icon path={mdiClose} size={0.85} />
                </button>
              )}
            </div>
          </div>

          {/* 🌟 2 Countdown Cards: Tết Tây & Tết Ta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Tết Tây Card */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-br from-indigo-950/90 via-slate-900/90 to-blue-950/90 backdrop-blur-xl rounded-2xl border-2 border-cyan-400/60 flex items-center justify-between shadow-xl shadow-indigo-950/40 group hover:border-cyan-300 transition-all">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-md shrink-0">
                  <Icon path={mdiFirework} size={0.85} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-cyan-300 uppercase tracking-widest block truncate">
                    🎆 Tết Dương Lịch {countdown.solarYear}
                  </span>
                  <p className="text-xs font-black text-white mt-0.5 truncate">
                    Ngày {countdown.solarDateStr}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-cyan-400 drop-shadow-sm">
                  {countdown.daysToSolar}
                </span>
                <span className="text-[9px] sm:text-[10px] text-cyan-200/90 block font-bold uppercase tracking-wider">
                  ngày nữa
                </span>
              </div>
            </div>

            {/* Tết Ta Card */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-br from-red-950/90 via-rose-900/90 to-amber-950/90 backdrop-blur-xl rounded-2xl border-2 border-amber-400 flex items-center justify-between shadow-xl shadow-red-950/50 group hover:border-amber-300 transition-all">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-red-950 shadow-md animate-pulse shrink-0">
                  <Icon path={mdiGiftOutline} size={0.85} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest block truncate">
                    🧧 Tết Nguyên Đán ({countdown.lunarAnimal})
                  </span>
                  <p className="text-xs font-black text-white mt-0.5 truncate">
                    Mùng 1: {countdown.lunarDateStr}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 drop-shadow-md">
                  {countdown.daysToLunar}
                </span>
                <span className="text-[9px] sm:text-[10px] text-amber-200/90 block font-bold uppercase tracking-wider">
                  ngày nữa
                </span>
              </div>
            </div>
          </div>

          {/* 💎 4 Golden KPI Metrics */}
          <div className="pt-3 border-t border-white/20 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 text-xs">
            {/* Quỹ Tết */}
            <div className="bg-amber-400/20 dark:bg-amber-950/50 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-amber-300/40 shadow-inner flex flex-col justify-between">
              <span className="text-[10px] text-amber-200 font-bold uppercase tracking-wider truncate">
                💰 Quỹ Ăn Tết Dự Kiến
              </span>
              <span
                className={`text-sm sm:text-base font-black mt-0.5 drop-shadow-sm truncate ${
                  finalTetFund >= 0 ? 'text-amber-300' : 'text-rose-300'
                }`}
              >
                {formatVND(finalTetFund)}
              </span>
            </div>

            {/* Độ an toàn */}
            <div className="bg-emerald-400/20 dark:bg-emerald-950/50 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-emerald-300/40 shadow-inner flex flex-col justify-between">
              <span className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider truncate">
                🛡️ Độ An Toàn
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-300 mt-0.5 flex items-center gap-1 truncate">
                <Icon
                  path={isSafe ? mdiShieldCheckOutline : mdiAlertCircleOutline}
                  size={0.65}
                  className="shrink-0"
                />
                <span className="truncate">{safeScore}/100 • {isSafe ? 'Rất tốt' : 'Cần chỉnh'}</span>
              </span>
            </div>

            {/* Thưởng Tết */}
            <div className="bg-sky-400/20 dark:bg-sky-950/50 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-sky-300/40 shadow-inner flex flex-col justify-between">
              <span className="text-[10px] text-sky-200 font-bold uppercase tracking-wider truncate">
                🧧 Dự Kiến Thưởng Tết
              </span>
              <span className="text-xs sm:text-sm font-black text-sky-200 mt-0.5 truncate">
                +{formatVND(expectedBonus)}
              </span>
            </div>

            {/* Trả nợ thực tế */}
            <div className="bg-rose-400/20 dark:bg-rose-950/50 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-rose-300/40 shadow-inner flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-rose-200 font-bold uppercase tracking-wider truncate">
                  💳 Tổng Trả Nợ Đến Tết
                </span>
              </div>
              <span
                className="text-xs sm:text-sm font-black text-rose-200 mt-0.5 truncate"
                title={`Tổng dư nợ thực tế: ${formatVND(totalRemainingDebt)}`}
              >
                -{formatVND(projection.totalDebtPaidAll)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🛠️ What-If Simulator: Bảng Điều Chỉnh Kịch Bản */}
      <AnimatePresence>
        {isCustomizing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 rounded-[28px] p-4 sm:p-5 border-2 border-amber-400/40 dark:border-amber-600/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-xs">
                    <Icon path={mdiTune} size={0.75} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Mô Phỏng Kịch Bản Thu & Chi Đón Tết (What-If Simulator)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Kéo thanh trượt hoặc chọn nhanh preset để xem quỹ Tết biến động tức thì
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {/* 1. Tiền Thưởng Tết */}
                <div className="space-y-2 p-3.5 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 dark:from-emerald-950/30 dark:to-teal-950/20 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-emerald-900 dark:text-emerald-300 flex items-center gap-1 font-black">
                      🧧 Thưởng Tết (Lương T13 / Thưởng):
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-black text-sm">
                      {formatVND(expectedBonus)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(50000000, netSalary * 3)}
                    step="500000"
                    value={expectedBonus}
                    onChange={(e) => setExpectedBonus(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-emerald-200 dark:bg-emerald-900 rounded-lg"
                  />
                  <div className="flex justify-between items-center gap-1 text-[10px] flex-wrap">
                    <button
                      type="button"
                      onClick={() => setExpectedBonus(0)}
                      className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-200 font-bold cursor-pointer transition-colors"
                    >
                      Không thưởng (0đ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpectedBonus(netSalary)}
                      className="px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 hover:bg-emerald-300 text-emerald-900 dark:text-emerald-100 font-black cursor-pointer transition-colors"
                    >
                      1 tháng ({formatCompactVND(netSalary)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpectedBonus(netSalary * 2)}
                      className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-200 font-bold cursor-pointer transition-colors"
                    >
                      2 tháng ({formatCompactVND(netSalary * 2)})
                    </button>
                  </div>
                </div>

                {/* 2. Chi Tiêu Tết Ta */}
                <div className="space-y-2 p-3.5 bg-gradient-to-br from-rose-50/90 to-red-50/70 dark:from-rose-950/30 dark:to-red-950/20 rounded-2xl border border-rose-300 dark:border-rose-800 shadow-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-rose-900 dark:text-rose-300 flex items-center gap-1 font-black">
                      🌸 Chi Tiêu Tết Ta (Lì xì, Sắm tết, Quà):
                    </span>
                    <span className="text-rose-700 dark:text-rose-400 font-black text-sm">
                      {formatVND(lunarExpense)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1000000"
                    max="30000000"
                    step="500000"
                    value={lunarExpense}
                    onChange={(e) => setLunarExpense(Number(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer h-2 bg-rose-200 dark:bg-rose-900 rounded-lg"
                  />
                  <div className="flex justify-between items-center gap-1 text-[10px] flex-wrap">
                    <button
                      type="button"
                      onClick={() => setLunarExpense(3000000)}
                      className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 text-rose-800 dark:text-rose-200 font-bold cursor-pointer transition-colors"
                    >
                      Tiết kiệm (3tr)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLunarExpense(8000000)}
                      className="px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-800 hover:bg-rose-300 text-rose-900 dark:text-rose-100 font-black cursor-pointer transition-colors"
                    >
                      Chuẩn (8tr)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLunarExpense(15000000)}
                      className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 text-rose-800 dark:text-rose-200 font-bold cursor-pointer transition-colors"
                    >
                      Thoải mái (15tr)
                    </button>
                  </div>
                </div>

                {/* 3. Chi Tiêu Tết Tây */}
                <div className="space-y-2 p-3.5 bg-gradient-to-br from-indigo-50/90 to-cyan-50/70 dark:from-indigo-950/30 dark:to-cyan-950/20 rounded-2xl border border-indigo-300 dark:border-indigo-800 shadow-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-indigo-900 dark:text-indigo-300 flex items-center gap-1 font-black">
                      🎆 Chi Tiêu Tết Tây (Tất niên, tiệc, đi chơi):
                    </span>
                    <span className="text-indigo-700 dark:text-indigo-400 font-black text-sm">
                      {formatVND(solarExpense)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="500000"
                    max="10000000"
                    step="500000"
                    value={solarExpense}
                    onChange={(e) => setSolarExpense(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-2 bg-indigo-200 dark:bg-indigo-900 rounded-lg"
                  />
                  <div className="flex justify-between items-center gap-1 text-[10px] flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSolarExpense(1000000)}
                      className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 text-indigo-800 dark:text-indigo-200 font-bold cursor-pointer transition-colors"
                    >
                      Nhẹ nhàng (1tr)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSolarExpense(2000000)}
                      className="px-2 py-0.5 rounded bg-indigo-200 dark:bg-indigo-800 hover:bg-indigo-300 text-indigo-900 dark:text-indigo-100 font-black cursor-pointer transition-colors"
                    >
                      Vừa phải (2tr)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSolarExpense(5000000)}
                      className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 hover:bg-indigo-200 text-indigo-800 dark:text-indigo-200 font-bold cursor-pointer transition-colors"
                    >
                      Tiệc lớn (5tr)
                    </button>
                  </div>
                </div>

                {/* 4. Hạn Mức Sinh Hoạt Hàng Tháng (Lấy từ Sổ cái) */}
                <div className="space-y-2 p-3.5 bg-gradient-to-br from-amber-50/90 to-yellow-50/70 dark:from-amber-950/30 dark:to-yellow-950/20 rounded-2xl border border-amber-300 dark:border-amber-800 shadow-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-amber-900 dark:text-amber-300 flex items-center gap-1 font-black">
                      🛒 Sinh hoạt mỗi tháng:
                    </span>
                    <span className="text-amber-700 dark:text-amber-400 font-black text-sm">
                      {formatVND(monthlyLiving)}
                    </span>
                  </div>
                  {ledgerMonthsCount > 0 && (
                    <div className="text-[10px] text-amber-800/90 dark:text-amber-300/90 flex items-center gap-1">
                      <Icon path={mdiBookOpenVariantOutline} size={0.55} className="shrink-0" />
                      <span>
                        Dựa trên Sổ cái (TB {ledgerMonthsCount} tháng): <b>{formatVND(ledgerMonthlyAvg)}/tháng</b>
                      </span>
                    </div>
                  )}
                  <input
                    type="range"
                    min="1000000"
                    max="25000000"
                    step="500000"
                    value={monthlyLiving}
                    onChange={(e) => setMonthlyLiving(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer h-2 bg-amber-200 dark:bg-amber-900 rounded-lg"
                  />
                  <div className="flex justify-between items-center gap-1 text-[10px] flex-wrap">
                    <button
                      type="button"
                      onClick={() => setMonthlyLiving(ledgerMonthlyAvg)}
                      className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 text-amber-900 dark:text-amber-100 font-black cursor-pointer transition-colors"
                    >
                      Chuẩn Sổ cái ({formatCompactVND(ledgerMonthlyAvg)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonthlyLiving(Math.round(ledgerMonthlyAvg * 0.8))}
                      className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-800 dark:text-amber-200 font-bold cursor-pointer transition-colors"
                    >
                      Tiết kiệm (-20%)
                    </button>
                  </div>
                </div>

                {/* 5. Số Dư Ban Đầu */}
                <div className="space-y-2 p-3.5 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-2xl border border-blue-300 dark:border-blue-800 shadow-xs sm:col-span-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-blue-900 dark:text-blue-300 flex items-center gap-1 font-black">
                      💰 Số dư quỹ hiện có (Khởi điểm):
                    </span>
                    <span className="text-blue-700 dark:text-blue-400 font-black text-sm">
                      {formatVND(initialSavings)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(50000000, initialSavings * 2)}
                    step="500000"
                    value={initialSavings}
                    onChange={(e) => setInitialSavings(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-blue-200 dark:bg-blue-900 rounded-lg"
                  />
                  <div className="flex justify-between items-center gap-1 text-[10px] flex-wrap">
                    <button
                      type="button"
                      onClick={() => setInitialSavings(0)}
                      className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 hover:bg-blue-200 text-blue-800 dark:text-blue-200 font-bold cursor-pointer transition-colors"
                    >
                      Bắt đầu từ 0đ
                    </button>
                    <button
                      type="button"
                      onClick={() => setInitialSavings(defaultInitialSavings)}
                      className="px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-800 hover:bg-blue-300 text-blue-900 dark:text-blue-100 font-black cursor-pointer transition-colors"
                    >
                      Theo Sổ cái ({formatCompactVND(defaultInitialSavings)})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📊 Biểu Đồ & Bản Đồ Lộ Trình */}
      <div className="bg-white dark:bg-slate-900 rounded-[28px] p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500 via-red-500 to-amber-500 text-white shadow-md shrink-0">
              <Icon path={mdiChartTimelineVariant} size={0.8} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Dự Phóng Dòng Tiền & Quỹ Tích Lũy
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Lộ trình chi tiết từng tháng đến Tết Nguyên Đán
              </p>
            </div>
          </div>

          {/* 🔘 Tab Buttons có Icon & Switch Mode */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
            {activeTab === 'chart' && (
              <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                <button
                  type="button"
                  onClick={() => setChartMode('overview')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    chartMode === 'overview'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Icon path={mdiChartAreaspline} size={0.55} />
                  <span>Tổng quan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('breakdown')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    chartMode === 'breakdown'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Icon path={mdiLayersOutline} size={0.55} />
                  <span>Bóc tách cơ cấu</span>
                </button>
              </div>
            )}

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
              <button
                type="button"
                onClick={() => setActiveTab('chart')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'chart'
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon path={mdiChartTimelineVariant} size={0.65} />
                <span>Biểu đồ</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'timeline'
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon path={mdiCalendarClockOutline} size={0.65} />
                <span>Bản đồ chặng</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Biểu đồ Recharts Sang Trọng */}
        {activeTab === 'chart' && (
          <div className="space-y-4">
            {/* Quick Metrics Bar on top of Chart */}
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
              <div className="space-y-0.5">
                <span className="text-slate-400 font-medium block text-[10px]">Đỉnh Tích Lũy</span>
                <span className="font-black text-amber-500 dark:text-amber-400">{formatCompactVND(peakFund)}</span>
              </div>
              <div className="space-y-0.5 border-x border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-400 font-medium block text-[10px]">Tiến Độ Trả Nợ</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">{debtFreeMonth}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 font-medium block text-[10px]">Tổng Chi Tiêu Tết</span>
                <span className="font-black text-pink-500 dark:text-pink-400">
                  {formatCompactVND(solarExpense + lunarExpense)}
                </span>
              </div>
            </div>

            <div className="h-68 sm:h-76 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 15, right: 12, left: -15, bottom: 5 }}
                >
                  <defs>
                    {/* Gradients cho Chế độ Tổng quan */}
                    <linearGradient id="ovIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="ovExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0.7} />
                    </linearGradient>

                    {/* Gradients cho Chế độ Bóc tách Stacked */}
                    <linearGradient id="salaryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity={0.75} />
                    </linearGradient>
                    <linearGradient id="bonusGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.85} />
                    </linearGradient>
                    <linearGradient id="livingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="fixedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#64748b" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#475569" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                      <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.85} />
                    </linearGradient>
                    <linearGradient id="holidayGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity={1} />
                      <stop offset="100%" stopColor="#be185d" stopOpacity={0.85} />
                    </linearGradient>

                    {/* Quỹ Tích Lũy Area Gradient */}
                    <linearGradient id="fundAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.12} />

                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${Math.round(val / 1000000)}M`}
                  />

                  <Tooltip content={<CustomTetTooltip />} />

                  {/* Vùng Area phát sáng cho Quỹ Tích Lũy */}
                  <Area
                    type="monotone"
                    dataKey="cumulativeFund"
                    fill="url(#fundAreaGrad)"
                    stroke="none"
                  />

                  {chartMode === 'overview' ? (
                    <>
                      {/* Chế độ Tổng Quan: 2 Cột Thu vs Chi */}
                      <Bar
                        dataKey="totalIncome"
                        name="Thu nhập & Thưởng"
                        fill="url(#ovIncomeGrad)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="totalExpense"
                        name="Chi tiêu & Trả nợ"
                        fill="url(#ovExpenseGrad)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={28}
                      />
                    </>
                  ) : (
                    <>
                      {/* Chế độ Bóc Tách: Stacked Bars */}
                      {/* Cột 1: Thu nhập (Lương + Thưởng) */}
                      <Bar
                        dataKey="income"
                        stackId="incomeStack"
                        name="Lương thực nhận"
                        fill="url(#salaryGrad)"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={24}
                      />
                      <Bar
                        dataKey="bonus"
                        stackId="incomeStack"
                        name="Thưởng Tết"
                        fill="url(#bonusGrad)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={24}
                      />

                      {/* Cột 2: Chi phí (Sinh hoạt + Cố định + Nợ + Tết) */}
                      <Bar
                        dataKey="livingBudget"
                        stackId="expenseStack"
                        name="Sinh hoạt phí"
                        fill="url(#livingGrad)"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={24}
                      />
                      <Bar
                        dataKey="fixedExpense"
                        stackId="expenseStack"
                        name="Chi phí cố định"
                        fill="url(#fixedGrad)"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={24}
                      />
                      <Bar
                        dataKey="debtPayment"
                        stackId="expenseStack"
                        name="Trả nợ định kỳ"
                        fill="url(#debtGrad)"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={24}
                      />
                      <Bar
                        dataKey="holidayExpense"
                        stackId="expenseStack"
                        name="Chi tiêu Tết"
                        fill="url(#holidayGrad)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={24}
                      />
                    </>
                  )}

                  {/* Đường Quỹ Tích Lũy Vàng Kim */}
                  <Line
                    type="monotone"
                    dataKey="cumulativeFund"
                    name="Quỹ tích lũy lũy kế"
                    stroke="#fbbf24"
                    strokeWidth={3.5}
                    dot={{ fill: '#f59e0b', r: 4.5, strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 7, stroke: '#ffffff', strokeWidth: 2.5 }}
                  />

                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" opacity={0.6} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Interactive Legend Bar */}
            {chartMode === 'overview' ? (
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xs inline-block" />
                  Thu nhập & Thưởng
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-gradient-to-br from-rose-400 to-rose-600 shadow-xs inline-block" />
                  Chi tiêu & Trả nợ
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-1.5 rounded-full bg-amber-400 shadow-xs inline-block" />
                  Đường Quỹ tích lũy
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800 font-semibold">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" /> Lương
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Thưởng Tết
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-violet-500 inline-block" /> Sinh hoạt
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-500 inline-block" /> Cố định
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Trả nợ
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-pink-500 inline-block" /> Sắm Tết
                </span>
                <span className="flex items-center gap-1 font-bold text-amber-500">
                  <span className="w-3.5 h-1 rounded-full bg-amber-400 inline-block" /> Quỹ tích lũy
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Bản đồ từng chặng (Timeline) */}
        {activeTab === 'timeline' && (
          <div className="space-y-3 pt-1">
            {months.map((m, idx) => (
              <div
                key={m.monthKey}
                className={`p-4 rounded-2xl border-2 transition-all shadow-sm ${
                  m.isCurrentMonth
                    ? 'bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-blue-500/10 border-cyan-400 dark:border-cyan-600 shadow-cyan-500/10'
                    : m.isLunarMonth
                    ? 'bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border-amber-400 dark:border-amber-500 shadow-amber-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-black shadow-md ${
                        m.isCurrentMonth
                          ? 'bg-gradient-to-br from-cyan-400 to-blue-600 text-white'
                          : m.isLunarMonth
                          ? 'bg-gradient-to-br from-amber-400 to-rose-600 text-white animate-pulse'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{m.monthLabel}</span>
                        {m.isCurrentMonth && (
                          <span className="text-[9px] bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-200 font-extrabold px-2 py-0.5 rounded-full border border-cyan-300">
                            Tháng hiện tại
                          </span>
                        )}
                        {m.isLunarMonth && (
                          <span className="text-[10px] bg-gradient-to-r from-amber-300 to-yellow-300 text-red-950 font-black px-2.5 py-0.5 rounded-full shadow-sm border border-amber-200">
                            🌸 Đích Đến Tết Ta
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        Thu: <b className="text-emerald-600 dark:text-emerald-400">{formatVND(m.income + m.bonus)}</b> • Chi & Nợ:{' '}
                        <b className="text-rose-600 dark:text-rose-400">
                          {formatVND(m.fixedExpense + m.debtPayment + m.livingBudget + m.holidayExpense)}
                        </b>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                      Tích lũy lũy kế
                    </span>
                    <span
                      className={`text-sm font-black ${
                        m.cumulativeFund >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatVND(m.cumulativeFund)}
                    </span>
                  </div>
                </div>

                {/* Chi tiết khấu trừ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
                  <span>💰 Lương: <b className="text-slate-900 dark:text-white">{formatVND(m.income)}</b></span>
                  <span>
                    💳 Trả nợ:{' '}
                    <b className={m.debtPayment > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                      {m.debtPayment > 0 ? formatVND(m.debtPayment) : '0 đ (Đã hết nợ)'}
                    </b>
                  </span>
                  <span>📌 Cố định: <b className="text-slate-900 dark:text-white">{formatVND(m.fixedExpense)}</b></span>
                  <span>
                    🛒 Sinh hoạt & Tết: <b className="text-amber-600 dark:text-amber-400">{formatVND(m.livingBudget + m.holidayExpense)}</b>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Financial Recommendation Callout */}
        <div className="p-4 bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-indigo-500/15 border-2 border-violet-400/40 dark:border-violet-600/40 rounded-2xl flex items-start gap-3 text-xs text-violet-950 dark:text-violet-200 shadow-sm">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm shrink-0">
            <Icon path={mdiCreation} size={0.8} />
          </div>
          <div className="space-y-1">
            <span className="font-black block text-violet-950 dark:text-violet-100 text-xs">
              Nhận xét từ Cố Vấn Tài Chính AI:
            </span>
            <p className="text-[11px] text-violet-900/90 dark:text-violet-300 leading-relaxed font-medium">
              {finalTetFund >= 10000000
                ? `Tuyệt vời! Với kế hoạch này, bạn dự kiến sẽ có ${formatVND(finalTetFund)} ăn Tết sau khi đã trả hết nợ định kỳ ${formatVND(projection.totalDebtPaidAll)}. Dòng tiền rất dồi dào, bạn hoàn toàn an tâm đón Tết sung túc!`
                : finalTetFund >= 0
                ? `Kế hoạch vừa vặn! Bạn sẽ có khoảng ${formatVND(finalTetFund)} để tiêu Tết sau khi hoàn thành mọi nghĩa vụ nợ. Hãy duy trì hạn mức sinh hoạt không vượt quá ${formatVND(monthlyLiving)}/tháng.`
                : `Cảnh báo thiếu hụt: Quỹ Tết của bạn đang bị âm (${formatVND(finalTetFund)}). Hãy thử giảm chi tiêu sắm Tết hoặc tăng mức tiết kiệm mỗi tháng để đạt trạng thái dương.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
