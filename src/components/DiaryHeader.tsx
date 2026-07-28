import { useRef, useEffect } from "react";
import { Icon } from "@mdi/react";
import { mdiBookOpenVariant, mdiDotsHorizontal } from "@mdi/js";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from "motion/react";
import StreakBadge from "./StreakBadge";
import type { DiaryStreakData } from "../types";

interface Props {
  streakData: DiaryStreakData;
  totalEntries: number;
}

export default function DiaryHeader({ streakData, totalEntries }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const headerTop = useMotionValue(0);
  const scrollProgress = useTransform(scrollY, [0, 120], [0, 1]);

  const opacity = useTransform(scrollProgress, [0, 0.5], [1, 0]);
  const y = useTransform(scrollProgress, [0, 1], [0, -20]);
  const scale = useTransform(scrollProgress, [0, 1], [1, 0.92]);
  const borderRadius = useTransform(scrollProgress, [0, 1], ["28px", "16px"]);

  // 3D Parallax layers
  const bgY = useTransform(scrollY, [0, 200], [0, -40]);
  const shapesY = useTransform(scrollY, [0, 200], [0, -25]);

  return (
    <motion.div
      ref={ref}
      className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 min-w-0"
    >
      {/* Layer 1: Animated background particles */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 opacity-20">
        <div className="absolute top-4 left-8 w-20 h-20 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
        <div
          className="absolute bottom-4 right-12 w-32 h-32 rounded-full bg-purple-500/15 blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/3 w-16 h-16 rounded-full bg-blue-500/20 blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </motion.div>

      {/* Layer 2: Floating shapes */}
      <motion.div
        style={{ y: shapesY }}
        className="absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-6 right-8 w-2 h-2 rounded-full bg-cyan-400/60" />
        <div className="absolute bottom-8 left-10 w-3 h-3 rounded-full bg-purple-400/40" />
        <div className="absolute top-3 left-16 w-1.5 h-1.5 rounded-full bg-white/30" />
      </motion.div>

      {/* Layer 3: Content */}
      <motion.div
        style={{
          opacity,
          y,
          scale,
          borderRadius,
        }}
        className="relative px-5 pt-5 pb-4 space-y-3"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", damping: 16, stiffness: 200 }}
            >
              <span className="text-[10px] font-bold text-cyan-400/80 tracking-[0.2em] uppercase">
                NHẬT KÝ
              </span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-[11px] font-medium text-white/50"
            >
              {totalEntries} bài viết ·{" "}
              {streakData.longest > 0
                ? `Kỉ lục ${streakData.longest} ngày`
                : "Bắt đầu viết nhật ký"}
            </motion.p>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              damping: 14,
              stiffness: 160,
              delay: 0.1,
            }}
          >
            <StreakBadge data={streakData} />
          </motion.div>
        </div>

        {/* Animated wave under title */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
          className="h-px bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-transparent origin-left"
        />
      </motion.div>
    </motion.div>
  );
}
