import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@mdi/react";
import {
  mdiClose,
  mdiCalendar,
  mdiClockOutline,
  mdiMapMarker,
  mdiText,
  mdiDeleteOutline,
  mdiCheck,
  mdiRepeat,
  mdiWeatherSunny,
  mdiMoonWaningCrescent,
  mdiCakeVariant,
  mdiCandle,
  mdiPartyPopper,
  mdiRing,
  mdiBookmarkOutline,
  mdiCalendarCheck,
} from "@mdi/js";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarEvent,
  CalendarEventType,
  CalendarDateType,
  CalendarEventRecurring,
} from "../types";
import {
  convertSolarToLunar,
  convertLunarToSolar,
} from "../utils/lunarCalendar";

interface EventModalProps {
  isOpen: boolean;
  initialEvent?: CalendarEvent | null;
  defaultDateStr?: string; // 'YYYY-MM-DD'
  onClose: () => void;
  onSave: (eventData: any) => Promise<void>;
  onDelete?: (id: string, title?: string) => Promise<void>;
}

export const EVENT_TYPE_CONFIG: Record<
  CalendarEventType,
  { label: string; emoji: string; color: string; icon: string }
> = {
  birthday: {
    label: "Sinh nhật",
    emoji: "🎂",
    color: "#ec4899",
    icon: mdiCakeVariant,
  },
  memorial: {
    label: "Đám giỗ / Cúng",
    emoji: "🕯️",
    color: "#eab308",
    icon: mdiCandle,
  },
  holiday: {
    label: "Lễ / Tết",
    emoji: "🎆",
    color: "#ef4444",
    icon: mdiPartyPopper,
  },
  anniversary: {
    label: "Kỷ niệm",
    emoji: "💍",
    color: "#8b5cf6",
    icon: mdiRing,
  },
  appointment: {
    label: "Cuộc hẹn / Việc",
    emoji: "📌",
    color: "#3b82f6",
    icon: mdiCalendarCheck,
  },
  other: {
    label: "Khác",
    emoji: "🔖",
    color: "#64748b",
    icon: mdiBookmarkOutline,
  },
};

const COLOR_PRESETS = [
  "#ec4899", // Hồng
  "#ef4444", // Đỏ
  "#f97316", // Cam
  "#eab308", // Vàng
  "#10b981", // Xanh lá
  "#06b6d4", // Cyan
  "#3b82f6", // Xanh dương
  "#8b5cf6", // Tím
  "#64748b", // Xám
];

export default function EventModal({
  isOpen,
  initialEvent,
  defaultDateStr,
  onClose,
  onSave,
  onDelete,
}: EventModalProps) {
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<CalendarEventType>("birthday");
  const [dateType, setDateType] = useState<CalendarDateType>("solar");
  const [day, setDay] = useState<number>(1);
  const [month, setMonth] = useState<number>(1);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [recurring, setRecurring] = useState<CalendarEventRecurring>("yearly");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#ec4899");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form
  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title || "");
      setEventType(initialEvent.eventType || "birthday");
      setDateType(initialEvent.dateType || "solar");
      setDay(initialEvent.day || 1);
      setMonth(initialEvent.month || 1);
      setYear(initialEvent.year);
      setRecurring(initialEvent.recurring || "yearly");
      setTime(initialEvent.time || "");
      setLocation(initialEvent.location || "");
      setDescription(initialEvent.description || "");
      setColor(
        initialEvent.color ||
          EVENT_TYPE_CONFIG[initialEvent.eventType]?.color ||
          "#ec4899",
      );
    } else {
      // Create new with default date
      const d = defaultDateStr
        ? new Date(defaultDateStr + "T00:00:00")
        : new Date();
      const sDay = d.getDate();
      const sMonth = d.getMonth() + 1;
      const sYear = d.getFullYear();

      setTitle("");
      setEventType("birthday");
      setDateType("solar");
      setDay(sDay);
      setMonth(sMonth);
      setYear(sYear);
      setRecurring("yearly");
      setTime("");
      setLocation("");
      setDescription("");
      setColor("#ec4899");
    }
  }, [initialEvent, defaultDateStr, isOpen]);

  // Sync color when eventType changes if not manually set
  const handleEventTypeChange = (type: CalendarEventType) => {
    setEventType(type);
    setColor(EVENT_TYPE_CONFIG[type].color);
    if (type === "memorial" && !initialEvent) {
      setDateType("lunar"); // Giỗ chạp thường ưu tiên lịch âm
    }
  };

  // Tính toán ngày đối ứng (preview tương đương)
  const counterpartPreview = useMemo(() => {
    const currentYear = year || new Date().getFullYear();
    try {
      if (dateType === "solar") {
        const lunar = convertSolarToLunar(day, month, currentYear);
        return `Tương ứng Âm lịch: ngày ${lunar.day} tháng ${lunar.month} (Năm ${lunar.canChiYear})`;
      } else {
        const solar = convertLunarToSolar(day, month, currentYear);
        if (solar) {
          return `Tương ứng Dương lịch năm ${currentYear}: ngày ${solar.day}/${solar.month}/${solar.year}`;
        }
        return "Ngày âm lịch không hợp lệ trong năm này";
      }
    } catch {
      return "";
    }
  }, [dateType, day, month, year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        eventType,
        dateType,
        day: Number(day),
        month: Number(month),
        year:
          recurring === "none"
            ? year
              ? Number(year)
              : new Date().getFullYear()
            : undefined,
        recurring,
        time: time.trim() || undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        color,
      };

      if (initialEvent?.id) {
        payload.id = initialEvent.id;
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error("Lỗi khi lưu sự kiện:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialEvent?.id || !onDelete) return;
    if (
      window.confirm(
        `Bạn có chắc muốn xóa sự kiện "${initialEvent.title}" không?`,
      )
    ) {
      setIsSubmitting(true);
      try {
        await onDelete(initialEvent.id, initialEvent.title);
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  const daysInMonth = 31;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn select-none">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700 my-auto"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-lg shadow-sm"
              style={{ backgroundColor: color }}
            >
              {EVENT_TYPE_CONFIG[eventType]?.emoji || "📅"}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {initialEvent ? "Chỉnh sửa sự kiện" : "Thêm sự kiện mới"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {dateType === "lunar"
                  ? "Sự kiện theo Lịch Âm"
                  : "Sự kiện theo Lịch Dương"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <Icon path={mdiClose} size={0.8} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1"
        >
          {/* 1. Tên sự kiện */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên sự kiện <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Sinh nhật Mẹ, Đám giỗ Ông Nội, Kỷ niệm ngày cưới..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* 2. Phân loại sự kiện (Type pills) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Loại sự kiện
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(EVENT_TYPE_CONFIG) as CalendarEventType[]).map(
                (key) => {
                  const cfg = EVENT_TYPE_CONFIG[key];
                  const isSelected = eventType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleEventTypeChange(key)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <span className="text-sm leading-none">{cfg.emoji}</span>
                      <span className="truncate">{cfg.label}</span>
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* 3. Lựa chọn Lịch Âm hay Dương (Segmented control) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Lịch tính ngày
              </span>

              <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDateType("solar")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    dateType === "solar"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <Icon path={mdiWeatherSunny} size={0.6} />
                  <span>Dương lịch</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDateType("lunar")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    dateType === "lunar"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <Icon path={mdiMoonWaningCrescent} size={0.6} />
                  <span>Âm lịch</span>
                </button>
              </div>
            </div>

            {/* Selector Ngày & Tháng */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Ngày {dateType === "lunar" ? "(Âm lịch)" : "(Dương lịch)"}
                </label>
                <select
                  value={day}
                  onChange={(e) => setDay(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                    (d) => (
                      <option key={d} value={d}>
                        Ngày {d}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Tháng {dateType === "lunar" ? "(Âm lịch)" : "(Dương lịch)"}
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Tháng {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Counterpart Preview Note */}
            {counterpartPreview && (
              <div className="p-2 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/50 text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-1.5 font-medium">
                <Icon
                  path={mdiCalendar}
                  size={0.55}
                  className="shrink-0 text-blue-500"
                />
                <span className="truncate">{counterpartPreview}</span>
              </div>
            )}
          </div>

          {/* 4. Tùy chọn Lặp lại (Recurring) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Chế độ lặp lại
            </label>
            <select
              value={recurring}
              onChange={(e) =>
                setRecurring(e.target.value as CalendarEventRecurring)
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="yearly">
                🔄 Lặp lại hàng năm (Vào ngày {day}/{month}{" "}
                {dateType === "lunar" ? "ÂL" : "DL"})
              </option>
              <option value="monthly">
                📅 Lặp lại hàng tháng (Vào ngày {day}{" "}
                {dateType === "lunar" ? "ÂL" : "DL"})
              </option>
              {dateType === "lunar" && (
                <option value="lunar_1_15">
                  🌕 Cả Mùng 1 và Ngày Rằm (15 ÂL) hàng tháng
                </option>
              )}
              <option value="none">🚫 Một lần duy nhất (Không lặp lại)</option>
            </select>
          </div>

          {/* Nếu không lặp lại, cho chọn Năm */}
          {recurring === "none" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Năm diễn ra
              </label>
              <input
                type="number"
                min="1900"
                max="2100"
                value={year || new Date().getFullYear()}
                onChange={(e) => setYear(parseInt(e.target.value) || undefined)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* 5. Giờ & Địa điểm (Tùy chọn) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Giờ diễn ra (tùy chọn)
              </label>
              <div className="relative">
                <Icon
                  path={mdiClockOutline}
                  size={0.65}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Địa điểm (tùy chọn)
              </label>
              <div className="relative">
                <Icon
                  path={mdiMapMarker}
                  size={0.65}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="VD: Nhà nội, Nhà hàng..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 6. Ghi chú */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú chi tiết, việc cần chuẩn bị..."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 7. Màu sắc đại diện */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Màu sắc thẻ sự kiện
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                    color === c
                      ? "scale-125 ring-2 ring-offset-2 ring-slate-400"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && (
                    <Icon path={mdiCheck} size={0.5} className="text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
            {initialEvent && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Icon path={mdiDeleteOutline} size={0.7} />
                <span>Xóa sự kiện</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {initialEvent ? "Lưu thay đổi" : "Tạo sự kiện"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
