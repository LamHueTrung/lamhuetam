import React, { useState, useMemo } from "react";
import { Icon } from "@mdi/react";
import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiCalendarMonth,
  mdiPlus,
  mdiClockOutline,
  mdiMapMarker,
  mdiPencilOutline,
  mdiDeleteOutline,
  mdiCrosshairsGps,
  mdiCalendarClock,
  mdiPartyPopper,
  mdiCalendarBlankOutline,
} from "@mdi/js";
import { motion, AnimatePresence } from "motion/react";
import { getLocalDateString } from "../utils/date";
import {
  CalendarEvent,
  CalendarEventType,
} from "../types";
import {
  convertSolarToLunar,
  LunarDate,
} from "../utils/lunarCalendar";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import EventModal, { EVENT_TYPE_CONFIG } from "./EventModal";
import { MatchedDayEvent, UpcomingEventItem } from "../services/calendarEventService";

interface Props {
  month: string; // 'YYYY-MM'
  onMonthChange: (m: string) => void;
}

export default function CalendarView({
  month,
  onMonthChange,
}: Props) {
  const {
    events,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    upcomingEvents,
  } = useCalendarEvents();

  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [activeTab, setActiveTab] = useState<"calendar" | "upcoming">("calendar");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<CalendarEventType | "all">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const today = getLocalDateString();

  // Navigation handlers
  const prevMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const nextMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const jumpToToday = () => {
    const d = new Date();
    const currentM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    onMonthChange(currentM);
    setSelectedDate(today);
  };

  // Build calendar days matrix
  const calendarDays = useMemo(() => {
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr);
    const monthNum = parseInt(monthStr) - 1;
    const firstDay = new Date(year, monthNum, 1);
    const lastDay = new Date(year, monthNum + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon, ...

    const days: Array<{
      date: string | null;
      day: number;
      lunar: LunarDate | null;
      events: MatchedDayEvent[];
    }> = [];

    // Adjust for Monday start (0=Sun -> 6, 1=Mon -> 0, ...)
    const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    for (let i = 0; i < offset; i++) {
      days.push({ date: null, day: 0, lunar: null, events: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${month}-${String(d).padStart(2, "0")}`;
      const lunar = convertSolarToLunar(d, monthNum + 1, year);
      const dayEvents = getEventsForDate(dateStr, true);

      days.push({
        date: dateStr,
        day: d,
        lunar,
        events: dayEvents,
      });
    }

    while (days.length % 7 !== 0) {
      days.push({ date: null, day: 0, lunar: null, events: [] });
    }

    return days;
  }, [month, getEventsForDate]);

  const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  // Selected date details
  const selectedDayInfo = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const lunar = convertSolarToLunar(d, m, y);
    const allEvents = getEventsForDate(selectedDate, true);
    const filtered =
      selectedCategoryFilter === "all"
        ? allEvents
        : allEvents.filter((e) => e.event.eventType === selectedCategoryFilter);

    return {
      solarDate: selectedDate,
      solarDay: d,
      solarMonth: m,
      solarYear: y,
      lunar,
      events: filtered,
    };
  }, [selectedDate, getEventsForDate, selectedCategoryFilter]);

  // Upcoming filtered events
  const filteredUpcoming = useMemo(() => {
    if (selectedCategoryFilter === "all") return upcomingEvents;
    return upcomingEvents.filter((u) => u.event.eventType === selectedCategoryFilter);
  }, [upcomingEvents, selectedCategoryFilter]);

  const handleOpenAddEvent = (presetDate?: string) => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleOpenEditEvent = (ev: CalendarEvent) => {
    if (ev.isDefaultHoliday) return;
    setEditingEvent(ev);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (eventData: any) => {
    if (editingEvent?.id) {
      await updateEvent({ ...eventData, id: editingEvent.id });
    } else {
      await addEvent(eventData);
    }
  };

  const handleDeleteEvent = async (id: string, title?: string) => {
    await deleteEvent(id, title);
  };

  // Short clean header labels
  const headerLabels = useMemo(() => {
    const [y, mo] = month.split("-").map(Number);
    const midMonthLunar = convertSolarToLunar(15, mo, y);
    return {
      solar: `Tháng ${mo} / ${y}`,
      lunar: `Tháng ${midMonthLunar.month} ÂL · ${midMonthLunar.canChiYear}`,
    };
  }, [month]);

  // Compact category filters
  const CATEGORY_SHORT_LABELS: Record<CalendarEventType, { label: string; emoji: string }> = {
    birthday: { label: "Sinh nhật", emoji: "🎂" },
    memorial: { label: "Đám giỗ", emoji: "🕯️" },
    holiday: { label: "Lễ Tết", emoji: "🎆" },
    anniversary: { label: "Kỷ niệm", emoji: "💍" },
    appointment: { label: "Cuộc hẹn", emoji: "📌" },
    other: { label: "Khác", emoji: "🔖" },
  };

  return (
    <div className="space-y-3.5 select-none">
      {/* 1. Sleek Compact Top Bar */}
      <div className="bg-white dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-2 sm:p-2.5 shadow-xs flex items-center justify-between gap-2">
        {/* Switch View Segmented Control */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "calendar"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <Icon path={mdiCalendarMonth} size={0.65} />
            <span>Lịch</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer relative ${
              activeTab === "upcoming"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <Icon path={mdiCalendarClock} size={0.65} />
            <span>Sắp tới</span>
            {upcomingEvents.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>
        </div>

        {/* Action buttons: Today icon + Add Event button */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={jumpToToday}
            className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer"
            title="Về hôm nay"
          >
            <Icon path={mdiCrosshairsGps} size={0.7} className="text-blue-500" />
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddEvent()}
            className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Icon path={mdiPlus} size={0.75} />
            <span className="hidden sm:inline">Thêm sự kiện</span>
            <span className="sm:hidden">Thêm</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Icon Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
            selectedCategoryFilter === "all"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-bold"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          Tất cả
        </button>

        {(Object.keys(CATEGORY_SHORT_LABELS) as CalendarEventType[]).map((key) => {
          const item = CATEGORY_SHORT_LABELS[key];
          const isSelected = selectedCategoryFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedCategoryFilter(key)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? "bg-blue-600 text-white font-bold shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span className="text-sm leading-none">{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. MAIN VIEW: CALENDAR DUAL GRID */}
      {activeTab === "calendar" && (
        <div className="space-y-3.5">
          {/* Month Calendar Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl overflow-hidden shadow-sm"
          >
            {/* Header Month Switcher */}
            <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b border-slate-100 dark:border-slate-700/80">
              <button
                type="button"
                onClick={prevMonth}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors text-slate-500"
                title="Tháng trước"
              >
                <Icon path={mdiChevronLeft} size={0.85} />
              </button>

              <div className="text-center">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                  <Icon path={mdiCalendarMonth} size={0.7} className="text-blue-500" />
                  <span>{headerLabels.solar}</span>
                </h3>
                <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                  {headerLabels.lunar}
                </p>
              </div>

              <button
                type="button"
                onClick={nextMonth}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors text-slate-500"
                title="Tháng tiếp theo"
              >
                <Icon path={mdiChevronRight} size={0.85} />
              </button>
            </div>

            {/* Days Grid */}
            <div className="p-2 sm:p-3">
              {/* Day Headers (T2..CN) */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map((wd, idx) => (
                  <div
                    key={wd}
                    className={`text-center text-[10px] sm:text-[11px] font-bold py-1 ${
                      idx === 5
                        ? "text-indigo-500"
                        : idx === 6
                        ? "text-rose-500"
                        : "text-slate-400"
                    }`}
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Day Cells Matrix */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {calendarDays.map((d, i) => {
                  if (!d.date) {
                    return <div key={`empty-${i}`} className="min-h-[52px] sm:min-h-[64px]" />;
                  }

                  const isToday = d.date === today;
                  const isSelected = d.date === selectedDate;
                  const lunar = d.lunar;
                  const hasEvents = d.events.length > 0;

                  const isLunarFirst = lunar?.day === 1;
                  const isLunarFullMoon = lunar?.day === 15;

                  const lunarText = isLunarFirst
                    ? `1/${lunar?.month}`
                    : `${lunar?.day || ""}`;

                  return (
                    <motion.button
                      key={d.date}
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        setSelectedDate(d.date!);
                      }}
                      className={`min-h-[52px] sm:min-h-[64px] p-1 sm:p-1.5 rounded-2xl flex flex-col justify-between items-center relative cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30 scale-[1.02] z-10"
                          : isToday
                          ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                          : "border-slate-100 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      {/* Solar Day Number */}
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isSelected
                            ? "text-white"
                            : isToday
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-800 dark:text-slate-100"
                        }`}
                      >
                        {d.day}
                      </span>

                      {/* Event Dot Indicators */}
                      <div className="flex items-center justify-center gap-0.5 my-0.5 max-w-full">
                        {d.events.slice(0, 3).map((evItem, idx) => (
                          <div
                            key={idx}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: isSelected
                                ? "#ffffff"
                                : evItem.event.color || EVENT_TYPE_CONFIG[evItem.event.eventType]?.color || "#3b82f6",
                            }}
                            title={evItem.event.title}
                          />
                        ))}
                        {d.events.length > 3 && (
                          <span className={`text-[8px] font-bold ${isSelected ? "text-white" : "text-slate-400"}`}>
                            +
                          </span>
                        )}
                      </div>

                      {/* Lunar Day Number */}
                      <span
                        className={`text-[10px] sm:text-[11px] font-semibold leading-none ${
                          isSelected
                            ? "text-blue-100"
                            : isLunarFirst
                            ? "text-rose-600 dark:text-rose-400 font-bold"
                            : isLunarFullMoon
                            ? "text-amber-600 dark:text-amber-400 font-bold"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {lunarText}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Selected Date Card (Clean, Icon-first, No Clutter) */}
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-3.5 sm:p-4 shadow-sm space-y-3"
          >
            {/* Header: Date + Lunar + Add Icon Button */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {selectedDayInfo.solarDay}/{selectedDayInfo.solarMonth}/{selectedDayInfo.solarYear}
                  </h4>
                  {selectedDate === today && (
                    <span className="px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      Hôm nay
                    </span>
                  )}
                </div>

                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-0.5 truncate">
                  🌙 {selectedDayInfo.lunar.day}/{selectedDayInfo.lunar.month} ÂL · {selectedDayInfo.lunar.canChiDay}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAddEvent(selectedDate)}
                className="h-8 px-2.5 sm:px-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="Thêm sự kiện ngày này"
              >
                <Icon path={mdiPlus} size={0.65} />
                <span>Thêm</span>
              </button>
            </div>

            {/* Event List */}
            {selectedDayInfo.events.length === 0 ? (
              <div className="py-4 text-center text-slate-400">
                <Icon path={mdiCalendarBlankOutline} size={1.25} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                <p className="text-xs">Không có sự kiện</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayInfo.events.map((evItem, idx) => {
                  const ev = evItem.event;
                  const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.other;

                  return (
                    <div
                      key={ev.id || idx}
                      className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 flex items-start justify-between gap-2.5 group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 shadow-xs mt-0.5"
                          style={{ backgroundColor: `${ev.color || cfg.color}18`, color: ev.color || cfg.color }}
                        >
                          {cfg.emoji}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {ev.title}
                            </h5>
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white shadow-xs"
                              style={{ backgroundColor: ev.color || cfg.color }}
                            >
                              {cfg.label}
                            </span>
                          </div>

                          {ev.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                              {ev.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-medium mt-1 flex-wrap">
                            <span>{evItem.matchReason}</span>
                            {ev.time && (
                              <span className="flex items-center gap-0.5">
                                <Icon path={mdiClockOutline} size={0.45} />
                                <span>{ev.time}</span>
                              </span>
                            )}
                            {ev.location && (
                              <span className="flex items-center gap-0.5 text-rose-500">
                                <Icon path={mdiMapMarker} size={0.45} />
                                <span>{ev.location}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Edit / Delete actions on user events */}
                      {!ev.isDefaultHoliday && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditEvent(ev)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Sửa"
                          >
                            <Icon path={mdiPencilOutline} size={0.65} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev.id, ev.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Xóa"
                          >
                            <Icon path={mdiDeleteOutline} size={0.65} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* 4. UPCOMING EVENTS TAB */}
      {activeTab === "upcoming" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-3.5 sm:p-4 shadow-sm space-y-3"
        >
          <div className="border-b border-slate-100 dark:border-slate-700 pb-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Icon path={mdiCalendarClock} size={0.7} className="text-blue-500" />
              <span>Sự kiện 60 ngày tới</span>
            </h4>
          </div>

          {filteredUpcoming.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-xs">Không có sự kiện nào sắp diễn ra.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredUpcoming.map((item, idx) => {
                const ev = item.event;
                const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.other;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                      item.isToday
                        ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60"
                        : item.daysRemaining <= 3
                        ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60"
                        : "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-700/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-xs"
                          style={{
                            backgroundColor: `${ev.color || cfg.color}18`,
                            color: ev.color || cfg.color,
                          }}
                        >
                          {cfg.emoji}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {ev.title}
                            </h5>
                          </div>

                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                            {item.formattedDateStr}
                          </p>

                          {ev.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Countdown badge */}
                      <div className="text-right shrink-0">
                        {item.isToday ? (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-500 text-white font-bold text-[10px] animate-pulse">
                            Hôm nay
                          </span>
                        ) : item.daysRemaining === 1 ? (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-white font-bold text-[10px]">
                            Ngày mai
                          </span>
                        ) : (
                          <div className="text-right">
                            <span className="text-base font-black text-blue-600 dark:text-blue-400">
                              {item.daysRemaining}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 block -mt-1">
                              ngày
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions if user event */}
                    {!ev.isDefaultHoliday && (
                      <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
                        <button
                          type="button"
                          onClick={() => handleOpenEditEvent(ev)}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Sửa
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id, ev.title)}
                          className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Event Add/Edit Modal */}
      <EventModal
        isOpen={isModalOpen}
        initialEvent={editingEvent}
        defaultDateStr={selectedDate}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}
