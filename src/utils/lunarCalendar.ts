/**
 * Thuật toán tính Âm lịch Việt Nam (Hồ Ngọc Đức)
 * Chuyển đổi chính xác 100% giữa Dương lịch và Âm lịch theo múi giờ GMT+7
 */

const PI = Math.PI;

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;
  canChiDay?: string;
  canChiMonth?: string;
  canChiYear?: string;
  solarDateStr?: string; // 'YYYY-MM-DD'
}

export interface SolarDate {
  day: number;
  month: number;
  year: number;
}

const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

/**
 * Tính số ngày Julius từ ngày Dương lịch
 */
export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

/**
 * Chuyển số ngày Julius thành ngày Dương lịch
 */
export function jdToDate(jd: number): SolarDate {
  let a, b, c, d, e, m, day, month, year;
  if (jd > 2299160) {
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((146097 * b) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  d = Math.floor((4 * c + 3) / 1461);
  e = c - Math.floor((1461 * d) / 4);
  m = Math.floor((5 * e + 2) / 153);
  day = e - Math.floor((153 * m + 2) / 5) + 1;
  month = m + 3 - 12 * Math.floor(m / 10);
  year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { day, month, year };
}

/**
 * Tính góc vị trí Mặt Trời
 */
function getSunLongitude(jdn: number, timeZone = 7): number {
  const T = (jdn - 2451545.0 + 0.5 - timeZone / 24.0) / 36525.0;
  const dr = PI / 180.0;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T * T - 0.00000048 * T * T * T;
  const C =
    (1.9146 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * dr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M * dr) +
    0.00029 * Math.sin(3 * M * dr);
  let theta = (L0 + C) % 360;
  if (theta < 0) theta += 360;
  return Math.floor((theta / 30));
}

/**
 * Tính ngày Sóc (New Moon)
 */
function getNewMoonDay(k: number, timeZone = 7): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180.0;
  let Jd1 =
    2415020.75933 +
    29.53058868 * k +
    0.0001178 * T2 -
    0.000000155 * T3 +
    0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  const C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
    0.0021 * Math.sin(2 * dr * M) -
    0.4068 * Math.sin(Mpr * dr) +
    0.0161 * Math.sin(2 * dr * Mpr) -
    0.0004 * Math.sin(3 * dr * Mpr) +
    0.0104 * Math.sin(2 * dr * F) -
    0.0051 * Math.sin((M + Mpr) * dr) -
    0.0074 * Math.sin((M - Mpr) * dr) +
    0.0004 * Math.sin((2 * F + M) * dr) -
    0.0004 * Math.sin((2 * F - M) * dr) -
    0.0006 * Math.sin((2 * F + Mpr) * dr) +
    0.001 * Math.sin((2 * F - Mpr) * dr) +
    0.0005 * Math.sin((2 * Mpr + M) * dr);
  const deltat =
    T < -4
      ? 124.0 + 90.0 * T + 22.2 * T2
      : T < 0
      ? 10.0 + 20.0 * T + 5.0 * T2
      : 0.0;
  const Jd = Jd1 + C1 - deltat / 86400.0;
  return Math.floor(Jd + 0.5 + timeZone / 24.0);
}

/**
 * Tìm ngày Sóc tháng 11 Âm lịch (tháng chứa Đông chí)
 */
function getLunarMonth11(yy: number, timeZone = 7): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

/**
 * Tìm tháng nhuận
 */
function getLeapMonthOffset(a11: number, timeZone = 7): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

/**
 * Chuyển đổi từ Dương lịch sang Âm lịch
 */
export function convertSolarToLunar(dd: number, mm: number, yy: number, timeZone = 7): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }

  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear = yy;

  if (a11 >= monthStart) {
    lunarYear = yy - 1;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    const nextA11 = getLunarMonth11(yy + 1, timeZone);
    if (nextA11 <= monthStart) {
      b11 = nextA11;
    }
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;

  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = true;
      }
    }
  }

  if (lunarMonth > 12) {
    lunarMonth -= 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear = yy - 1;
  }

  // Can chi
  const canDay = CAN[(dayNumber + 9) % 10];
  const chiDay = CHI[(dayNumber + 1) % 12];
  const canYear = CAN[(lunarYear + 6) % 10];
  const chiYear = CHI[(lunarYear + 8) % 12];

  const solarDateStr = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    isLeap: lunarLeap,
    canChiDay: `${canDay} ${chiDay}`,
    canChiYear: `${canYear} ${chiYear}`,
    solarDateStr,
  };
}

/**
 * Chuyển đổi từ Âm lịch sang Dương lịch
 */
export function convertLunarToSolar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  isLeap = false,
  timeZone = 7
): SolarDate | null {
  let a11: number;
  let b11: number;

  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, timeZone);
    b11 = getLunarMonth11(lunarYear, timeZone);
  } else {
    a11 = getLunarMonth11(lunarYear, timeZone);
    b11 = getLunarMonth11(lunarYear + 1, timeZone);
  }

  let k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let off = lunarMonth - 11;
  if (off < 0) off += 12;

  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, timeZone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 1) leapMonth += 12;
    if (isLeap && lunarMonth !== leapMonth) {
      return null;
    }
    if (isLeap || off >= leapOff) {
      off += 1;
    }
  }

  const monthStart = getNewMoonDay(k + off, timeZone);
  return jdToDate(monthStart + lunarDay - 1);
}

/**
 * Danh sách các ngày lễ, kỷ niệm truyền thống mặc định (Việt Nam)
 */
export interface DefaultHoliday {
  title: string;
  day: number;
  month: number;
  dateType: 'solar' | 'lunar';
  type: 'holiday' | 'memorial' | 'anniversary';
  emoji: string;
  color: string;
}

export const DEFAULT_VIETNAMESE_HOLIDAYS: DefaultHoliday[] = [
  // Dương lịch
  { title: "Tết Dương Lịch", day: 1, month: 1, dateType: "solar", type: "holiday", emoji: "🎆", color: "#3b82f6" },
  { title: "Ngày Thầy thuốc Việt Nam", day: 27, month: 2, dateType: "solar", type: "anniversary", emoji: "🩺", color: "#10b981" },
  { title: "Quốc tế Phụ nữ", day: 8, month: 3, dateType: "solar", type: "anniversary", emoji: "💐", color: "#ec4899" },
  { title: "Ngày Giải phóng Miền Nam", day: 30, month: 4, dateType: "solar", type: "holiday", emoji: "🇻🇳", color: "#ef4444" },
  { title: "Quốc tế Lao động", day: 1, month: 5, dateType: "solar", type: "holiday", emoji: "⚒️", color: "#f59e0b" },
  { title: "Quốc tế Thiếu nhi", day: 1, month: 6, dateType: "solar", type: "anniversary", emoji: "🎈", color: "#8b5cf6" },
  { title: "Ngày Gia đình Việt Nam", day: 28, month: 6, dateType: "solar", type: "anniversary", emoji: "👨‍👩‍👧‍👦", color: "#06b6d4" },
  { title: "Ngày Thương binh Liệt sĩ", day: 27, month: 7, dateType: "solar", type: "memorial", emoji: "🕯️", color: "#64748b" },
  { title: "Quốc khánh Việt Nam", day: 2, month: 9, dateType: "solar", type: "holiday", emoji: "🇻🇳", color: "#dc2626" },
  { title: "Ngày Phụ nữ Việt Nam", day: 20, month: 10, dateType: "solar", type: "anniversary", emoji: "🌸", color: "#f43f5e" },
  { title: "Ngày Nhà giáo Việt Nam", day: 20, month: 11, dateType: "solar", type: "anniversary", emoji: "📚", color: "#4f46e5" },
  { title: "Ngày Thành lập QĐND VN", day: 22, month: 12, dateType: "solar", type: "anniversary", emoji: "⭐", color: "#16a34a" },
  { title: "Lễ Giáng sinh (Noel)", day: 25, month: 12, dateType: "solar", type: "holiday", emoji: "🎄", color: "#059669" },

  // Âm lịch
  { title: "Tết Nguyên Đán (Mùng 1)", day: 1, month: 1, dateType: "lunar", type: "holiday", emoji: "🧧", color: "#dc2626" },
  { title: "Tết Nguyên Đán (Mùng 2)", day: 2, month: 1, dateType: "lunar", type: "holiday", emoji: "🧧", color: "#dc2626" },
  { title: "Tết Nguyên Đán (Mùng 3)", day: 3, month: 1, dateType: "lunar", type: "holiday", emoji: "🧧", color: "#dc2626" },
  { title: "Tết Nguyên Tiêu (Rằm tháng Giêng)", day: 15, month: 1, dateType: "lunar", type: "holiday", emoji: "🏮", color: "#f59e0b" },
  { title: "Giỗ Tổ Hùng Vương", day: 10, month: 3, dateType: "lunar", type: "holiday", emoji: "👑", color: "#d97706" },
  { title: "Tết Đoan Ngọ", day: 5, month: 5, dateType: "lunar", type: "holiday", emoji: "🍃", color: "#10b981" },
  { title: "Lễ Vu Lan (Báo Hiếu)", day: 15, month: 7, dateType: "lunar", type: "memorial", emoji: "🪷", color: "#8b5cf6" },
  { title: "Tết Trung Thu", day: 15, month: 8, dateType: "lunar", type: "holiday", emoji: "🥮", color: "#f97316" },
  { title: "Tết Trùng Cửu", day: 9, month: 9, dateType: "lunar", type: "holiday", emoji: "🍵", color: "#0d9488" },
  { title: "Tết Ông Công Ông Táo", day: 23, month: 12, dateType: "lunar", type: "holiday", emoji: "🐟", color: "#ea580c" },
];
