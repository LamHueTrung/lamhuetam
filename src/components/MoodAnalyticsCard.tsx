import { useMemo, useState } from "react";
import { Icon } from "@mdi/react";
import { mdiChevronDown, mdiChartDonut } from "@mdi/js";
import { motion, AnimatePresence } from "motion/react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { DiaryMoodStat, DiaryMood } from "../types";
import { MOOD_CONFIG } from "./DiaryMoodConfig";

interface Props {
  stats: DiaryMoodStat[];
  totalEntries: number;
}

export default function MoodAnalyticsCard({ stats, totalEntries }: Props) {
  const [expanded, setExpanded] = useState(true);

  const chartData = useMemo(() => {
    return stats.map((s) => ({
      name: MOOD_CONFIG[s.mood]?.label || s.mood,
      value: s.count,
      color: MOOD_CONFIG[s.mood]?.hex || "#64748b",
      icon: MOOD_CONFIG[s.mood]?.icon,
    }));
  }, [stats]);

  const total = chartData.reduce((s, d) => s + d.value, 0);
  const topStat = stats[0];
  const topConfig = topStat ? MOOD_CONFIG[topStat.mood] : null;

  return (
    <motion.div
      layout
      className="bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[24px] overflow-hidden min-w-0"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Icon path={mdiChartDonut} size={0.875} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Phân Tích Cảm Xúc
          </span>
          <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">
            {totalEntries} bài
          </span>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
          <Icon path={mdiChevronDown} size={0.75} className="text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-4">
              {stats.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-medium text-center py-4">
                  Viết nhật ký để xem phân tích cảm xúc
                </p>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-[120px] h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={32}
                          outerRadius={52}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                          animationBegin={200}
                          animationDuration={800}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {topConfig && (
                      <div className="text-center -mt-[88px]">
                        <p className="text-[20px] font-black text-slate-800 dark:text-white">
                          {topStat.percentage}%
                        </p>
                        <div className="flex items-center justify-center gap-0.5">
                          <Icon path={topConfig.icon} size={0.5} className={topConfig.color} />
                          <span className="text-[8px] font-bold text-slate-400">
                            {topConfig.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    {stats.slice(0, 5).map((m, i) => {
                      const cfg = MOOD_CONFIG[m.mood];
                      if (!cfg) return null;
                      return (
                        <motion.div
                          key={m.mood}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.08 }}
                          className="flex items-center gap-2 min-w-0"
                        >
                          <Icon path={cfg.icon} size={0.7} className={`${cfg.color} shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between min-w-0">
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                                {cfg.label}
                              </span>
                              <span className="text-[10px] font-black text-slate-400 ml-2">{m.count}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${m.percentage}%` }}
                                transition={{ duration: 0.6, delay: 0.5 + i * 0.08, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: cfg.hex }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}