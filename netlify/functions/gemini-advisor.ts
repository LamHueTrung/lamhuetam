import { Handler } from "@netlify/functions";
import {
  connectDB,
  AIConfig,
  ChatMessage,
  PersonalDNA,
  AIKnowledge,
  SalaryConfig,
} from "./_db";
import fetch from "node-fetch";
import { getRecentMessages, summarizeSession } from "./chat-history";

const DEFAULT_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_MODEL = "gemini-2.0-flash";

// ─── FORMATTERS ─────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "tr";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return String(Math.round(n));
}

// ─── INTENT DETECTION & TOKEN BUDGET ────────────────────────────────────────
type Intent = "calculate" | "query" | "advice" | "plan" | "motivation";

const TOKEN_BUDGET: Record<Intent, number> = {
  calculate: 1600,
  query: 2000,
  advice: 2500,
  plan: 3000,
  motivation: 2000,
};

function detectIntent(msg: string): Intent {
  const m = (msg || "").toLowerCase();
  if (/\btính\b|bao nhiêu|còn lại|dư bao|tổng cộng|tổng là/.test(m))
    return "calculate";
  if (
    /kế hoạch|lộ trình|tháng tới|năm tới|tương lai|từng bước|bao giờ xong/.test(m)
  )
    return "plan";
  if (/nên|có nên|có thể|cách nào|hướng nào|giải quyết|quyết định/.test(m))
    return "advice";
  if (/mệt|chán|lo|sợ|áp lực|stress|buồn|khó khăn|không biết phải/.test(m))
    return "motivation";
  return "query";
}

// ─── TIERED CONTEXT SELECTION ────────────────────────────────────────────────
type Tier = "t1" | "t2" | "t3" | "t4" | "t5" | "t6" | "t7";

function detectNeededTiers(
  msg: string,
  intent: Intent,
  hasMLContext: boolean,
): Set<Tier> {
  const m = (msg || "").toLowerCase();
  const tiers = new Set<Tier>(["t1"]);
  if (/nợ|kỳ|trả|credit|trả góp|vay|lãi/.test(m) || intent === "plan")
    tiers.add("t2");
  if (/cố định|fixed|hóa đơn|điện|nước|internet|thuê/.test(m)) tiers.add("t3");
  if (/lịch sử|giao dịch|chi tiêu|mua gì|ăn uống|top|danh mục/.test(m))
    tiers.add("t4");
  if (/lãi suất|tiết kiệm|đầu tư|quy tắc|chiến lược|kiến thức/.test(m))
    tiers.add("t5");
  if (
    intent === "motivation" ||
    intent === "plan" ||
    /hành vi|thói quen|hay bị|thường xuyên/.test(m)
  )
    tiers.add("t6");

  // Luôn nạp số liệu ML nếu có dữ liệu
  if (hasMLContext) tiers.add("t7");
  return tiers;
}

// ─── COMPACT SECTION BUILDERS ───────────────────────────────────────────────
function buildT1(p: {
  now: Date;
  todayStr: string;
  monthIncome: number;
  monthExpense: number;
  pendingDebt: number;
  accBal: number;
  salaryConfig: any;
  isSalaryReceivedThisMonth: boolean;
}): string {
  const salaryDay = p.salaryConfig?.receiveDay || 4;
  const netSalary = p.salaryConfig?.netSalary || 0;
  const todayDay = p.now.getDate();

  // Đếm ngược ngày lương tiếp theo
  let daysToNextSalary = 0;
  if (todayDay < salaryDay) {
    daysToNextSalary = salaryDay - todayDay;
  } else {
    const daysInThisMonth = new Date(
      p.now.getFullYear(),
      p.now.getMonth() + 1,
      0,
    ).getDate();
    daysToNextSalary = daysInThisMonth - todayDay + salaryDay;
  }

  const salaryStatus = p.isSalaryReceivedThisMonth
    ? `✅Đã-nhận-lương-T${p.now.getMonth() + 1}(+${fmt(netSalary)})`
    : `⏳Chờ-lương(ngày-${salaryDay},còn-${daysToNextSalary}-ngày)`;

  const available = p.accBal - p.pendingDebt;
  return (
    `[CORE|${p.todayStr}]\n` +
    `lương_net:${fmt(netSalary)}/tháng(ngày${salaryDay})|tình_trạng_lương:${salaryStatus}|kỳ_lương_kế_tiếp:còn-${daysToNextSalary}-ngày\n` +
    `tổng_thu_tháng:${fmt(p.monthIncome)}|tổng_chi_tháng:${fmt(p.monthExpense)}|nợ_pending_tháng:${fmt(p.pendingDebt)}\n` +
    `số_dư_tích_lũy:${fmt(p.accBal)}|khả_dụng_thực_tế:${fmt(available)}`
  );
}

function buildT2(activeDebts: any[], thisMonth: string, nowMonth: number): string {
  if (!activeDebts.length) return "[NỢ]none";
  const lines = activeDebts.map((d: any) => {
    const inst = (d.installments || []).find((i: any) => i.dueDate?.startsWith(thisMonth));
    const st = !inst ? "no-inst"
      : inst.status === "paid" ? "✅paid"
      : inst.status === "partial" ? `⚠️partial(${fmt(inst.paidAmount || 0)}/${fmt(inst.amount)})`
      : `❌pending/${fmt(inst.amount)}`;
    const remaining = (d.installments || []).filter((i: any) => i.status !== "paid");
    const next = remaining.find((i: any) => i.status === "pending");
    const typeL = d.type === "credit_card" ? "CC" : d.type === "installment" ? "TG" : "VAY";
    return `[${typeL}]${d.name}|dư:${fmt(d.currentBalance || 0)}` +
      `|kỳ:${d.paidInstallments || 0}/${d.totalInstallments || 0}` +
      `|còn:${remaining.length}kỳ|T${nowMonth}:${st}` +
      `|tiếp:${next?.dueDate?.slice(5) || "N/A"}(${fmt(next?.amount || 0)})` +
      `|lãi:${d.interestRate || 0}%/năm`;
  });
  return "[NỢ]\n" + lines.join("\n");
}

function buildT3(fixedCats: any[], fixedTasks: any[], totalFixed: number): string {
  if (!fixedCats?.length) return "[CỐ-ĐỊNH]none";
  const lines = (fixedCats || []).map((cat: any) => {
    const tasks = (fixedTasks || []).filter((t: any) => t.categoryId === cat.id);
    const total = tasks.reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const items = tasks.map((t: any) => `${t.name}:${fmt(t.amount)}`).join(",");
    return `${cat.name}(${fmt(total)})[${items || "empty"}]`;
  });
  return `[CỐ-ĐỊNH|tổng:${fmt(totalFixed || 0)}]\n${lines.join("\n")}`;
}

function buildT4(recentTx: any[], thisMonth: string): string {
  const thisTx = recentTx.filter((t: any) => t.date?.startsWith(thisMonth));
  if (!thisTx.length) return "[TX]none-this-month";
  const catSpend: Record<string, number> = {};
  thisTx.filter((t: any) => t.type === "expense").forEach((t: any) => {
    catSpend[t.category] = (catSpend[t.category] || 0) + Number(t.amount);
  });
  const top3 = Object.entries(catSpend).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, v]) => `${k}:${fmt(v)}`);
  const recent10 = thisTx.slice(-10).map((t: any) =>
    `${t.date}|${t.type === "income" ? "+" : "-"}${fmt(Number(t.amount))}|${t.category}` +
    `${t.description ? "|" + String(t.description).slice(0, 25) : ""}`
  );
  return `[TX|top3:${top3.join(",")}]\n${recent10.join("\n")}`;
}

function buildT5(knowledge: any[]): string {
  if (!knowledge?.length) return "";
  const lines = knowledge.slice(0, 3).map((k: any) =>
    `[${(k.type || "TIP").toUpperCase()}]${k.title}: ${String(k.content).slice(0, 120)}`
  );
  return "[KNOWLEDGE]\n" + lines.join("\n");
}

function buildT6(dna: any): string {
  if (!dna) return "";
  const parts: string[] = [];
  const insights = (dna.behavioralInsights || [])
    .filter((i: any) => (i.confidence || 0) >= 0.5)
    .slice(0, 3)
    .map((i: any) => `- ${i.insight}(conf:${Number(i.confidence).toFixed(1)})`);
  if (insights.length) parts.push("[HÀNH-VI]\n" + insights.join("\n"));
  const constraints = (dna.hardConstraints || [])
    .map((c: any) => `${c.name}:≥${fmt(c.minAmount || 0)}`);
  if (constraints.length) parts.push("[KHÔNG-CẮT:" + constraints.join("|") + "]");
  return parts.join("\n");
}

function buildT7(mlContext?: any): string {
  if (!mlContext) return "";
  const parts: string[] = [];
  if (mlContext.runway_analysis) {
    const rw = mlContext.runway_analysis;
    parts.push(`runway:${rw.financial_runway_days}ngày|burn_rate:${fmt(rw.daily_burn_rate)}/ngày|is_safe:${rw.is_financially_safe ? "YES" : "NO"}`);
    if (rw.first_deficit_date) parts.push(`first_deficit:${rw.first_deficit_date}`);
  }
  if (mlContext.anomalies_count !== undefined) {
    parts.push(`anomalies_detected:${mlContext.anomalies_count}`);
  }
  return parts.length ? `[ML-INSIGHTS]\n${parts.join("\n")}` : "";
}

// ─── HISTORY COMPRESSION ────────────────────────────────────────────────────
function compressHistory(history: any[]): { role: string; content: string }[] {
  return (history || []).slice(-6).map((m: any) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: String(m.content || "").trim(),
  }));
}

// ─── INSIGHT EXTRACTOR ──────────────────────────────────────────────────────
function extractInsight(text: string): string | null {
  const match = text.match(/\[INSIGHT:\s*(.+?)\]/i);
  return match ? match[1].trim() : null;
}

// ─── ADAPTIVE SYSTEM PROMPT BUILDER ────────────────────────────────────────
function buildAdaptiveSystemPrompt(
  contextSections: string,
  dnaSection: string,
  knowledgeSection: string,
  sessionSummary: string,
): string {
  const memorySec = sessionSummary
    ? `\n[BỘ NHỚ SESSION TRƯỚC]\n${String(sessionSummary).slice(0, 500)}`
    : "";
  return `Bạn là "Lâm Huệ Trung 10 năm sau" — người anh chí cốt từng trải, hiểu rõ Trung hơn Trung biết bản thân.
Xưng "tao"/"mày". Thân tình, thực tế, công tâm, bám sát số liệu, câu cú trọn vẹn, không sáo rỗng.${memorySec}

## DỮ LIỆU TÀI CHÍNH THỰC TẾ CỦA TRUNG (DÙNG ĐỂ THAM KHẢO, KHÔNG ĐƯỢC SAO CHÉP MÃ RA CÂU TRẢ LỜI):
${contextSections}${knowledgeSection ? "\n\n" + knowledgeSection : ""}${dnaSection ? "\n\n" + dnaSection : ""}

## NGUYÊN TẮC ĐÁNH GIÁ & CỐ VẤN TÀI CHÍNH (BẮT BUỘC TUÂN THỦ):
1. CÔNG TÂM & TÔN TRỌNG THỰC TẾ:
   - Nếu số dư khả dụng thực tế đang dương lớn (trên 5 triệu đến hàng chục triệu), có thu nhập freelance phụ đều đặn, lương đã nhận hoặc sắp về: BẮT BUỘC phải đánh giá là tài chính đang TỐT, AN TOÀN và KHEN NGỢI phong độ của Trung. Tuyệt đối KHÔNG được chém gió "lo lắng", "bất ổn" hay chỉ trích vô căn cứ khi tiền vẫn đang dư dả.
   - Ghi nhận và tuyên dương tinh thần cày cuốc kiếm thêm freelance của Trung khi thấy các khoản thu nhập phụ.
2. CHỈ CẢNH BÁO KHI CÓ RỦI RO THẬT SỰ:
   - Chỉ nhắc nhở khi có khoản nợ sắp đến hạn trong 3-7 ngày tới chưa thanh toán hoặc khi số dư khả dụng thực sự bị âm/thâm hụt.
   - Khi đưa ra cảnh báo, phải kèm theo giải pháp thực tế, nhẹ nhàng mang tính xây dựng, không chửi đổng.
3. NGÔN NGỮ & DIỄN ĐẠT HOÀN CHỈNH:
   - Luôn trả lời bằng tiếng Việt tự nhiên, mạch lạc, câu cú hoàn chỉnh trọn vẹn từ đầu đến cuối. Kết thúc bằng dấu câu đàng hoàng, tuyệt đối KHÔNG được bỏ lửng câu giữa chừng.
   - Tuyệt đối KHÔNG xuất các mã kỹ thuật như [CORE], [TG], [CỐ-ĐỊNH], [TX], [ML-INSIGHTS] ra câu trả lời.
4. ĐỊNH DẠNG: Trình bày Markdown rõ ràng, in đậm số tiền (ví dụ **17.117.000 đ**).
5. SỐNG > TỒN TẠI: Mọi kế hoạch phải đủ tiền sống tối thiểu thực tế, không đề xuất cắt đến mức không thể sinh hoạt.
6. GHI NHẬN HÀNH VI: Nếu thực sự phát hiện quy luật thói quen tài chính mới đáng lưu ý từ Trung, ở dòng cuối cùng của câu trả lời xuống dòng và thêm duy nhất cú pháp: [INSIGHT: mô tả ngắn gọn]`;
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────────────
export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS")
    return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST")
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };

  try {
    await connectDB();
    const config = await AIConfig.findOne().lean();
    const apiKey = config?.apiKey || process.env.GEMINI_API_KEY || "";
    const model = config?.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const baseUrl =
      config?.baseUrl || process.env.GEMINI_API_BASE_URL || DEFAULT_BASE_URL;

    if (!apiKey)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Missing API Key",
          message:
            "Thiếu API Key. Hãy cấu hình trong trang Hồ sơ hoặc biến môi trường Netlify.",
        }),
      };

    const {
      transactions,
      budgets,
      debts,
      savings,
      promptType,
      customMessage,
      userProfile,
      salaryConfig,
      fixedCats,
      fixedTasks,
      totalFixed,
      conversationHistory = [],
      sessionSummary = "",
      mlContext,
    } = JSON.parse(event.body || "{}");

    // ── Time context ──
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const thisMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .slice(0, 7);
    const todayStr = now.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const sessionDate = now.toISOString().slice(0, 10);

    // ── Data preparation ──
    const recentTx = (transactions || [])
      .filter((t: any) => {
        const m = t.date?.slice(0, 7);
        return m === thisMonth || m === lastMonth;
      })
      .slice(-30);

    const activeDebts = (debts || []).filter((d: any) => d.status === "active");

    const monthIncome = recentTx
      .filter((t: any) => t.type === "income" && t.date?.startsWith(thisMonth))
      .reduce((s: number, t: any) => s + Number(t.amount), 0);
    const monthExpense = recentTx
      .filter((t: any) => t.type === "expense" && t.date?.startsWith(thisMonth))
      .reduce((s: number, t: any) => s + Number(t.amount), 0);

    // FIX: Chỉ tính kỳ PENDING trong tháng này
    const pendingDebt = activeDebts.reduce((sum: number, d: any) => {
      const inst = (d.installments || []).find(
        (i: any) => i.dueDate?.startsWith(thisMonth) && i.status === "pending",
      );
      return sum + (inst?.amount || 0);
    }, 0);

    const totalIncomeAll = (transactions || [])
      .filter((t: any) => t.type === "income")
      .reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalExpenseAll = (transactions || [])
      .filter((t: any) => t.type === "expense")
      .reduce((s: number, t: any) => s + Number(t.amount), 0);
    const accBal = totalIncomeAll - totalExpenseAll;

    // ── KIỂM TRA LƯƠNG CHUẨN XÁC TỪ DATABASE ──
    let salaryDoc: any = null;
    try {
      salaryDoc = await SalaryConfig.findOne().lean();
    } catch (_) {}
    const configToUse = salaryDoc || salaryConfig || {};
    const isSalaryReceivedThisMonth =
      configToUse?.lastAutoAddMonth === thisMonth ||
      recentTx.some(
        (t: any) =>
          t.type === "income" &&
          t.date?.startsWith(thisMonth) &&
          (/lương|salary/i.test(t.category || "") ||
            /lương|salary/i.test(t.description || "")),
      );

    // ── Lightweight handlers ──
    if (promptType === "suggest-category") {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "Chỉ trả về tên danh mục tài chính phù hợp nhất, không thêm gì khác.",
            },
            {
              role: "user",
              content: `Giao dịch: "${customMessage}"\nChọn 1 trong: Ăn uống|Di chuyển|Mua sắm|Hóa đơn|Giải trí|Sức khỏe|Giáo dục|Trả nợ|Tiết kiệm|Khác`,
            },
          ],
          temperature: 0.0,
          max_tokens: 20,
        }),
      });
      const d: any = await res.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          text: d.choices?.[0]?.message?.content?.trim() || "Khác",
        }),
      };
    }

    if (promptType === "alerts") {
      const budgetAlerts = (budgets || []).filter(
        (b: any) => b.limit > 0 && b.spent / b.limit >= 0.8,
      );
      const debtAlerts = activeDebts.filter((d: any) =>
        d.installments?.some((i: any) => {
          if (i.status !== "pending") return false;
          const diff =
            (new Date(i.dueDate + "T00:00:00").getTime() - now.getTime()) /
            86400000;
          return diff >= 0 && diff <= 7;
        }),
      );
      if (!budgetAlerts.length && !debtAlerts.length)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ text: "OK" }),
        };
      const alertLines = [
        ...budgetAlerts.map(
          (b: any) =>
            `⚠️ ${b.category}: ${fmt(b.spent)}/${fmt(b.limit)} (${Math.round((b.spent / b.limit) * 100)}%)`,
        ),
        ...debtAlerts.map(
          (d: any) => `⚠️ ${d.name}: có kỳ nợ đến hạn trong 7 ngày`,
        ),
      ];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ text: alertLines.join("\n") }),
      };
    }

    // ── Resolve user message ──
    const userMsg =
      customMessage ||
      (promptType === "debt"
        ? "phân tích các khoản nợ hiện tại và đề xuất lộ trình trả nợ tối ưu"
        : promptType === "balance"
          ? "phân tích chi tiêu và dòng tiền tháng này, chỉ ra điểm có thể tối ưu"
          : promptType === "savings"
            ? "dự báo dòng tiền và gợi ý kế hoạch tài chính thực tế"
            : promptType === "insights"
              ? "đánh giá ngắn gọn sức khỏe tài chính tháng này"
              : "xin chào");

    // ── Intent & tier detection ──
    const intent = detectIntent(userMsg);
    const hasML = !!(mlContext?.runway_analysis || mlContext?.anomalies_count !== undefined);
    const neededTiers = detectNeededTiers(userMsg, intent, hasML);
    const maxTokens = TOKEN_BUDGET[intent];

    // ── Build tiered context ──
    const sections: string[] = [];
    if (neededTiers.has("t1"))
      sections.push(
        buildT1({
          now,
          todayStr,
          monthIncome,
          monthExpense,
          pendingDebt,
          accBal,
          salaryConfig: configToUse,
          isSalaryReceivedThisMonth,
        }),
      );
    if (neededTiers.has("t2"))
      sections.push(buildT2(activeDebts, thisMonth, now.getMonth() + 1));
    if (neededTiers.has("t3"))
      sections.push(buildT3(fixedCats, fixedTasks, totalFixed));
    if (neededTiers.has("t4")) sections.push(buildT4(recentTx, thisMonth));
    if (neededTiers.has("t7") && mlContext) sections.push(buildT7(mlContext));

    let knowledgeSection = "";
    if (neededTiers.has("t5")) {
      try {
        const knowledge = await AIKnowledge.find({ isActive: true }).sort({ relevanceScore: -1 }).limit(3).lean();
        knowledgeSection = buildT5(knowledge);
      } catch (_) { /* non-critical */ }
    }

    let dnaSection = "";
    if (neededTiers.has("t6")) {
      try {
        const dna = await PersonalDNA.findOne().lean();
        dnaSection = buildT6(dna);
      } catch (_) { /* non-critical */ }
    }

    const systemPrompt = buildAdaptiveSystemPrompt(
      sections.join("\n\n"),
      dnaSection,
      knowledgeSection,
      sessionSummary
    );


    const compressedHist = compressHistory(conversationHistory);

    // ── LLM call ──
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    const llmRes = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...compressedHist,
          { role: "user", content: userMsg },
        ],
        temperature: 0.35,
        max_tokens: maxTokens,
      }),
      signal: controller.signal as any,
    }).finally(() => clearTimeout(timeoutId));

    const data: any = await llmRes.json();
    if (!llmRes.ok) throw new Error(data.error?.message || data.error || `Lỗi HTTP ${llmRes.status}`);

    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) throw new Error("AI không trả về phản hồi.");

    // ── Post-process: Lưu messages vào DB ──
    try {
      await ChatMessage.insertMany([
        { role: "user", content: userMsg, sessionDate },
        { role: "assistant", content: rawText, sessionDate },
      ]);
    } catch (_) { /* non-critical */ }

    // ── Post-process: Extract & save behavioral insight ──
    const insight = extractInsight(rawText);
    if (insight) {
      try {
        const existing = await PersonalDNA.findOne({
          "behavioralInsights.insight": { $regex: insight.slice(0, 20), $options: "i" },
        });
        if (existing) {
          await PersonalDNA.updateOne(
            { "behavioralInsights.insight": { $regex: insight.slice(0, 20), $options: "i" } },
            {
              $inc: { "behavioralInsights.$.evidenceCount": 1, "behavioralInsights.$.confidence": 0.15 },
              $set: { "behavioralInsights.$.lastUpdated": new Date() },
            }
          );
        } else {
          await PersonalDNA.updateOne(
            {},
            { $push: { behavioralInsights: { insight, confidence: 0.3, evidenceCount: 1, lastUpdated: new Date(), source: "conversation" } } },
            { upsert: true }
          );
        }
      } catch (_) { /* non-critical */ }
    }

    // Summarize session for future context
    let summary = "";
    try {
      const recentMsgs = await getRecentMessages({ sessionDate, limit: 30 });
      summary = await summarizeSession({
        sessionDate,
        messages: recentMsgs,
        apiKey,
        baseUrl,
        model,
      });
    } catch (_) { /* non-critical */ }

    const cleanText = rawText.replace(/\[INSIGHT:.*?\]/gi, "").trim();
    return { statusCode: 200, headers, body: JSON.stringify({ text: cleanText, summary }) };
  } catch (error: any) {
    console.error("gemini-advisor error:", error);
    let message = error.message || "";
    if (error.name === "AbortError") message = "Kết nối API phản hồi chậm (Timeout 5p). Vui lòng thử lại.";
    else if (/API_KEY|401|Unauthorized/.test(message)) message = "API Key không hợp lệ hoặc đã hết hạn.";
    else if (/quota|rate|429/.test(message)) message = "Hệ thống đang quá tải lượt gọi. Vui lòng thử lại sau.";
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Lỗi kết nối AI", message }) };
  }
};
