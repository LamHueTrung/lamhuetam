import React, { useState, useMemo } from "react";
import { Icon } from "@mdi/react";
import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiFire,
  mdiCalendarMonth,
  mdiPlus,
  mdiClockOutline,
  mdiMapMarker,
  mdiStarOutline,
  mdiCheckCircleOutline,
} from "@mdi/js";
import { motion, AnimatePresence } from "motion/react";
import { MOOD_CONFIG } from "./DiaryMoodConfig";
import { getLocalDateString } from "../utils/date";
import { DiaryEntry } from "../types";

interface Props {
  entries: DiaryEntry[];
  month: string;
  onMonthChange: (m: string) => void;
  onSelectDate: (date: string) => void;
  onOpenCreateEntry?: (date?: string) => void;
}

export default function CalendarView({
  entries,
  month,
  onMonthChange,
  onSelectDate,
  onOpenCreateEntry,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());

  const dateMap = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    entries.forEach((e) => {
      const existing = map.get(e.date) || [];
      existing.push(e);
      map.set(e.date, existing);
    });
    return map;
  }, [entries]);

  const calendarDays = useMemo(() => {
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr);
    const monthNum = parseInt(monthStr) - 1;
    const firstDay = new Date(year, monthNum, 1);
    const lastDay = new Date(year, monthNum + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon, ...

    const days: { date: string | null; day: number; entries: DiaryEntry[] }[] = [];

    // Adjust for Monday start
    const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    for (let i = 0; i < offset; i++) {
      days.push({ date: null, day: 0, entries: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${month}-${String(d).padStart(2, "0")}`;
      days.push({
        date: dateStr,
        day: d,
        entries: dateMap.get(dateStr) || [],
      });
    }

    while (days.length % 7 !== 0) {
      days.push({ date: null, day: 0, entries: [] });
    }

    return days;
  }, [month, dateMap]);

  const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

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

  const formatMonthLabel = (m: string) => {
    const [y, mo] = m.split("-");
    return `Tháng ${parseInt(mo)}/${y}`;
  };

  const streakCount = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length === 0) return 0;
    const dateSet = new Set(sorted.map((e) => e.date));
    let count = 0;
    const d = new Date();
    const today = getLocalDateString(d);
    if (!dateSet.has(today)) d.setDate(d.getDate() - 1);
    while (true) {
      const key = getLocalDateString(d);
      if (dateSet.has(key)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return count;
  }, [entries]);

  const today = getLocalDateString();
  const selectedEntries = dateMap.get(selectedDate) || [];

  const formatSelectedDateTitle = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Calendar Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm"
      >
        {/* Header navigation */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={prevMonth}
            className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          >
            <Icon path={mdiChevronLeft} size={0.875} className="text-slate-500" />
          </button>
          <div className="text-center">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center justify-center gap-2">
              <Icon path={mdiCalendarMonth} size={0.8} className="text-blue-500" />
              <span>{formatMonthLabel(month)}</span>
            </h3>
            {streakCount > 0 && (
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-orange-500 mt-0.5">
                <Icon path={mdiFire} size={0.5} />
                <span>{streakCount} ngày liên tiếp viết nhật ký</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          >
            <Icon path={mdiChevronRight} size={0.875} className="text-slate-500" />
          </button>
        </div>

        {/* Days grid */}
        <div className="p-3 md:p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((wd) => (
              <div
                key={wd}
                className="text-center text-[10px] font-bold text-slate-400 py-1"
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((d, i) => {
              if (!d.date) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }

              const isToday = d.date === today;
              const isSelected = d.date === selectedDate;
              const hasEntries = d.entries.length > 0;
              const moods = d.entries.map((e) => e.mood);
              const primaryMood =
                moods.length > 0
                  ? moods
                      .sort(
                        (a, b) =>
                          d.entries.filter((x) => x.mood === a).length -
                          d.entries.filter((x) => x.mood === b).length
                      )
                      .pop()
                  : null;
              const moodHex = primaryMood ? MOOD_CONFIG[primaryMood]?.hex : null;

              return (
                <motion.button
                  key={d.date}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    setSelectedDate(d.date!);
                    if (hasEntries) onSelectDate(d.date!);
                  }}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative cursor-pointer transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105"
                      : isToday
                      ? "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                      : hasEntries
                      ? "hover:bg-slate-100 dark:hover:bg-slate-700"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      isSelected
                        ? "text-white"
                        : isToday
                        ? "text-blue-600 dark:text-blue-400"
                        : hasEntries
                        ? "text-slate-800 dark:text-slate-100"
                        : "text-slate-500"
                    }`}
                  >
                    {d.day}
                  </span>

                  {hasEntries && moodHex && (
                    <div className="flex gap-0.5 mt-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: isSelected ? "#ffffff" : moodHex }}
                      />
                      {d.entries.length > 1 && (
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: isSelected ? "#ffffff" : moodHex,
                            opacity: 0.6,
                          }}
                        />
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Selected Day Events & Entries Section */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-4 md:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Sự kiện & Nhật ký
            </span>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {formatSelectedDateTitle(selectedDate)}
            </h4>
          </div>

          {onOpenCreateEntry && (
            <button
              type="button"
              onClick={() => onOpenCreateEntry(selectedDate)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Icon path={mdiPlus} size={0.7} />
              <span>Viết bản tin</span>
            </button>
          )}
        </div>

        {selectedEntries.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <p className="text-xs">Chưa có bài viết hoặc sự kiện nào trong ngày này.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedEntries.map((entry) => {
              const mCfg = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.positive;
              return (
                <div
                  key={entry.id}
                  onClick={() => onSelectDate(entry.date)}
                  className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-start gap-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <span className="text-lg">{mCfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2 font-medium">
                      {entry.content}
                    </p>
                    {entry.location && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-500 font-medium mt-1">
                        <Icon path={mdiMapMarker} size={0.4} />
                        {entry.location}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}