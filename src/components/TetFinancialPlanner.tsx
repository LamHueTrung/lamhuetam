import React, { useState, useMemo, useEffect } from 'react';
import { Icon } from '@mdi/react';
import {
  mdiFirework,
  mdiGiftOutline,
  mdiPiggyBankOutline,
  mdiTune,
  mdiCreation,
  mdiShieldCheckOutline,
  mdiAlertCircleOutline,
  mdiChartTimelineVariant,
  mdiChevronDown,
  mdiChevronUp,
  mdiClose,
  mdiCashMultiple,
  mdiCalendarHeart,
  mdiCheckCircle,
  mdiTrendingUp,
  mdiWalletOutline,
} from '@mdi/js';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import {
  generateTetProjection,
  TetPlannerConfig,
} from '../utils/tetFinancialPlanner';
import { DebtAccount, Transaction, SalaryConfig } from '../types';
import { useSalary } from '../hooks/useSalary';

interface TetFinancialPlannerProps {
  salaryConfig?: SalaryConfig | null;
  debts?: DebtAccount[];
  totalFixed?: number;
  transactions?: Transaction[];
  onNavigateToTab?: (tab: number) => void;
  onClose?: () => void;
}

export default function TetFinancialPlanner({
  salaryConfig: externalSalaryConfig,
  debts = [],
  totalFixed = 0,
  transactions = [],
  onNavigateToTab,
  onClose,
}: TetFinancialPlannerProps) {
  const { salaryConfig: internalSalaryConfig } = useSalary();
  const salaryConfig = externalSalaryConfig || internalSalaryConfig;

  // Lương thực nhận mặc định
  const defaultNetSalary = salaryConfig?.netSalary && salaryConfig.netSalary > 0 
    ? salaryConfig.netSalary 
    : 15000000;

  // Tính tiền trả nợ hàng tháng
  const defaultMonthlyDebt = useMemo(() => {
    return debts
      .filter((d) => d.status === 'active')
      .reduce((sum, d) => sum + (d.monthlyPayment || 0), 0);
  }, [debts]);

  // Tính chi tiêu sinh hoạt ước tính dựa trên các giao dịch gần đây
  const defaultLivingBudget = useMemo(() => {
    if (!transactions.length) return 5000000;
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthExpenses = transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonthStr))
      .reduce((sum, t) => sum + t.amount, 0);
    return thisMonthExpenses > 0 ? thisMonthExpenses : 5000000;
  }, [transactions]);

  // Config States (Sliders & Inputs)
  const [netSalary, setNetSalary] = useState<number>(defaultNetSalary);
  const [expectedBonus, setExpectedBonus] = useState<number>(defaultNetSalary);
  const [solarExpense, setSolarExpense] = useState<number>(2000000);
  const [lunarExpense, setLunarExpense] = useState<number>(8000000);
  const [monthlyLiving, setMonthlyLiving] = useState<number>(defaultLivingBudget);
  const [initialSavings, setInitialSavings] = useState<number>(0);

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'timeline'>('chart');

  // Đồng bộ khi salaryConfig có dữ liệu
  useEffect(() => {
    if (salaryConfig?.netSalary && salaryConfig.netSalary > 0) {
      setNetSalary(salaryConfig.netSalary);
      setExpectedBonus(salaryConfig.netSalary);
    }
  }, [salaryConfig]);

  // Sinh kết quả dự phóng
  const projection = useMemo(() => {
    const config: TetPlannerConfig = {
      netSalary,
      expectedBonus,
      solarNewYearExpense: solarExpense,
      lunarNewYearExpense: lunarExpense,
      monthlyFixedExpense: totalFixed,
      monthlyDebtPayment: defaultMonthlyDebt,
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
    defaultMonthlyDebt,
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
      'Thu nhập & Thưởng': m.income + m.bonus,
      'Chi tiêu & Trả nợ': m.fixedExpense + m.debtPayment + m.livingBudget + m.holidayExpense,
      'Quỹ tích lũy': m.cumulativeFund,
      isSolar: m.isSolarMonth,
      isLunar: m.isLunarMonth,
    }));
  }, [months]);

  return (
    <div className="space-y-4 pb-2 text-slate-800 dark:text-slate-100">
      {/* 🌸 Hero Header: Lễ Hội Tết Sang Trọng & Rực Rỡ */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#e11d48] via-[#dc2626] to-[#b45309] dark:from-[#881337] dark:via-[#7f1d1d] dark:to-[#78350f] text-white p-5 sm:p-6 border-2 border-amber-300/60 dark:border-amber-500/40 shadow-2xl">
        {/* Glow ambient effects & decorative lights */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-300/30 dark:bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-rose-500/40 dark:bg-rose-600/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-yellow-400/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-red-950 shadow-lg shadow-amber-500/30 border border-yellow-200">
                <Icon path={mdiFirework} size={1.2} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white drop-shadow-md">
                    Kế Hoạch Tài Chính Đón Tết
                  </h2>
                  <span className="text-[11px] bg-gradient-to-r from-amber-300 to-yellow-300 text-red-950 font-black px-2.5 py-0.5 rounded-full shadow-md border border-amber-100">
                    🌸 Năm {countdown.lunarAnimal}
                  </span>
                </div>
                <p className="text-xs text-amber-100/95 font-medium mt-0.5 drop-shadow-xs">
                  Cân đối dòng tiền, trả nợ định kỳ và tích lũy trọn vẹn quỹ tiêu Tết
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
                <span>{isCustomizing ? 'Đóng tùy chỉnh' : 'Tùy chỉnh'}</span>
                <Icon path={isCustomizing ? mdiChevronUp : mdiChevronDown} size={0.65} />
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20 shadow-sm"
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
            <div className="p-4 bg-gradient-to-br from-indigo-950/90 via-slate-900/90 to-blue-950/90 backdrop-blur-xl rounded-2xl border-2 border-cyan-400/60 flex items-center justify-between shadow-xl shadow-indigo-950/40 group hover:border-cyan-300 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-md">
                  <Icon path={mdiFirework} size={0.9} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-cyan-300 uppercase tracking-widest block">
                    🎆 Tết Dương Lịch {countdown.solarYear}
                  </span>
                  <p className="text-xs font-black text-white mt-0.5">
                    Ngày {countdown.solarDateStr}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-cyan-400 drop-shadow-sm">
                  {countdown.daysToSolar}
                </span>
                <span className="text-[10px] text-cyan-200/90 block font-bold uppercase tracking-wider">
                  ngày nữa
                </span>
              </div>
            </div>

            {/* Tết Ta Card */}
            <div className="p-4 bg-gradient-to-br from-red-950/90 via-rose-900/90 to-amber-950/90 backdrop-blur-xl rounded-2xl border-2 border-amber-400 flex items-center justify-between shadow-xl shadow-red-950/50 group hover:border-amber-300 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-red-950 shadow-md animate-pulse">
                  <Icon path={mdiGiftOutline} size={0.9} />
                </div>
                <div>
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest block">
                    🧧 Tết Nguyên Đán ({countdown.lunarAnimal})
                  </span>
                  <p className="text-xs font-black text-white mt-0.5">
                    Mùng 1: {countdown.lunarDateStr}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 drop-shadow-md">
                  {countdown.daysToLunar}
                </span>
                <span className="text-[10px] text-amber-200/90 block font-bold uppercase tracking-wider">
                  ngày nữa
                </span>
              </div>
            </div>
          </div>

          {/* 💎 4 Golden KPI Metrics */}
          <div className="pt-3 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {/* Quỹ Tết */}
            <div className="bg-amber-400/20 dark:bg-amber-950/50 backdrop-blur-md rounded-2xl p-3 border border-amber-300/40 shadow-inner">
              <span className="text-[10px] text-amber-200 font-bold block uppercase tracking-wider">
                💰 Quỹ Ăn Tết Dự Kiến
              </span>
              <span
                className={`text-base font-black block mt-0.5 drop-shadow-sm ${
                  finalTetFund >= 0 ? 'text-amber-300' : 'text-rose-300'
                }`}
              >
                {formatVND(finalTetFund)}
              </span>
            </div>

            {/* Độ an toàn */}
            <div className="bg-emerald-400/20 dark:bg-emerald-950/50 backdrop-blur-md rounded-2xl p-3 border border-emerald-300/40 shadow-inner">
              <span className="text-[10px] text-emerald-200 font-bold block uppercase tracking-wider">
                🛡️ Độ An Toàn Kế Hoạch
              </span>
              <span className="text-sm font-black text-emerald-300 block mt-0.5 flex items-center gap-1">
                <Icon
                  path={isSafe ? mdiShieldCheckOutline : mdiAlertCircleOutline}
                  size={0.65}
                />
                {safeScore}/100 • {isSafe ? 'Rất tốt' : 'Cần chỉnh'}
              </span>
            </div>

            {/* Thưởng Tết */}
            <div className="bg-sky-400/20 dark:bg-sky-950/50 backdrop-blur-md rounded-2xl p-3 border border-sky-300/40 shadow-inner">
              <span className="text-[10px] text-sky-200 font-bold block uppercase tracking-wider">
                🧧 Dự Kiến Thưởng Tết
              </span>
              <span className="text-sm font-black text-sky-200 block mt-0.5">
                +{formatVND(expectedBonus)}
              </span>
            </div>

            {/* Trả nợ */}
            <div className="bg-rose-400/20 dark:bg-rose-950/50 backdrop-blur-md rounded-2xl p-3 border border-rose-300/40 shadow-inner">
              <span className="text-[10px] text-rose-200 font-bold block uppercase tracking-wider">
                💳 Tổng Trả Nợ Đến Tết
              </span>
              <span className="text-sm font-black text-rose-200 block mt-0.5">
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
            <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 border-2 border-amber-400/40 dark:border-amber-600/40 shadow-xl space-y-4">
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
                    max={netSalary * 3}
                    step="500000"
                    value={expectedBonus}
                    onChange={(e) => setExpectedBonus(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-emerald-200 dark:bg-emerald-900 rounded-lg"
                  />
                  <div className="flex justify-between items-center gap-1 text-[10px]">
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
                    min="2000000"
                    max="30000000"
                    step="500000"
                    value={lunarExpense}
                    onChange={(e) => setLunarExpense(Number(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer h-2 bg-rose-200 dark:bg-rose-900 rounded-lg"
                  />
                  <div className="flex justify-between items-center gap-1 text-[10px]">
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
                  <div className="flex justify-between items-center gap-1 text-[10px]">
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

                {/* 4. Hạn Mức Sinh Hoạt Hàng Tháng */}
                <div className="space-y-2 p-3.5 bg-gradient-to-br from-amber-50/90 to-yellow-50/70 dark:from-amber-950/30 dark:to-yellow-950/20 rounded-2xl border border-amber-300 dark:border-amber-800 shadow-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-amber-900 dark:text-amber-300 flex items-center gap-1 font-black">
                      🛒 Sinh hoạt mỗi tháng từ nay đến Tết:
                    </span>
                    <span className="text-amber-700 dark:text-amber-400 font-black text-sm">
                      {formatVND(monthlyLiving)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2000000"
                    max="20000000"
                    step="500000"
                    value={monthlyLiving}
                    onChange={(e) => setMonthlyLiving(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer h-2 bg-amber-200 dark:bg-amber-900 rounded-lg"
                  />
                  <div className="flex justify-between items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setMonthlyLiving(defaultLivingBudget)}
                      className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 text-amber-900 dark:text-amber-100 font-black cursor-pointer transition-colors"
                    >
                      Mức hiện tại ({formatCompactVND(defaultLivingBudget)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonthlyLiving(Math.round(defaultLivingBudget * 0.8))}
                      className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-800 dark:text-amber-200 font-bold cursor-pointer transition-colors"
                    >
                      Thắt lưng buộc bụng (-20%)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📊 Biểu Đồ & Bản Đồ Lộ Trình */}
      <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-200/90 dark:border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500 via-red-500 to-amber-500 text-white shadow-md">
              <Icon path={mdiChartTimelineVariant} size={0.8} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Dự Phóng Dòng Tiền & Quỹ Tích Lũy
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Lộ trình từ tháng này đến ngày Tết Nguyên Đán
              </p>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <button
              type="button"
              onClick={() => setActiveTab('chart')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'chart'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Biểu đồ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'timeline'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bản đồ chặng
            </button>
          </div>
        </div>

        {/* Tab 1: Biểu đồ Recharts */}
        {activeTab === 'chart' && (
          <div className="space-y-3">
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#888888', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#888888', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${Math.round(val / 1000000)}M`}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      formatVND(Number(value) || 0),
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '16px',
                      border: '2px solid rgba(245, 158, 11, 0.5)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    }}
                  />
                  <Bar
                    dataKey="Thu nhập & Thưởng"
                    fill="url(#incomeGradient)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="Chi tiêu & Trả nợ"
                    fill="url(#expenseGradient)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={32}
                  />
                  <Line
                    type="monotone"
                    dataKey="Quỹ tích lũy"
                    stroke="#f59e0b"
                    strokeWidth={4}
                    dot={{ fill: '#f59e0b', r: 5, strokeWidth: 2.5, stroke: '#ffffff' }}
                    activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 3 }}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

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
                <span className="w-4 h-1.5 rounded-full bg-amber-500 shadow-xs inline-block" />
                Quỹ tích lũy lũy kế
              </span>
            </div>
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
                        <b className="text-rose-600 dark:text-rose-400">{formatVND(m.fixedExpense + m.debtPayment + m.livingBudget + m.holidayExpense)}</b>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Tích lũy lũy kế</span>
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
                  <span>💳 Trả nợ: <b className="text-rose-600 dark:text-rose-400">{formatVND(m.debtPayment)}</b></span>
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
