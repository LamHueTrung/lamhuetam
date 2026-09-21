import db from "../db";
import { CalendarEvent, CalendarEventType } from "../types";
import { convertSolarToLunar, convertLunarToSolar, DEFAULT_VIETNAMESE_HOLIDAYS } from "../utils/lunarCalendar";

const STORAGE_KEY = "calendar_custom_events";

/**
 * Khởi tạo danh sách ngày lễ mặc định thành CalendarEvent
 */
export function getDefaultHolidayEvents(): CalendarEvent[] {
  return DEFAULT_VIETNAMESE_HOLIDAYS.map((h, idx) => ({
    id: `default_holiday_${idx}`,
    title: h.title,
    eventType: h.type as CalendarEventType,
    dateType: h.dateType,
    day: h.day,
    month: h.month,
    recurring: 'yearly',
    color: h.color,
    description: `Ngày lễ truyền thống / kỷ niệm (${h.dateType === 'lunar' ? 'Âm lịch' : 'Dương lịch'})`,
    isDefaultHoliday: true,
  }));
}

/**
 * Lấy tất cả sự kiện người dùng đã tạo từ DB / LocalStorage
 */
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const fromDb = await db.calendarEvents.toArray();
    if (fromDb && fromDb.length > 0) {
      return fromDb;
    }
  } catch (err) {
    console.warn("Lỗi khi đọc calendarEvents từ Dexie:", err);
  }

  // Fallback localStorage
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local) as CalendarEvent[];
      // Sync back to Dexie
      try {
        await db.calendarEvents.bulkPut(parsed);
      } catch {}
      return parsed;
    }
  } catch (err) {
    console.warn("Lỗi khi đọc calendarEvents từ LocalStorage:", err);
  }

  // Nếu là lần đầu tiên, tạo một vài sự kiện mẫu gợi ý
  const sampleEvents: CalendarEvent[] = [
    {
      id: "sample_birthday",
      title: "Sinh nhật Lâm Huệ Trung",
      description: "Sinh nhật hàng năm",
      eventType: "birthday",
      dateType: "solar",
      day: 10,
      month: 8,
      recurring: "yearly",
      color: "#ec4899",
      createdAt: new Date().toISOString(),
    },
    {
      id: "sample_lunar_fullmoon",
      title: "Cúng Rằm & Mùng 1 hàng tháng",
      description: "Thắp hương cúng rằm và đầu tháng âm lịch",
      eventType: "memorial",
      dateType: "lunar",
      day: 15,
      month: 1,
      recurring: "lunar_1_15",
      color: "#eab308",
      createdAt: new Date().toISOString(),
    },
  ];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleEvents));
    await db.calendarEvents.bulkPut(sampleEvents);
  } catch {}

  return sampleEvents;
}

/**
 * Lưu (Tạo mới hoặc Cập nhật) một sự kiện
 */
export async function saveCalendarEvent(event: CalendarEvent): Promise<CalendarEvent> {
  const updatedEvent: CalendarEvent = {
    ...event,
    id: event.id || `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    updatedAt: new Date().toISOString(),
    createdAt: event.createdAt || new Date().toISOString(),
  };

  try {
    await db.calendarEvents.put(updatedEvent);
  } catch (err) {
    console.warn("Lỗi khi lưu calendarEvents vào Dexie:", err);
  }

  // Cập nhật localStorage
  try {
    const all = await getCalendarEvents();
    const idx = all.findIndex((e) => e.id === updatedEvent.id);
    if (idx >= 0) {
      all[idx] = updatedEvent;
    } else {
      all.push(updatedEvent);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}

  return updatedEvent;
}

/**
 * Xóa một sự kiện
 */
export async function deleteCalendarEvent(id: string): Promise<void> {
  try {
    await db.calendarEvents.delete(id);
  } catch (err) {
    console.warn("Lỗi khi xóa calendarEvents khỏi Dexie:", err);
  }

  try {
    const all = await getCalendarEvents();
    const filtered = all.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}

export interface MatchedDayEvent {
  event: CalendarEvent;
  isHoliday: boolean;
  matchReason: string; // ví dụ: "10/08 (Dương lịch)", "15/07 (Âm lịch)"
}

/**
 * Tìm tất cả sự kiện diễn ra vào một ngày Dương lịch cụ thể YYYY-MM-DD
 */
export function getEventsForSolarDate(
  solarDateStr: string, // YYYY-MM-DD
  userEvents: CalendarEvent[],
  includeHolidays = true
): MatchedDayEvent[] {
  const [yStr, mStr, dStr] = solarDateStr.split("-");
  const sYear = parseInt(yStr);
  const sMonth = parseInt(mStr);
  const sDay = parseInt(dStr);

  const lunar = convertSolarToLunar(sDay, sMonth, sYear);
  const lDay = lunar.day;
  const lMonth = lunar.month;
  const lYear = lunar.year;

  const result: MatchedDayEvent[] = [];

  // 1. Kiểm tra sự kiện người dùng
  for (const ev of userEvents) {
    let isMatch = false;
    let reason = "";

    if (ev.dateType === "solar") {
      if (ev.recurring === "yearly") {
        if (ev.day === sDay && ev.month === sMonth) {
          isMatch = true;
          reason = `Hàng năm (${ev.day}/${ev.month} DL)`;
        }
      } else if (ev.recurring === "monthly") {
        if (ev.day === sDay) {
          isMatch = true;
          reason = `Hàng tháng (ngày ${ev.day} DL)`;
        }
      } else {
        // 'none'
        if (ev.day === sDay && ev.month === sMonth && (!ev.year || ev.year === sYear)) {
          isMatch = true;
          reason = `${ev.day}/${ev.month}/${ev.year || sYear} DL`;
        }
      }
    } else {
      // Âm lịch
      if (ev.recurring === "yearly") {
        if (ev.day === lDay && ev.month === lMonth) {
          isMatch = true;
          reason = `Hàng năm (${ev.day}/${ev.month} ÂL)`;
        }
      } else if (ev.recurring === "lunar_1_15") {
        if (lDay === 1) {
          isMatch = true;
          reason = "Mùng 1 Âm lịch";
        } else if (lDay === 15) {
          isMatch = true;
          reason = "Ngày Rằm (15 ÂL)";
        }
      } else if (ev.recurring === "monthly") {
        if (ev.day === lDay) {
          isMatch = true;
          reason = `Hàng tháng (ngày ${ev.day} ÂL)`;
        }
      } else {
        // 'none'
        if (ev.day === lDay && ev.month === lMonth && (!ev.year || ev.year === lYear)) {
          isMatch = true;
          reason = `${ev.day}/${ev.month}/${ev.year || lYear} ÂL`;
        }
      }
    }

    if (isMatch) {
      result.push({
        event: ev,
        isHoliday: false,
        matchReason: reason,
      });
    }
  }

  // 2. Kiểm tra ngày lễ mặc định nếu bật
  if (includeHolidays) {
    const defaultHolidays = getDefaultHolidayEvents();
    for (const h of defaultHolidays) {
      let isMatch = false;
      let reason = "";

      if (h.dateType === "solar") {
        if (h.day === sDay && h.month === sMonth) {
          isMatch = true;
          reason = `Ngày lễ (${h.day}/${h.month} DL)`;
        }
      } else {
        if (h.day === lDay && h.month === lMonth) {
          isMatch = true;
          reason = `Ngày lễ (${h.day}/${h.month} ÂL)`;
        }
      }

      if (isMatch) {
        result.push({
          event: h,
          isHoliday: true,
          matchReason: reason,
        });
      }
    }
  }

  return result;
}

export interface UpcomingEventItem {
  event: CalendarEvent;
  nextSolarDate: string; // 'YYYY-MM-DD'
  daysRemaining: number;
  formattedDateStr: string;
  isToday: boolean;
  isHoliday: boolean;
}

/**
 * Tính toán danh sách sự kiện sắp diễn ra trong vòng N ngày tới
 */
export function getUpcomingEvents(
  userEvents: CalendarEvent[],
  daysAhead = 60,
  includeHolidays = true
): UpcomingEventItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  const currentYear = today.getFullYear();

  const allEvents = includeHolidays
    ? [...userEvents, ...getDefaultHolidayEvents()]
    : [...userEvents];

  const upcomingList: UpcomingEventItem[] = [];

  for (const ev of allEvents) {
    // Tìm các ngày Dương lịch mà sự kiện sẽ diễn ra trong năm nay hoặc năm sau
    const checkYears = [currentYear, currentYear + 1];

    for (const yr of checkYears) {
      let targetSolarDate: Date | null = null;

      if (ev.dateType === "solar") {
        if (ev.recurring === "yearly" || ev.recurring === "none") {
          if (ev.recurring === "none" && ev.year && ev.year !== yr) continue;
          targetSolarDate = new Date(yr, ev.month - 1, ev.day);
        } else if (ev.recurring === "monthly") {
          // Lặp hàng tháng
          for (let m = 0; m < 12; m++) {
            const mDate = new Date(yr, m, ev.day);
            const diffDays = Math.round((mDate.getTime() - todayTime) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= daysAhead) {
              const solarStr = `${yr}-${String(m + 1).padStart(2, "0")}-${String(ev.day).padStart(2, "0")}`;
              upcomingList.push({
                event: ev,
                nextSolarDate: solarStr,
                daysRemaining: diffDays,
                formattedDateStr: `${ev.day}/${m + 1}/${yr}`,
                isToday: diffDays === 0,
                isHoliday: !!ev.isDefaultHoliday,
              });
            }
          }
          continue;
        }
      } else {
        // Âm lịch -> chuyển sang Dương lịch của năm yr
        if (ev.recurring === "yearly" || ev.recurring === "none") {
          if (ev.recurring === "none" && ev.year && ev.year !== yr) continue;
          const sol = convertLunarToSolar(ev.day, ev.month, yr);
          if (sol) {
            targetSolarDate = new Date(sol.year, sol.month - 1, sol.day);
          }
        } else if (ev.recurring === "lunar_1_15") {
          // Mùng 1 và Rằm của 12 tháng âm lịch
          for (let lm = 1; lm <= 12; lm++) {
            for (const ld of [1, 15]) {
              const sol = convertLunarToSolar(ld, lm, yr);
              if (sol) {
                const sDate = new Date(sol.year, sol.month - 1, sol.day);
                const diffDays = Math.round((sDate.getTime() - todayTime) / (1000 * 60 * 60 * 24));
                if (diffDays >= 0 && diffDays <= daysAhead) {
                  const solarStr = `${sol.year}-${String(sol.month).padStart(2, "0")}-${String(sol.day).padStart(2, "0")}`;
                  upcomingList.push({
                    event: {
                      ...ev,
                      title: `${ev.title} (${ld === 1 ? 'Mùng 1' : 'Ngày Rằm'} tháng ${lm} ÂL)`,
                    },
                    nextSolarDate: solarStr,
                    daysRemaining: diffDays,
                    formattedDateStr: `${sol.day}/${sol.month}/${sol.year} (tức ${ld}/${lm} ÂL)`,
                    isToday: diffDays === 0,
                    isHoliday: !!ev.isDefaultHoliday,
                  });
                }
              }
            }
          }
          continue;
        }
      }

      if (targetSolarDate) {
        targetSolarDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((targetSolarDate.getTime() - todayTime) / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= daysAhead) {
          const sY = targetSolarDate.getFullYear();
          const sM = targetSolarDate.getMonth() + 1;
          const sD = targetSolarDate.getDate();
          const solarStr = `${sY}-${String(sM).padStart(2, "0")}-${String(sD).padStart(2, "0")}`;

          const dateLabel =
            ev.dateType === "lunar"
              ? `${sD}/${sM}/${sY} (tức ${ev.day}/${ev.month} ÂL)`
              : `${sD}/${sM}/${sY}`;

          // Kiểm tra xem đã có mục trùng lặp chưa
          const exists = upcomingList.some(
            (u) => u.event.id === ev.id && u.nextSolarDate === solarStr
          );

          if (!exists) {
            upcomingList.push({
              event: ev,
              nextSolarDate: solarStr,
              daysRemaining: diffDays,
              formattedDateStr: dateLabel,
              isToday: diffDays === 0,
              isHoliday: !!ev.isDefaultHoliday,
            });
          }
        }
      }
    }
  }

  // Sắp xếp theo số ngày còn lại tăng dần
  return upcomingList.sort((a, b) => a.daysRemaining - b.daysRemaining);
}
