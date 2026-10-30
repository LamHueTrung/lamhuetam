import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@mdi/react";
import {
  mdiArrowLeft,
  mdiTrendingUp,
  mdiTrendingDown,
  mdiMinus,
  mdiBellRingOutline,
  mdiRefresh,
  mdiGasStation,
  mdiRing,
  mdiGold,
  mdiDiamondStone,
  mdiCogOutline,
  mdiInformationOutline,
  mdiLoading,
} from "@mdi/js";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  fetchPriceHistory,
  type MarketCategory,
  type MarketPrice,
} from "../services/marketPriceService";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  DEFAULT_THRESHOLDS,
  buildChartData,
  compareWeeks,
  computeChange,
  computeStats,
  detectAlerts,
  formatPct,
  formatSigned,
  formatVnd,
  groupBySeries,
  seriesLabel,
  summarize,
  type AlertThresholds,
} from "../utils/marketStats";

interface MarketPricesPageProps {
  onBack: () => void;
}

const CATEGORY_ICON: Record<MarketCategory, string> = {
  gold_ring: mdiRing,
  gold_bar: mdiGold,
  jewelry: mdiDiamondStone,
  fuel: mdiGasStation,
};

const RANGES = [7, 30, 90] as const;
const THRESHOLD_KEY = "market_alert_thresholds";
const SEEN_KEY = "market_alert_seen";

// Tăng = xanh, giảm = đỏ (đúng quy ước bảng giá VN / webgia)
const trendClass = (diff: number) =>
  diff > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : diff < 0
      ? "text-rose-600 dark:text-rose-400"
      : "text-slate-400";

function loadThresholds(): AlertThresholds {
  try {
    const raw = localStorage.getItem(THRESHOLD_KEY);
    if (!raw) return DEFAULT_THRESHOLDS;
    const p = JSON.parse(raw);
    return {
      gold: Number(p.gold) > 0 ? Number(p.gold) : DEFAULT_THRESHOLDS.gold,
      fuel: Number(p.fuel) > 0 ? Number(p.fuel) : DEFAULT_THRESHOLDS.fuel,
    };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

export default function MarketPricesPage({ onBack }: MarketPricesPageProps) {
  const [category, setCategory] = useState<MarketCategory>("gold_ring");
  const [days, setDays] = useState<number>(30);
  const [rows, setRows] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [thresholds, setThresholds] = useState<AlertThresholds>(loadThresholds);

  const [fuelFilter, setFuelFilter] = useState<"e" | "all" | "oil">("e");

  // Luôn lấy ≥ 30 ngày để tính biến động xăng dầu (đổi giá theo tuần) & cảnh báo
  const fetchDays = Math.max(days, 30);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      setRows(await fetchPriceHistory(fetchDays));
    } catch (e: any) {
      setError(e?.message || "Không tải được dữ liệu giá");
    } finally {
      setLoading(false);
    }
  }, [fetchDays]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => groupBySeries(rows), [rows]);

  const latestByKey = useMemo(() => {
    const m = new Map<string, MarketPrice>();
    grouped.forEach((pts, k) => m.set(k, pts[pts.length - 1]));
    return m;
  }, [grouped]);

  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {};
    latestByKey.forEach((r) => (c[r.category] = (c[r.category] || 0) + 1));
    return c;
  }, [latestByKey]);

  const seriesInCategory = useMemo(() => {
    let list = Array.from(latestByKey.values()).filter(
      (r) => r.category === category,
    );

    if (category === "fuel") {
      if (fuelFilter === "e") {
        list = list.filter((r) => r.product.toLowerCase().includes("xăng e"));
      } else if (fuelFilter === "oil") {
        list = list.filter((r) => !r.product.toLowerCase().includes("xăng e"));
      }
    }

    return list.sort((a, b) => {
      if (category === "fuel") {
        // Ưu tiên xăng E: E5 -> E10 -> Dầu DO
        const getScore = (p: string) => {
          const s = p.toLowerCase();
          if (s.includes("e5")) return 1;
          if (s.includes("e10")) return 2;
          if (s.includes("dầu do")) return 3;
          return 4;
        };
        const scoreA = getScore(a.product);
        const scoreB = getScore(b.product);
        if (scoreA !== scoreB) return scoreA - scoreB;
        if (a.region !== b.region) {
          if (a.region === "Vùng 1") return -1;
          if (b.region === "Vùng 1") return 1;
        }
      }
      return seriesLabel(a).localeCompare(seriesLabel(b), "vi");
    });
  }, [latestByKey, category, fuelFilter]);

  // Tự chọn chuỗi đầu tiên khi đổi nhóm hoặc khi chuỗi đang chọn không còn
  useEffect(() => {
    if (!seriesInCategory.some((r) => r.series_key === selectedKey)) {
      if (category === "fuel") {
        const pref =
          seriesInCategory.find(
            (r) => r.product.includes("E5") && r.region === "Vùng 1",
          ) ||
          seriesInCategory.find((r) =>
            r.product.toLowerCase().includes("xăng e"),
          ) ||
          seriesInCategory[0];
        setSelectedKey(pref?.series_key || "");
      } else {
        setSelectedKey(seriesInCategory[0]?.series_key || "");
      }
    }
  }, [seriesInCategory, selectedKey, category]);

  const alerts = useMemo(
    () => detectAlerts(grouped, thresholds),
    [grouped, thresholds],
  );

  // Toast 1 lần cho mỗi bộ cảnh báo mới
  useEffect(() => {
    if (alerts.length === 0) return;
    const sig = alerts.map((a) => a.stamp).join(",");
    if (localStorage.getItem(SEEN_KEY) === sig) return;
    localStorage.setItem(SEEN_KEY, sig);
    const top = alerts[0];
    toast(
      `⚠️ Giá biến động mạnh: ${top.label} ${formatPct(top.change.pct)}${alerts.length > 1 ? ` (+${alerts.length - 1} mục khác)` : ""}`,
      { duration: 6000 },
    );
  }, [alerts]);

  const selectedPoints = selectedKey ? grouped.get(selectedKey) || [] : [];
  const selected = selectedPoints[selectedPoints.length - 1];
  const meta = CATEGORY_META[category];
  const change = selected ? computeChange(selectedPoints, category) : null;
  const stats = selected ? computeStats(selectedPoints, days) : null;
  const weeks = selected ? compareWeeks(selectedPoints) : null;
  const spread =
    selected && selected.buy_price !== null && selected.sell_price !== null
      ? selected.sell_price - selected.buy_price
      : null;
  const chartData = useMemo(
    () => buildChartData(selectedPoints, days),
    [selectedPoints, days],
  );
  const hasBuy = selectedPoints.some((p) => p.buy_price !== null);

  // So sánh: cùng loại sản phẩm ở các hãng/vùng khác nhau; nếu chỉ có 1 thì so cả nhóm
  const compareRows = useMemo(() => {
    if (!selected) return [];
    const same = seriesInCategory.filter((r) => r.product === selected.product);
    const list = same.length >= 2 ? same : seriesInCategory;
    return list
      .filter((r) => r.sell_price !== null)
      .map((r) => ({
        key: r.series_key,
        name: same.length >= 2 ? (category === "fuel" ? r.region : `${r.brand}${r.region ? ` · ${r.region}` : ""}`) : seriesLabel(r),
        value: r.sell_price as number,
        spread: r.buy_price !== null && r.sell_price !== null ? r.sell_price - r.buy_price : null,
      }))
      .sort((a, b) => a.value - b.value);
  }, [seriesInCategory, selected, category]);

  const lastUpdate = useMemo(() => {
    let t = 0;
    latestByKey.forEach((r) => (t = Math.max(t, new Date(r.created_at).getTime())));
    return t ? new Date(t).toISOString() : null;
  }, [latestByKey]);

  const firstRecord = rows.length ? rows[0].created_at : null;

  const saveThresholds = (next: AlertThresholds) => {
    setThresholds(next);
    localStorage.setItem(THRESHOLD_KEY, JSON.stringify(next));
    localStorage.removeItem(SEEN_KEY);
  };

  const refresh = async () => {
    await load(true);
    toast.success("Đã làm mới");
  };

  const card =
    "bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm";
  const axisTick = { fontSize: 10, fill: "#94a3b8" };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
        >
          <Icon path={mdiArrowLeft} size={0.65} className="text-slate-500 dark:text-slate-400" />
          <span>Quay lại</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Cài đặt cảnh báo"
            className="p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-slate-500 cursor-pointer active:scale-95"
          >
            <Icon path={mdiCogOutline} size={0.7} />
          </button>
          <button
            onClick={refresh}
            aria-label="Làm mới"
            className="p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-slate-500 cursor-pointer active:scale-95"
          >
            <Icon path={mdiRefresh} size={0.7} />
          </button>
        </div>
      </div>

      <div className="px-1">
        <h1 className="text-lg font-black text-slate-900 dark:text-white">Giá Vàng & Xăng</h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {lastUpdate ? `Cập nhật lần cuối: ${fmtTime(lastUpdate)}` : "Chưa có dữ liệu"} · Nguồn: webgia.com
        </p>
      </div>

      {/* Cài đặt cảnh báo */}
      {showSettings && (
        <div className={`${card} space-y-3`}>
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Cảnh báo khi giá biến động từ mức này trở lên
          </div>
          {([
            ["gold", "Vàng (so với hôm qua)"],
            ["fuel", "Xăng dầu (so với kỳ trước)"],
          ] as const).map(([k, label]) => (
            <label key={k} className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span>{label}</span>
              <span className="flex items-center gap-1">
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={thresholds[k]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0) saveThresholds({ ...thresholds, [k]: v });
                  }}
                  className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-right font-bold"
                />
                %
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Cảnh báo biến động mạnh */}
      {alerts.length > 0 && (
        <div className="rounded-3xl p-4 border border-amber-300/60 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/30 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-extrabold uppercase tracking-wider">
            <Icon path={mdiBellRingOutline} size={0.75} />
            Giá biến động mạnh
          </div>
          {alerts.slice(0, 4).map((a) => (
            <button
              key={a.stamp}
              onClick={() => {
                setCategory(a.category);
                setSelectedKey(a.series_key);
              }}
              className="w-full flex items-center justify-between gap-2 text-left text-xs cursor-pointer"
            >
              <span className="min-w-0 truncate text-slate-700 dark:text-slate-200 font-semibold">{a.label}</span>
              <span className={`shrink-0 font-black ${trendClass(a.change.diff)}`}>
                {formatPct(a.change.pct)} ({formatSigned(a.change.diff)})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Tabs nhóm */}
      <div className="grid grid-cols-4 gap-1 bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[20px] p-1 shadow-sm">
        {CATEGORY_ORDER.map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-2xl text-[10px] font-bold cursor-pointer transition-all ${
                active
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Icon path={CATEGORY_ICON[c]} size={0.8} />
              <span className="leading-tight text-center">{CATEGORY_META[c].label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1 flex gap-1.5">
        <Icon path={mdiInformationOutline} size={0.6} className="shrink-0 mt-0.5" />
        {meta.hint}
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Icon path={mdiLoading} size={1.8} className="text-slate-400 animate-spin" />
        </div>
      ) : error ? (
        <div className={`${card} text-xs text-rose-600`}>
          Lỗi tải dữ liệu: {error}
          <button onClick={() => load()} className="ml-2 underline font-bold cursor-pointer">Thử lại</button>
        </div>
      ) : seriesInCategory.length === 0 ? (
        <div className={`${card} text-xs text-slate-500 text-center py-8`}>
          {meta.emptyNote ||
            ((categoryCounts[category] || 0) === 0
              ? "Chưa có dữ liệu. Hệ thống tự cập nhật mỗi 30 phút sau khi bạn chạy file SQL và deploy."
              : "Không có dữ liệu.")}
        </div>
      ) : (
        <>
          {/* Bộ lọc nhanh cho Xăng Dầu: Ưu tiên Xăng E */}
          {category === "fuel" && (
            <div className="flex items-center gap-1.5 px-1 pb-1">
              <span className="text-[10px] font-bold text-slate-400">Xem:</span>
              <button
                onClick={() => setFuelFilter("e")}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold cursor-pointer transition-all ${
                  fuelFilter === "e"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                🌱 Chỉ Xăng E (E5 & E10)
              </button>
              <button
                onClick={() => setFuelFilter("all")}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold cursor-pointer transition-all ${
                  fuelFilter === "all"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFuelFilter("oil")}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold cursor-pointer transition-all ${
                  fuelFilter === "oil"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                Dầu DO
              </button>
            </div>
          )}

          {/* Chọn loại */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {seriesInCategory.map((r) => {
              const active = r.series_key === selectedKey;
              const ch = computeChange(grouped.get(r.series_key) || [], r.category);
              const isE = r.product.toLowerCase().includes("xăng e");
              return (
                <button
                  key={r.series_key}
                  onClick={() => setSelectedKey(r.series_key)}
                  className={`shrink-0 max-w-[220px] text-left px-3 py-2 rounded-2xl border text-[11px] cursor-pointer transition-all ${
                    active
                      ? isE
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                        : "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{seriesLabel(r)}</div>
                    {isE && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                        Xăng E
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-black text-slate-900 dark:text-white">{formatVnd(r.sell_price)}</span>
                    {ch && ch.diff !== 0 && (
                      <span className={`font-bold ${trendClass(ch.diff)}`}>{formatPct(ch.pct)}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <>
              {/* Thẻ tổng quan */}
              <div className={`${card} space-y-3`}>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {seriesLabel(selected)}
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                      {formatVnd(selected.sell_price)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {meta.unitLabel} · {selected.buy_price !== null ? "giá bán ra" : "giá bán lẻ"}
                    </div>
                  </div>
                  {change && (
                    <div className={`flex items-center gap-1 text-sm font-black ${trendClass(change.diff)}`}>
                      <Icon
                        path={change.diff > 0 ? mdiTrendingUp : change.diff < 0 ? mdiTrendingDown : mdiMinus}
                        size={0.9}
                      />
                      <span>
                        {formatSigned(change.diff)} ({formatPct(change.pct)})
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3">
                  {summarize(selected, change, meta.unitLabel)}
                </p>
                {selected.buy_price !== null && (
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2">
                      <div className="text-[10px] text-slate-400">Mua vào (tiệm mua lại)</div>
                      <div className="text-sm font-black text-slate-800 dark:text-slate-100">{formatVnd(selected.buy_price)}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2">
                      <div className="text-[10px] text-slate-400">Chênh mua – bán</div>
                      <div className="text-sm font-black text-amber-600 dark:text-amber-400">{formatVnd(spread)}</div>
                    </div>
                  </div>
                )}
                {spread !== null && (
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Chênh mua – bán là phần bạn “hao” nếu mua rồi bán lại ngay. Càng nhỏ càng có lợi.
                  </p>
                )}
              </div>

              {/* Biểu đồ */}
              <div className={`${card} space-y-3`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Diễn biến giá
                  </h2>
                  <div className="flex gap-1">
                    {RANGES.map((d) => (
                      <button
                        key={d}
                        onClick={() => setDays(d)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          days === d
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {d} ngày
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="t"
                        type="number"
                        scale="time"
                        domain={["dataMin", "dataMax"]}
                        tick={axisTick}
                        tickFormatter={(t: number) =>
                          new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
                        }
                        minTickGap={28}
                      />
                      <YAxis
                        tick={axisTick}
                        domain={["auto", "auto"]}
                        width={62}
                        tickFormatter={(v: number) => formatVnd(v)}
                      />
                      <Tooltip
                        labelFormatter={(t: number) => fmtTime(new Date(t).toISOString())}
                        formatter={(v: number, name: string) => [formatVnd(v), name]}
                        contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      />
                      <Line type="stepAfter" dataKey="sell" name={selected.buy_price !== null ? "Bán ra" : "Giá bán lẻ"} stroke="#6366f1" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                      {hasBuy && (
                        <Line type="stepAfter" dataKey="buy" name="Mua vào" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {firstRecord && (
                  <p className="text-[10px] text-slate-400">
                    Dữ liệu được ghi nhận từ {fmtTime(firstRecord)}; chỉ lưu khi giá thay đổi.
                  </p>
                )}
              </div>

              {/* Thống kê */}
              {stats && (
                <div className={`${card} space-y-3`}>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Thống kê {days} ngày
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["Cao nhất", formatVnd(stats.max), "text-emerald-600 dark:text-emerald-400"],
                      ["Thấp nhất", formatVnd(stats.min), "text-rose-600 dark:text-rose-400"],
                      ["Trung bình", formatVnd(stats.avg), "text-slate-800 dark:text-slate-100"],
                      ["Biên độ dao động", formatPct(stats.rangePct).replace("+", ""), "text-amber-600 dark:text-amber-400"],
                    ].map(([label, value, cls]) => (
                      <div key={label} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
                        <div className="text-[10px] text-slate-400">{label}</div>
                        <div className={`text-sm font-black ${cls}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-600 dark:text-slate-300">
                    {weeks ? (
                      <>
                        Trung bình tuần này <b>{formatVnd(weeks.thisWeek)}</b> so với tuần trước{" "}
                        <b>{formatVnd(weeks.lastWeek)}</b> —{" "}
                        <span className={`font-black ${trendClass(weeks.diff)}`}>
                          {weeks.diff === 0 ? "không đổi" : `${weeks.diff > 0 ? "tăng" : "giảm"} ${formatPct(Math.abs(weeks.pct))}`}
                        </span>
                        .
                      </>
                    ) : (
                      "So sánh tuần này – tuần trước sẽ hiện khi đã có đủ ~2 tuần dữ liệu."
                    )}
                  </div>
                </div>
              )}

              {/* So sánh */}
              {compareRows.length >= 2 && (
                <div className={`${card} space-y-3`}>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    So sánh giá bán {selected && compareRows.length === seriesInCategory.length ? "trong nhóm" : "giữa các nơi"}
                  </h2>
                  <div style={{ height: Math.max(120, compareRows.length * 34) }} className="w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={compareRows} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide domain={["dataMin - 100000", "dataMax"]} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={110}
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          interval={0}
                        />
                        <Tooltip
                          formatter={(v: number) => [formatVnd(v), "Giá bán"]}
                          contentStyle={{ borderRadius: 12, fontSize: 12 }}
                        />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} isAnimationActive={false}>
                          {compareRows.map((r) => (
                            <Cell key={r.key} fill={r.key === selectedKey ? "#6366f1" : "#cbd5e1"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Chênh lệch giữa rẻ nhất và đắt nhất:{" "}
                    <b>{formatVnd(compareRows[compareRows.length - 1].value - compareRows[0].value)} {meta.unitLabel}</b>
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      <p className="text-[10px] text-slate-400 text-center px-4 leading-snug">
        Giá chỉ mang tính tham khảo, có thể chậm so với tiệm vàng/cây xăng. Nguồn tổng hợp: webgia.com.
      </p>
    </div>
  );
}
