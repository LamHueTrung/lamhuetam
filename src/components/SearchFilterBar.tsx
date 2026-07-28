import { useState, useRef } from "react";
import { Icon } from "@mdi/react";
import {
  mdiMagnify,
  mdiClose,
  mdiMenuDown,
  mdiSortCalendarDescending,
} from "@mdi/js";
import { motion, AnimatePresence } from "motion/react";
import type { DiaryMood } from "../types";
import { MOOD_CONFIG } from "./DiaryMoodConfig";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  selectedMood: DiaryMood | "all";
  onMoodChange: (m: DiaryMood | "all") => void;
  sort: "newest" | "oldest";
  onSortChange: (s: "newest" | "oldest") => void;
  totalCount: number;
  filteredCount: number;
}

export default function SearchFilterBar({
  search,
  onSearchChange,
  selectedMood,
  onMoodChange,
  sort,
  onSortChange,
  totalCount,
  filteredCount,
}: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2.5 min-w-0">
      <div
        className={`flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 border rounded-[20px] px-4 py-2.5 transition-all ${
          focused
            ? "border-cyan-300 dark:border-cyan-700 shadow-[0_0_0_3px_rgba(6,182,212,0.15)]"
            : "border-slate-100 dark:border-slate-700"
        }`}
      >
        <Icon path={mdiMagnify} size={0.875} className="text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Tìm kiếm nhật ký..."
          className="flex-1 bg-transparent text-sm font-medium outline-none dark:text-white placeholder:text-slate-400 min-w-0"
        />
        <AnimatePresence>
          {search && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={() => { onSearchChange(""); inputRef.current?.focus(); }}
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 cursor-pointer shrink-0"
            >
              <Icon path={mdiClose} size={0.667} />
            </motion.button>
          )}
        </AnimatePresence>
        <button
          onClick={() => onSortChange(sort === "newest" ? "oldest" : "newest")}
          className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
        >
          <Icon path={mdiSortCalendarDescending} size={0.6} />
          {sort === "newest" ? "Mới" : "Cũ"}
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none min-w-0 no-swipe">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onMoodChange("all")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
            selectedMood === "all"
              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
              : "bg-white/60 dark:bg-slate-800/60 text-slate-500 border-slate-100 dark:border-slate-700 hover:border-slate-300"
          }`}
        >
          Tất cả
        </motion.button>
        {(Object.entries(MOOD_CONFIG) as [DiaryMood, typeof MOOD_CONFIG[DiaryMood]][]).map(([key, cfg]) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.95 }}
            onClick={() => onMoodChange(key)}
            className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
              selectedMood === key
                ? `${cfg.bg} ${cfg.color} border-current`
                : "bg-white/60 dark:bg-slate-800/60 text-slate-500 border-slate-100 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <span>{cfg.emoji}</span>
            <span>{cfg.label}</span>
          </motion.button>
        ))}
      </div>

      {search && (
        <p className="text-[10px] text-slate-400 font-medium px-1">
          Tìm thấy {filteredCount}/{totalCount} nhật ký
        </p>
      )}
    </div>
  );
}