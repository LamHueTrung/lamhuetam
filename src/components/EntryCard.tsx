import { useState, useRef } from "react";
import { Icon } from "@mdi/react";
import {
  mdiPencil,
  mdiDeleteOutline,
  mdiPin,
  mdiPinOff,
  mdiCommentTextOutline,
  mdiMapMarker,
  mdiCalendar,
  mdiContentCopy,
  mdiShareVariant,
} from "@mdi/js";
import { motion, useDragControls, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import type { DiaryEntry } from "../types";
import { MOOD_CONFIG } from "./DiaryMoodConfig";

interface Props {
  entry: DiaryEntry;
  index: number;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onViewDetail: (entry: DiaryEntry) => void;
}

export default function EntryCard({ entry, index, onEdit, onDelete, onPin, onViewDetail }: Props) {
  const [swiped, setSwiped] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragControls = useDragControls();
  const m = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.neutral;

  const springConfig = {
    positive: { damping: 14, stiffness: 200 },
    excited: { damping: 10, stiffness: 170 },
    grateful: { damping: 16, stiffness: 190 },
    neutral: { damping: 22, stiffness: 220 },
    sad: { damping: 26, stiffness: 240 },
    angry: { damping: 20, stiffness: 210 },
    negative: { damping: 24, stiffness: 230 },
  };

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const snippet =
    entry.content.length > 120
      ? entry.content.slice(0, 120) + "..."
      : entry.content;

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.content);
  };

  const dragX = useMotionValue(0);
  const actionsOpacity = useTransform(dragX, [-80, 0], [1, 0]);

  return (
    <div className="relative min-w-0 overflow-hidden">
      {/* Swipe-reveal actions */}
      <motion.div
        style={{ opacity: actionsOpacity }}
        className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3"
      >
        <button
          onClick={() => onEdit(entry)}
          className="w-11 h-11 rounded-xl bg-cyan-500 text-white flex items-center justify-center shadow-lg cursor-pointer"
        >
          <Icon path={mdiPencil} size={0.7} />
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          className="w-11 h-11 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg cursor-pointer"
        >
          <Icon path={mdiDeleteOutline} size={0.7} />
        </button>
        <button
          onClick={() => onPin(entry.id)}
          className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg cursor-pointer ${
            entry.pinned ? "bg-amber-500 text-white" : "bg-slate-200 dark:bg-slate-600 text-slate-500"
          }`}
        >
          <Icon path={entry.pinned ? mdiPinOff : mdiPin} size={0.7} />
        </button>
      </motion.div>

      {/* Main card */}
      <motion.div
        layout
        drag="x"
        dragControls={dragControls}
        dragConstraints={{ left: -160, right: 0 }}
        dragElastic={{ left: 0.3, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) setSwiped(true);
          else setSwiped(false);
        }}
        style={{ x: dragX }}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          type: "spring",
          ...springConfig[entry.mood],
          delay: Math.min(index * 0.04, 0.4),
        }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onViewDetail(entry)}
        className="relative bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[20px] overflow-hidden cursor-pointer select-none min-w-0"
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5"
          style={{
            background: `linear-gradient(to bottom, ${m.hex}, ${m.hex}88)`,
          }}
        />

        <div className="pl-4 pr-4 pt-3.5 pb-3.5 space-y-2.5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <motion.div
                whileHover={{ scale: 1.15, rotate: [0, -8, 8, 0] }}
                className={`p-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-sm ${m.color} shrink-0`}
                style={{ boxShadow: `0 2px 8px ${m.hex}22` }}
              >
                <Icon path={m.icon} size={0.8} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-slate-800 dark:text-white block truncate">
                  {formatDate(entry.date)}
                </span>
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
                  {entry.location && (
                    <span className="flex items-center gap-0.5 truncate">
                      <Icon path={mdiMapMarker} size={0.45} />
                      {entry.location}
                    </span>
                  )}
                  {entry.pinned && (
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                      <Icon path={mdiPin} size={0.45} />
                      Ghim
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap break-words">
            {snippet}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {(entry.tags || []).slice(0, 3).map((t, i) => (
                <span
                  key={i}
                  className="text-[8px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full truncate"
                >
                  #{t}
                </span>
              ))}
              {(entry.tags || []).length > 3 && (
                <span className="text-[8px] font-bold text-slate-400">
                  +{entry.tags.length - 3}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(entry.replies || []).length > 0 && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold text-cyan-500">
                  <Icon path={mdiCommentTextOutline} size={0.5} />
                  {entry.replies!.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Long-press context menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            onClick={() => setShowMenu(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-[20px] shadow-2xl border border-slate-100 dark:border-slate-700 p-2 min-w-[200px]"
            >
              {[
                { icon: mdiContentCopy, label: "Sao chép nội dung", action: handleCopy },
                { icon: mdiShareVariant, label: "Chia sẻ", action: () => {} },
                { icon: entry.pinned ? mdiPinOff : mdiPin, label: entry.pinned ? "Bỏ ghim" : "Ghim lên đầu", action: () => onPin(entry.id) },
                { icon: mdiPencil, label: "Sửa", action: () => onEdit(entry) },
                { icon: mdiDeleteOutline, label: "Xóa", action: () => onDelete(entry.id) },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => { item.action(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Icon path={item.icon} size={0.667} className="text-slate-400" />
                  {item.label}
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}