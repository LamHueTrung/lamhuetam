import { Icon } from "@mdi/react";
import {
  mdiEmoticonHappyOutline,
  mdiEmoticonSadOutline,
  mdiEmoticonNeutralOutline,
  mdiStar,
  mdiWeatherLightning,
  mdiHeart,
  mdiHandsPray,
} from "@mdi/js";
import type { DiaryMood } from "../types";

export const MOOD_CONFIG: Record<
  DiaryMood,
  {
    icon: string;
    label: string;
    color: string;
    bg: string;
    hex: string;
  }
> = {
  positive: {
    icon: mdiEmoticonHappyOutline,
    label: "Tích cực",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800",
    hex: "#10b981",
  },
  excited: {
    icon: mdiStar,
    label: "Phấn khích",
    color: "text-yellow-500",
    bg: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800",
    hex: "#eab308",
  },
  grateful: {
    icon: mdiHandsPray,
    label: "Biết ơn",
    color: "text-cyan-600",
    bg: "bg-cyan-50 border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-800",
    hex: "#06b6d4",
  },
  neutral: {
    icon: mdiEmoticonNeutralOutline,
    label: "Trung hòa",
    color: "text-slate-500",
    bg: "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700",
    hex: "#64748b",
  },
  sad: {
    icon: mdiEmoticonSadOutline,
    label: "Buồn",
    color: "text-blue-500",
    bg: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
    hex: "#3b82f6",
  },
  angry: {
    icon: mdiWeatherLightning,
    label: "Tức giận",
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800",
    hex: "#ef4444",
  },
  negative: {
    icon: mdiHeart,
    label: "Tiêu cực",
    color: "text-rose-400",
    bg: "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800",
    hex: "#f43f5e",
  },
};