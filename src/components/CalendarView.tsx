import { useMemo } from "react";
import { Icon } from "@mdi/react";
import { mdiChevronLeft, mdiChevronRight, mdiFire } from "@mdi/js";
import { motion } from "motion/react";
import { MOOD_CONFIG } from "./DiaryMoodConfig";
import { getLocalDateString } from "../utils/date";

interface Props {
  entries: DiaryEntry[];
  month: string;
  onMonthChange: (m: string) => void;
  onSelectDate: (date: string) => void;
}

export default function CalendarView({ entries, month, onMonthChange, onSelectDate }: Props) {
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

  // Calculate streak for display
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[24px] overflow-hidden min-w-0"
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
        <button
          onClick={prevMonth}
          className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
        >
          <Icon path={mdiChevronLeft} size={0.875} className="text-slate-500" />
        </button>
        <div className="text-center">
          <span className="text-sm font-black text-slate-800 dark:text-white">
            {formatMonthLabel(month)}
          </span>
          {streakCount > 0 && (
            <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-orange-500 mt-0.5">
              <Icon path={mdiFire} size={0.5} />
              <span>{streakCount} ngày liên tiếp</span>
            </div>
          )}
        </div>
        <button
          onClick={nextMonth}
          className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer"
        >
          <Icon path={mdiChevronRight} size={0.875} className="text-slate-500" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="p-3">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map((wd) => (
            <div
              key={wd}
              className="text-center text-[9px] font-bold text-slate-400 py-1.5"
            >
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((d, i) => {
            if (!d.date) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }

            const isToday = d.date === today;
            const hasEntries = d.entries.length > 0;
            const moods = d.entries.map((e) => e.mood);
            const primaryMood = moods.length > 0
              ? moods.sort((a, b) =>
                  d.entries.filter((x) => x.mood === a).length -
                  d.entries.filter((x) => x.mood === b).length
                ).pop()
              : null;
            const moodHex = primaryMood ? MOOD_CONFIG[primaryMood]?.hex : null;

            return (
              <motion.button
                key={d.date}
                whileTap={{ scale: 0.9 }}
                onClick={() => hasEntries && onSelectDate(d.date!)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative cursor-pointer min-w-0 ${
                  isToday
                    ? "ring-2 ring-cyan-500 dark:ring-cyan-400"
                    : ""
                } ${
                  hasEntries
                    ? "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    : "opacity-50"
                }`}
              >
                <span
                  className={`text-xs font-bold ${
                    isToday
                      ? "text-cyan-600 dark:text-cyan-400"
                      : hasEntries
                        ? "text-slate-800 dark:text-white"
                        : "text-slate-400"
                  }`}
                >
                  {d.day}
                </span>
                {hasEntries && moodHex && (
                  <div className="flex gap-0.5 mt-0.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: moodHex }}
                    />
                    {d.entries.length > 1 && (
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: moodHex, opacity: 0.5 }}
                      />
                    )}
                  </div>
                )}
                {isToday && !hasEntries && (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mt-0.5" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}