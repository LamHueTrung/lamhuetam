import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { scrapeAll, type PriceRow } from "./_market-scraper";

/**
 * Netlify Scheduled Function — cào giá vàng/xăng từ webgia.com mỗi 30 phút (07h–22h giờ VN).
 * Chỉ INSERT khi giá khác bản ghi mới nhất của chuỗi => DB không phình.
 * Env: SUPABASE_URL (hoặc VITE_SUPABASE_URL), VITE_SUPABASE_ANON_KEY
 */
export const config: Config = {
  schedule: "*/30 0-15 * * *",
};

export default async (): Promise<Response> => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      "[scrape-prices] Thiếu SUPABASE_URL / VITE_SUPABASE_ANON_KEY",
    );
    return new Response("missing env", { status: 500 });
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { rows, errors } = await scrapeAll();
  errors.forEach((e) => console.error("[scrape-prices]", e));
  if (rows.length === 0) {
    // Giữ nguyên dữ liệu cũ khi nguồn lỗi
    return new Response(JSON.stringify({ inserted: 0, errors }), {
      status: 200,
    });
  }

  const { data: latest, error: latestErr } = await supabase
    .from("market_prices_latest")
    .select("series_key, buy_price, sell_price");
  if (latestErr) {
    console.error("[scrape-prices] đọc latest lỗi:", latestErr.message);
    return new Response(latestErr.message, { status: 500 });
  }

  const prev = new Map<string, { buy: number | null; sell: number | null }>();
  (latest || []).forEach((r: any) =>
    prev.set(r.series_key, {
      buy: r.buy_price === null ? null : Number(r.buy_price),
      sell: r.sell_price === null ? null : Number(r.sell_price),
    }),
  );

  const changed: PriceRow[] = rows.filter((r) => {
    const p = prev.get(r.series_key);
    return !p || p.buy !== r.buy_price || p.sell !== r.sell_price;
  });

  if (changed.length > 0) {
    const { error } = await supabase.from("market_prices").insert(changed);
    if (error) {
      console.error("[scrape-prices] insert lỗi:", error.message);
      return new Response(error.message, { status: 500 });
    }
  }

  console.log(`[scrape-prices] đọc ${rows.length}, ghi mới ${changed.length}`);
  return new Response(
    JSON.stringify({ scraped: rows.length, inserted: changed.length, errors }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};
