import { supabase } from "../lib/supabase";

export type MarketCategory = "gold_ring" | "gold_bar" | "jewelry" | "fuel";

export interface MarketPrice {
  series_key: string;
  category: MarketCategory;
  brand: string;
  product: string;
  region: string;
  buy_price: number | null;
  sell_price: number | null;
  unit: string;
  created_at: string;
}

const COLS =
  "series_key, category, brand, product, region, buy_price, sell_price, unit, created_at";
const PAGE = 1000; // giới hạn mặc định của PostgREST

const toNum = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

const mapRow = (r: any): MarketPrice => ({
  ...r,
  buy_price: toNum(r.buy_price),
  sell_price: toNum(r.sell_price),
});

/** Giá mới nhất của mọi chuỗi (view market_prices_latest). */
export async function fetchLatestPrices(): Promise<MarketPrice[]> {
  const { data, error } = await supabase
    .from("market_prices_latest")
    .select(COLS);
  if (error) throw new Error(error.message);
  return (data || []).map(mapRow);
}

/** Lịch sử thay đổi giá từ `days` ngày trước (tăng dần theo thời gian), phân trang an toàn. */
export async function fetchPriceHistory(days: number): Promise<MarketPrice[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const out: MarketPrice[] = [];
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await supabase
      .from("market_prices")
      .select(COLS)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data || []).map(mapRow);
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}
