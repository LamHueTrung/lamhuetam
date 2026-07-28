import { Icon } from "@mdi/react";
import { mdiFire, mdiStar } from "@mdi/js";
import { motion } from "motion/react";
import type { DiaryStreakData } from "../types";

interface Props {
  data: DiaryStreakData;
}

export default function StreakBadge({ data }: Props) {
  const { current, longest, todayWritten } = data;

  if (current === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
        <Icon path={mdiFire} size={0.667} />
        <span className="text-[10px] font-bold">Chưa có streak</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 12, stiffness: 180 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-[10px] ${
        todayWritten
          ? "bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800"
          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
      }`}
    >
      <motion.div
        animate={todayWritten ? { rotate: [0, -10, 10, -5, 0] } : {}}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Icon path={mdiFire} size={0.75} className={todayWritten ? "text-orange-500" : "text-slate-400"} />
      </motion.div>
      <span className="font-black text-xs">{current}</span>
      <span>ngày</span>
      {longest > current && (
        <span className="flex items-center gap-1 text-slate-400 ml-1">
          <Icon path={mdiStar} size={0.5} />
          Kỉ lục: {longest}
        </span>
      )}
      {todayWritten && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
      )}
    </motion.div>
  );
}