import type { MarketCategory, MarketPrice } from "../services/marketPriceService";

export const CATEGORY_META: Record<
  MarketCategory,
  { label: string; hint: string; unitLabel: string; emptyNote?: string }
> = {
  gold_ring: {
    label: "Vàng cưới",
    hint: "Nhẫn tròn trơn 99,99% — loại hay mua làm của hồi môn, quà cưới.",
    unitLabel: "đ/chỉ",
  },
  gold_bar: {
    label: "Vàng miếng",
    hint: "Vàng thỏi SJC — thường dùng để tích trữ.",
    unitLabel: "đ/chỉ",
  },
  jewelry: {
    label: "Vàng trang sức",
    hint: "Dây chuyền, lắc, bông tai (vàng 18K, 14K...).",
    unitLabel: "đ/chỉ",
    emptyNote:
      "Nguồn webgia.com đang ẩn giá vàng trang sức nên chưa có dữ liệu loại này.",
  },
  fuel: {
    label: "Xăng dầu",
    hint: "Giá bán lẻ Petrolimex (Vùng 1: nội thành; Vùng 2: vùng xa).",
    unitLabel: "đ/lít",
  },
};

export const CATEGORY_ORDER: MarketCategory[] = [
  "gold_ring",
  "gold_bar",
  "jewelry",
  "fuel",
];

export type Side = "sell" | "buy";

export const priceOf = (r: MarketPrice, side: Side = "sell"): number | null =>
  side === "buy" ? r.buy_price : r.sell_price;

export const formatVnd = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : new Intl.NumberFormat("vi-VN").format(Math.round(n));

export const formatSigned = (n: number): string =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatVnd(Math.abs(n))}`;

export const formatPct = (p: number): string =>
  `${p > 0 ? "+" : p < 0 ? "−" : ""}${Math.abs(p).toFixed(2).replace(".", ",")}%`;

export const seriesLabel = (r: Pick<MarketPrice, "product" | "region" | "brand" | "category">): string =>
  r.category === "fuel"
    ? `${r.product} · ${r.region}`
    : `${r.brand} · ${r.product}${r.region ? ` · ${r.region}` : ""}`;

export function groupBySeries(rows: MarketPrice[]): Map<string, MarketPrice[]> {
  const map = new Map<string, MarketPrice[]>();
  for (const r of rows) {
    const arr = map.get(r.series_key);
    if (arr) arr.push(r);
    else map.set(r.series_key, [r]);
  }
  return map;
}

export interface Change {
  diff: number;
  pct: number;
  /** "hôm qua" (vàng) hoặc "kỳ điều chỉnh trước" (xăng dầu) */
  basis: string;
}

/**
 * Biến động của một chuỗi (points tăng dần theo thời gian).
 * - Vàng: so với giá tại thời điểm ≥ 24h trước (hoặc mốc cũ nhất nếu chưa đủ 24h).
 * - Xăng dầu: giá đổi theo kỳ điều hành (~7 ngày) nên so với mức giá khác gần nhất trước đó.
 */
export function computeChange(
  points: MarketPrice[],
  category: MarketCategory,
  side: Side = "sell",
  now: number = Date.now(),
): Change | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const cur = priceOf(last, side);
  if (cur === null) return null;

  let base: number | null = null;
  let basis = "";
  if (category === "fuel") {
    for (let i = points.length - 2; i >= 0; i--) {
      const p = priceOf(points[i], side);
      if (p !== null && p !== cur) {
        base = p;
        break;
      }
    }
    basis = "kỳ điều chỉnh trước";
  } else {
    const cutoff = now - 86400000;
    for (let i = points.length - 2; i >= 0; i--) {
      if (new Date(points[i].created_at).getTime() <= cutoff) {
        base = priceOf(points[i], side);
        break;
      }
    }
    if (base === null) base = priceOf(points[0], side);
    basis = "hôm qua";
  }
  if (base === null || base === cur) return base === cur && base !== null ? { diff: 0, pct: 0, basis } : null;
  return { diff: cur - base, pct: ((cur - base) / base) * 100, basis };
}

export interface Stats {
  min: number;
  max: number;
  avg: number;
  rangePct: number;
  samples: number;
}

/** Thống kê theo thời gian (trọng số theo thời gian giữ giá), trong cửa sổ `days` ngày. */
export function computeStats(
  points: MarketPrice[],
  days: number,
  side: Side = "sell",
  now: number = Date.now(),
): Stats | null {
  const start = now - days * 86400000;
  const seq: Array<{ t: number; v: number }> = [];
  let carry: number | null = null;
  for (const p of points) {
    const v = priceOf(p, side);
    if (v === null) continue;
    const t = new Date(p.created_at).getTime();
    if (t < start) carry = v;
    else seq.push({ t, v });
  }
  if (carry !== null) seq.unshift({ t: start, v: carry });
  if (seq.length === 0) return null;

  let min = Infinity;
  let max = -Infinity;
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < seq.length; i++) {
    const end = i + 1 < seq.length ? seq[i + 1].t : now;
    const dur = Math.max(end - seq[i].t, 1);
    weighted += seq[i].v * dur;
    total += dur;
    min = Math.min(min, seq[i].v);
    max = Math.max(max, seq[i].v);
  }
  const avg = weighted / total;
  return { min, max, avg, rangePct: min > 0 ? ((max - min) / min) * 100 : 0, samples: seq.length };
}

/** Trung bình 7 ngày gần nhất so với 7 ngày liền trước (null nếu chưa đủ dữ liệu). */
export function compareWeeks(
  points: MarketPrice[],
  side: Side = "sell",
  now: number = Date.now(),
): { thisWeek: number; lastWeek: number; diff: number; pct: number } | null {
  if (points.length === 0) return null;
  const firstT = new Date(points[0].created_at).getTime();
  if (now - firstT < 8 * 86400000) return null;
  const week = 7 * 86400000;
  const cur = computeStats(points, 7, side, now);
  const prev = computeStats(points, 14, side, now - week);
  if (!cur || !prev) return null;
  const diff = cur.avg - prev.avg;
  return { thisWeek: cur.avg, lastWeek: prev.avg, diff, pct: (diff / prev.avg) * 100 };
}

export interface ChartPoint {
  t: number;
  sell: number | null;
  buy: number | null;
}

/** Dữ liệu biểu đồ bậc thang; kéo dài giá cuối đến hiện tại. */
export function buildChartData(
  points: MarketPrice[],
  days: number,
  now: number = Date.now(),
): ChartPoint[] {
  const start = now - days * 86400000;
  const out: ChartPoint[] = [];
  let carry: MarketPrice | null = null;
  for (const p of points) {
    const t = new Date(p.created_at).getTime();
    if (t < start) carry = p;
    else out.push({ t, sell: p.sell_price, buy: p.buy_price });
  }
  if (carry) out.unshift({ t: start, sell: carry.sell_price, buy: carry.buy_price });
  if (out.length > 0) {
    const last = out[out.length - 1];
    out.push({ t: now, sell: last.sell, buy: last.buy });
  }
  return out;
}

export interface AlertItem {
  series_key: string;
  category: MarketCategory;
  label: string;
  current: number;
  change: Change;
  stamp: string;
}

export interface AlertThresholds {
  gold: number; // % biến động tối thiểu để cảnh báo (vàng)
  fuel: number; // % (xăng dầu)
}

export const DEFAULT_THRESHOLDS: AlertThresholds = { gold: 1, fuel: 2 };

export function detectAlerts(
  grouped: Map<string, MarketPrice[]>,
  thresholds: AlertThresholds,
  now: number = Date.now(),
): AlertItem[] {
  const items: AlertItem[] = [];
  grouped.forEach((points, key) => {
    if (points.length < 2) return;
    const last = points[points.length - 1];
    const ch = computeChange(points, last.category, "sell", now);
    const cur = last.sell_price;
    if (!ch || cur === null) return;
    const limit = last.category === "fuel" ? thresholds.fuel : thresholds.gold;
    if (Math.abs(ch.pct) < limit) return;
    // Xăng dầu: chỉ cảnh báo khi vừa điều chỉnh trong 3 ngày gần đây
    if (last.category === "fuel" && now - new Date(last.created_at).getTime() > 3 * 86400000) return;
    items.push({
      series_key: key,
      category: last.category,
      label: seriesLabel(last),
      current: cur,
      change: ch,
      stamp: `${key}@${last.created_at}`,
    });
  });
  return items.sort((a, b) => Math.abs(b.change.pct) - Math.abs(a.change.pct));
}

/** Câu tóm tắt dễ hiểu cho người không rành về vàng. */
export function summarize(
  r: MarketPrice,
  change: Change | null,
  unitLabel: string,
): string {
  const name = CATEGORY_META[r.category].label.toLowerCase();
  const cur = formatVnd(r.sell_price);
  if (!change) return `Giá ${name} hiện ở mức ${cur} ${unitLabel}. Chưa đủ dữ liệu để so sánh.`;
  if (change.diff === 0) return `Giá ${name} đứng yên so với ${change.basis}, ở mức ${cur} ${unitLabel}.`;
  const dir = change.diff > 0 ? "tăng" : "giảm";
  return `Giá ${name} ${dir} ${formatVnd(Math.abs(change.diff))} ${unitLabel} (${formatPct(change.pct)}) so với ${change.basis}, hiện ${cur} ${unitLabel}.`;
}
