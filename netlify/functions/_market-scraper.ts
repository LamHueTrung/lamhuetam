import * as cheerio from "cheerio";

export type MarketCategory = "gold_ring" | "gold_bar" | "jewelry" | "fuel";

export interface PriceRow {
  series_key: string;
  category: MarketCategory;
  brand: string;
  product: string;
  region: string;
  buy_price: number | null;
  sell_price: number | null;
  unit: string;
  source_at: string | null;
}

const BASE = "https://webgia.com";
const UA =
  "Mozilla/5.0 (compatible; LamHueTrungPriceBot/1.0; +personal-use; low-frequency)";

/**
 * Chỉ nhận số hiển thị rõ ràng dạng "13.840.000" / "29.050".
 * Ô webgia che giá (thuộc tính nb, chữ "webgia.com"/"xem tại webgia.com") sẽ KHÔNG khớp
 * => bị bỏ qua. Cố ý không giải mã các ô bị che.
 */
export function parseVnPrice(raw: string): number | null {
  const s = raw.replace(/\s+/g, "");
  if (!/^\d{1,3}(\.\d{3})+$/.test(s)) return null;
  const n = Number(s.replace(/\./g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "Cập nhật lúc 14:35:22 30/10/2026" (giờ VN, UTC+7) -> ISO */
export function parseSourceTime(text: string): string | null {
  const m = text.match(/(\d{2}):(\d{2}):(\d{2})\s+(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, hh, mi, ss, dd, mo, yyyy] = m;
  const iso = `${yyyy}-${mo}-${dd}T${hh}:${mi}:${ss}+07:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function slug(s: string): string {
  return norm(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function classifyGold(product: string): "gold_ring" | "gold_bar" | "jewelry" {
  const p = product.toLowerCase();
  if (p.includes("nữ trang") || p.includes("trang sức")) return "jewelry";
  if (p.includes("nhẫn")) return "gold_ring";
  return "gold_bar";
}

function makeKey(
  category: MarketCategory,
  brand: string,
  product: string,
  region: string,
): string {
  return ["webgia", category, slug(brand), slug(product), slug(region)].join("|");
}

async function fetchHtml(path: string): Promise<string> {
  const res = await fetch(BASE + path, {
    headers: { "User-Agent": UA, "Accept-Language": "vi-VN,vi;q=0.9" },
  });
  if (!res.ok) throw new Error(`webgia ${path} -> HTTP ${res.status}`);
  return res.text();
}

/**
 * Trang thương hiệu (vd /gia-vang/sjc/): cột Khu vực | Loại vàng | Mua vào | Bán ra.
 * Ô khu vực dùng rowspan nên phải nhớ vùng của dòng trước.
 */
export function parseBrandGold(html: string, brand: string): PriceRow[] {
  const $ = cheerio.load(html);
  const sourceAt = parseSourceTime($("h1").first().text());
  const rows: PriceRow[] = [];
  const table = $("table.table-radius").first();
  let region = "";

  table.find("tbody tr").each((_, tr) => {
    const th = $(tr).find("th").first();
    if (th.length) region = norm(th.text());
    const tds = $(tr).find("td");
    if (tds.length < 3) return;
    const product = norm($(tds[0]).text());
    const buy = parseVnPrice($(tds[1]).text());
    const sell = parseVnPrice($(tds[2]).text());
    if (!product || buy === null || sell === null) return;
    const category = classifyGold(product);
    rows.push({
      series_key: makeKey(category, brand, product, region),
      category,
      brand,
      product,
      region,
      buy_price: buy,
      sell_price: sell,
      unit: "đồng/chỉ",
      source_at: sourceAt,
    });
  });
  return rows;
}

/**
 * Trang tổng hợp /gia-vang/: Khu vực | Hệ thống | Mua vào | Bán ra (vàng miếng SJC các hệ thống)
 * => dùng để so sánh giữa các thương hiệu.
 */
export function parseCompareGold(html: string): PriceRow[] {
  const $ = cheerio.load(html);
  const sourceAt = parseSourceTime($("h1").first().text());
  const rows: PriceRow[] = [];
  const table = $("table.table-radius").first();
  let region = "";

  table.find("tbody tr").each((_, tr) => {
    const th = $(tr).find("th").first();
    if (th.length) region = norm(th.text());
    const tds = $(tr).find("td");
    if (tds.length < 3) return;
    const brand = norm($(tds[0]).text());
    const buy = parseVnPrice($(tds[1]).text());
    const sell = parseVnPrice($(tds[2]).text());
    if (!brand || buy === null || sell === null) return;
    const product = "Vàng miếng SJC (so sánh hệ thống)";
    rows.push({
      series_key: makeKey("gold_bar", brand, product, region),
      category: "gold_bar",
      brand,
      product,
      region,
      buy_price: buy,
      sell_price: sell,
      unit: "đồng/chỉ",
      source_at: sourceAt,
    });
  });
  return rows;
}

/** Petrolimex: Sản phẩm | Vùng 1 | Vùng 2 (đồng/lít) */
export function parseFuel(html: string): PriceRow[] {
  const $ = cheerio.load(html);
  const rows: PriceRow[] = [];
  const table = $("table.table-radius").first();
  const regions = ["Vùng 1", "Vùng 2"];

  table.find("tbody tr").each((_, tr) => {
    const th = $(tr).find("th").first();
    const tds = $(tr).find("td");
    if (!th.length || tds.length < 2) return;
    const product = norm(th.text());
    regions.forEach((region, i) => {
      const price = parseVnPrice($(tds[i]).text());
      if (!product || price === null) return;
      rows.push({
        series_key: makeKey("fuel", "Petrolimex", product, region),
        category: "fuel",
        brand: "Petrolimex",
        product,
        region,
        buy_price: null,
        sell_price: price,
        unit: "đồng/lít",
        source_at: null,
      });
    });
  });
  return rows;
}

export interface ScrapeResult {
  rows: PriceRow[];
  errors: string[];
}

/** Cào tuần tự, thưa; 1 trang lỗi không làm hỏng các trang còn lại. */
export async function scrapeAll(): Promise<ScrapeResult> {
  const rows: PriceRow[] = [];
  const errors: string[] = [];
  const jobs: Array<[string, (h: string) => PriceRow[]]> = [
    ["/gia-vang/sjc/", (h) => parseBrandGold(h, "SJC")],
    ["/gia-vang/", parseCompareGold],
    ["/gia-xang-dau/petrolimex/", parseFuel],
  ];
  for (const [path, parse] of jobs) {
    try {
      const parsed = parse(await fetchHtml(path));
      if (parsed.length === 0) errors.push(`${path}: không đọc được dòng nào (có thể đổi giao diện)`);
      rows.push(...parsed);
    } catch (e: any) {
      errors.push(`${path}: ${e?.message || e}`);
    }
  }
  return { rows, errors };
}
