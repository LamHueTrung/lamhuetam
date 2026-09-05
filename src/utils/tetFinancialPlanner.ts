/**
 * Tiện ích & Thuật toán Lộ trình Tài chính Đón Tết (Tết Tây & Tết Ta)
 */

export const LUNAR_NEW_YEAR_DATES: Record<number, { date: string; animal: string }> = {
  2024: { date: '2024-02-10', animal: 'Giáp Thìn' },
  2025: { date: '2025-01-29', animal: 'Ất Tỵ' },
  2026: { date: '2026-02-17', animal: 'Bính Ngọ' },
  2027: { date: '2027-02-06', animal: 'Đinh Mùi' },
  2028: { date: '2028-01-26', animal: 'Mậu Thân' },
  2029: { date: '2029-02-13', animal: 'Kỷ Dậu' },
  2030: { date: '2030-02-02', animal: 'Canh Tuất' },
  2031: { date: '2031-01-23', animal: 'Tân Hợi' },
  2032: { date: '2032-02-11', animal: 'Nhâm Tý' },
  2033: { date: '2033-01-31', animal: 'Quý Sửu' },
  2034: { date: '2034-01-20', animal: 'Giáp Dần' },
  2035: { date: '2035-02-08', animal: 'Ất Mão' },
  2036: { date: '2036-01-28', animal: 'Bính Thìn' },
  2037: { date: '2037-02-15', animal: 'Đinh Tỵ' },
  2038: { date: '2038-02-04', animal: 'Mậu Ngọ' },
  2039: { date: '2039-01-24', animal: 'Kỷ Mùi' },
  2040: { date: '2040-02-12', animal: 'Canh Thân' },
  2041: { date: '2041-02-01', animal: 'Tân Dậu' },
  2042: { date: '2042-01-22', animal: 'Nhâm Tuất' },
  2043: { date: '2043-02-10', animal: 'Quý Hợi' },
  2044: { date: '2044-01-30', animal: 'Giáp Tý' },
  2045: { date: '2045-02-17', animal: 'Ất Sửu' },
  2046: { date: '2046-02-06', animal: 'Bính Dần' },
  2047: { date: '2047-01-26', animal: 'Đinh Mão' },
  2048: { date: '2048-02-14', animal: 'Mậu Thìn' },
  2049: { date: '2049-02-02', animal: 'Kỷ Tỵ' },
  2050: { date: '2050-01-23', animal: 'Canh Ngọ' },
  2051: { date: '2051-02-11', animal: 'Tân Mùi' },
  2052: { date: '2052-02-01', animal: 'Nhâm Thân' },
  2053: { date: '2053-01-20', animal: 'Quý Dậu' },
  2054: { date: '2054-02-08', animal: 'Giáp Tuất' },
  2055: { date: '2055-01-28', animal: 'Ất Hợi' },
  2056: { date: '2056-02-15', animal: 'Bính Tý' },
  2057: { date: '2057-02-04', animal: 'Đinh Sửu' },
  2058: { date: '2058-01-24', animal: 'Mậu Dần' },
  2059: { date: '2059-02-12', animal: 'Kỷ Mão' },
  2060: { date: '2060-02-02', animal: 'Canh Thìn' },
  2061: { date: '2061-01-21', animal: 'Tân Tỵ' },
  2062: { date: '2062-02-09', animal: 'Nhâm Ngọ' },
  2063: { date: '2063-01-29', animal: 'Quý Mùi' },
  2064: { date: '2064-02-17', animal: 'Giáp Thân' },
  2065: { date: '2065-02-05', animal: 'Ất Dậu' },
  2066: { date: '2066-01-26', animal: 'Bính Tuất' },
  2067: { date: '2067-02-14', animal: 'Đinh Hợi' },
  2068: { date: '2068-02-03', animal: 'Mậu Tý' },
  2069: { date: '2069-01-23', animal: 'Kỷ Sửu' },
  2070: { date: '2070-02-11', animal: 'Canh Dần' },
};

export interface TetCountdownInfo {
  solarDate: Date;
  solarDateStr: string;
  solarYear: number;
  daysToSolar: number;

  lunarDate: Date;
  lunarDateStr: string;
  lunarYear: number;
  lunarAnimal: string;
  daysToLunar: number;
}

/**
 * Lấy thông tin ngày Tết Tây và Tết Ta tiếp theo tính từ thời điểm tham chiếu
 */
export function getUpcomingTetInfo(now = new Date()): TetCountdownInfo {
  const currentYear = now.getFullYear();
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // 1. Tìm ngày Tết Tây (01/01) tiếp theo
  let solarYear = currentYear;
  let nextSolarDate = new Date(solarYear, 0, 1);
  if (todayMs >= nextSolarDate.getTime()) {
    solarYear = currentYear + 1;
    nextSolarDate = new Date(solarYear, 0, 1);
  }
  const daysToSolar = Math.max(0, Math.ceil((nextSolarDate.getTime() - todayMs) / (1000 * 60 * 60 * 24)));

  // 2. Tìm ngày Tết Ta (Âm lịch) tiếp theo
  let lunarYear = currentYear;
  let lunarInfo = LUNAR_NEW_YEAR_DATES[lunarYear];
  let nextLunarDate = lunarInfo ? new Date(lunarInfo.date) : new Date(lunarYear, 1, 1);

  if (todayMs >= nextLunarDate.getTime()) {
    lunarYear = currentYear + 1;
    lunarInfo = LUNAR_NEW_YEAR_DATES[lunarYear] || { date: `${lunarYear}-02-01`, animal: 'Tết Nguyên Đán' };
    nextLunarDate = new Date(lunarInfo.date);
  }

  const daysToLunar = Math.max(0, Math.ceil((nextLunarDate.getTime() - todayMs) / (1000 * 60 * 60 * 24)));

  const fmtDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  return {
    solarDate: nextSolarDate,
    solarDateStr: fmtDate(nextSolarDate),
    solarYear,
    daysToSolar,

    lunarDate: nextLunarDate,
    lunarDateStr: fmtDate(nextLunarDate),
    lunarYear,
    lunarAnimal: lunarInfo?.animal || `Năm ${lunarYear}`,
    daysToLunar,
  };
}

export interface TetPlannerConfig {
  netSalary: number;
  expectedBonus: number;
  solarNewYearExpense: number;
  lunarNewYearExpense: number;
  monthlyFixedExpense: number;
  monthlyDebtPayment: number;
  monthlyLivingBudget: number;
  initialSavings?: number;
}

export interface TetMonthMilestone {
  monthKey: string; // YYYY-MM
  monthLabel: string; // "Tháng 9/2026"
  isSolarMonth: boolean;
  isLunarMonth: boolean;
  isCurrentMonth: boolean;
  income: number;
  bonus: number;
  fixedExpense: number;
  debtPayment: number;
  livingBudget: number;
  holidayExpense: number;
  netSavings: number;
  cumulativeFund: number;
}

export interface TetProjectionResult {
  countdown: TetCountdownInfo;
  months: TetMonthMilestone[];
  totalMonths: number;
  totalIncomeAll: number;
  totalBonus: number;
  totalDebtPaidAll: number;
  totalFixedAll: number;
  totalLivingAll: number;
  totalHolidayExpense: number;
  finalTetFund: number;
  isSafe: boolean;
  safeScore: number;
}

/**
 * Tạo danh sách các tháng từ tháng hiện tại đến tháng có Tết Ta và tính toán dòng tiền
 */
export function generateTetProjection(config: TetPlannerConfig, now = new Date()): TetProjectionResult {
  const countdown = getUpcomingTetInfo(now);
  const lunarMonthKey = `${countdown.lunarDate.getFullYear()}-${String(countdown.lunarDate.getMonth() + 1).padStart(2, '0')}`;
  const solarMonthKey = `${countdown.solarDate.getFullYear()}-${String(countdown.solarDate.getMonth() + 1).padStart(2, '0')}`;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  const months: TetMonthMilestone[] = [];
  let runningFund = config.initialSavings || 0;

  // Lặp từ tháng hiện tại đến tháng có Tết Ta
  const endYear = countdown.lunarDate.getFullYear();
  const endMonth = countdown.lunarDate.getMonth();

  let iterDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(endYear, endMonth, 1);

  while (iterDate.getTime() <= endDate.getTime()) {
    const y = iterDate.getFullYear();
    const m = iterDate.getMonth() + 1;
    const mKey = `${y}-${String(m).padStart(2, '0')}`;

    const isCurrent = iterDate.getFullYear() === currentYear && iterDate.getMonth() === currentMonth;
    const isSolarMonth = mKey === solarMonthKey;
    const isLunarMonth = mKey === lunarMonthKey;

    let monthLabel = `T${m}/${y}`;
    if (isSolarMonth && isLunarMonth) {
      monthLabel = `T${m} (🎆Tết Tây & 🌸Tết Ta)`;
    } else if (isSolarMonth) {
      monthLabel = `T${m} (🎆Tết Tây)`;
    } else if (isLunarMonth) {
      monthLabel = `T${m} (🌸Tết Ta)`;
    }

    const income = config.netSalary || 0;
    // Thưởng Tết được nhận vào tháng Tết Ta (hoặc tháng 1 nếu Tết Ta tháng 1)
    const bonus = isLunarMonth ? (config.expectedBonus || 0) : 0;
    const fixedExpense = config.monthlyFixedExpense || 0;
    const debtPayment = config.monthlyDebtPayment || 0;
    const livingBudget = config.monthlyLivingBudget || 0;

    let holidayExpense = 0;
    if (isSolarMonth) {
      holidayExpense += config.solarNewYearExpense || 0;
    }
    if (isLunarMonth) {
      holidayExpense += config.lunarNewYearExpense || 0;
    }

    const netSavings = income + bonus - fixedExpense - debtPayment - livingBudget - holidayExpense;
    runningFund += netSavings;

    months.push({
      monthKey: mKey,
      monthLabel,
      isSolarMonth,
      isLunarMonth,
      isCurrentMonth: isCurrent,
      income,
      bonus,
      fixedExpense,
      debtPayment,
      livingBudget,
      holidayExpense,
      netSavings,
      cumulativeFund: runningFund,
    });

    // Sang tháng tiếp theo
    iterDate = new Date(iterDate.getFullYear(), iterDate.getMonth() + 1, 1);
  }

  const totalIncomeAll = months.reduce((sum, m) => sum + m.income, 0);
  const totalBonus = months.reduce((sum, m) => sum + m.bonus, 0);
  const totalDebtPaidAll = months.reduce((sum, m) => sum + m.debtPayment, 0);
  const totalFixedAll = months.reduce((sum, m) => sum + m.fixedExpense, 0);
  const totalLivingAll = months.reduce((sum, m) => sum + m.livingBudget, 0);
  const totalHolidayExpense = months.reduce((sum, m) => sum + m.holidayExpense, 0);
  const finalTetFund = runningFund;

  const isSafe = finalTetFund >= 0;
  // Tính điểm an toàn tài chính (0 - 100)
  let safeScore = 100;
  if (finalTetFund < 0) {
    safeScore = Math.max(10, Math.round(50 - Math.abs(finalTetFund) / 1_000_000 * 5));
  } else if (finalTetFund < config.lunarNewYearExpense) {
    safeScore = Math.round(60 + (finalTetFund / config.lunarNewYearExpense) * 20);
  } else {
    safeScore = Math.min(100, Math.round(80 + (finalTetFund / (config.lunarNewYearExpense * 2)) * 20));
  }

  return {
    countdown,
    months,
    totalMonths: months.length,
    totalIncomeAll,
    totalBonus,
    totalDebtPaidAll,
    totalFixedAll,
    totalLivingAll,
    totalHolidayExpense,
    finalTetFund,
    isSafe,
    safeScore,
  };
}
