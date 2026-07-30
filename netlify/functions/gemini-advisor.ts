import { Handler } from "@netlify/functions";
import { connectDB, AIConfig } from "./_db";
import fetch from "node-fetch";

// Giữ nguyên FreeLLMAPI proxy của bạn
const DEFAULT_BASE_URL = "https://trungsaas-beta.onrender.com/v1";
const DEFAULT_MODEL = "gemini-2.0-flash"; // Model Gemini Flash chuẩn, tốc độ cực nhanh

function formatVND(num: number) {
  if (num >= 1000000) return Math.round(num / 1000000) + "tr";
  if (num >= 1000) return Math.round(num / 1000) + "k";
  return num.toString();
}

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

    if (!apiKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Missing API Key",
          message:
            "Thiếu API Key. Hãy cấu hình trong trang Hồ sơ hoặc biến môi trường Netlify.",
        }),
      };
    }

    const { transactions, budgets, debts, savings, promptType, customMessage } =
      JSON.parse(event.body || "{}");

    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .slice(0, 7);

    // Lọc giao dịch tháng này + tháng trước (tối đa 30 giao dịch gần nhất)
    const recentTx = (transactions || [])
      .filter((t: any) => {
        const m = t.date?.slice(0, 7);
        return m === thisMonth || m === lastMonth;
      })
      .slice(-30);

    const activeDebts = (debts || []).filter((d: any) => d.status === "active");
    const totalDebt = activeDebts.reduce(
      (sum: number, d: any) => sum + (d.currentBalance || 0),
      0,
    );
    const totalMonthlyDebtPayment = activeDebts.reduce(
      (sum: number, d: any) => sum + (d.monthlyPayment || 0),
      0,
    );

    const monthIncome = recentTx
      .filter((t: any) => t.type === "income" && t.date?.startsWith(thisMonth))
      .reduce((s: number, t: any) => s + Number(t.amount), 0);
    const monthExpense = recentTx
      .filter((t: any) => t.type === "expense" && t.date?.startsWith(thisMonth))
      .reduce((s: number, t: any) => s + Number(t.amount), 0);

    // Thống kê Top 3 danh mục chi tiêu nhiều nhất
    const categorySpend: Record<string, number> = {};
    recentTx
      .filter((t: any) => t.type === "expense" && t.date?.startsWith(thisMonth))
      .forEach((t: any) => {
        categorySpend[t.category] =
          (categorySpend[t.category] || 0) + Number(t.amount);
      });
    const topCategory = Object.entries(categorySpend)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt]) => `${cat}: ${formatVND(amt)}`);

    // Dòng tiền khả dụng còn lại sau khi trừ chi tiêu & trả nợ bắt buộc
    const freeCashflow = monthIncome - monthExpense - totalMonthlyDebtPayment;

    // Tóm tắt dữ liệu cô đọng
    const dataSummary = `[DÒNG TIỀN THÁNG ${now.getMonth() + 1}] Thu nhập: ${formatVND(monthIncome)} | Chi tiêu: ${formatVND(monthExpense)} | Trả nợ gốc/lãi: ${formatVND(totalMonthlyDebtPayment)}/tháng | Dòng tiền tự do còn lại: ${formatVND(freeCashflow)} | Tổng nợ còn lại: ${formatVND(totalDebt)}`;

    const budgetSummary = (budgets || [])
      .filter((b: any) => b.limit > 0)
      .map(
        (b: any) =>
          `${b.category}: ${formatVND(b.spent)}/${formatVND(b.limit)}`,
      )
      .join(", ");

    // ── MASTER SYSTEM PROMPT (SKILL CHUYÊN GIA TÀI CHÍNH) ──
    const MASTER_SYSTEM_PROMPT = `Bạn là Cố vấn Tài chính Cá nhân AI cấp cao. Nhiệm vụ của bạn là đưa ra tư vấn quản lý tiền bạc ngắn gọn, sắc bén và thực tế.

QUY TẮC BẮT BUỘC (CRITICAL RULES):
1. ĐỊNH DẠNG SỐ: Luôn dùng đơn vị tiền tệ viết tắt Việt Nam (ví dụ: 500k, 2.5tr, 10tr).
2. TRẢ LỜI ĐI THẲNG VÀO VẤN ĐỀ: Không chào hỏi xã giao, không mở đầu rườm rà, không kết luận chung chung.
3. CÂU HỎI YES/NO: Luôn bắt đầu ngay bằng "Có." hoặc "Không." ở đầu câu nếu câu hỏi dạng nghi vấn.
4. TRÌNH BÀY SẮC NÉT: Dùng gạch đầu dòng (-), in đậm con số và từ khóa quan trọng.
5. HÀNH ĐỘNG CỤ THỂ: Kết thúc câu trả lời bằng 1 hành động thực thi được ngay.`;

    let userPrompt = "";
    let maxTokens = 1000;
    let temperature = 0.3; // Độ sáng tạo vừa phải, đảm bảo tính chính xác cho tài chính

    // ── CẤU HÌNH KỸ NĂNG (SKILLS & THRESHOLDS PER PROMPT TYPE) ──
    if (promptType === "suggest-category") {
      // Skill: Gợi ý danh mục chuẩn xác tuyệt đối
      userPrompt = `Giao dịch: "${customMessage}"\n\nDựa vào mô tả trên, hãy chọn 1 danh mục tài chính phù hợp nhất.\nCHỈ TRẢ VỀ DUY NHẤT TÊN DANH MỤC (Ví dụ: Ăn uống, Di chuyển, Mua sắm, Hóa đơn,...). Không thêm bất kỳ từ nào khác, không dấu chấm câu.`;
      maxTokens = 100;
      temperature = 0.0; // Nhiệt độ 0.0 để kết quả tuyệt đối chính xác
    } else if (promptType === "alerts") {
      // Skill: Cảnh báo vỡ ngân sách & nợ đến hạn
      const budgetAlerts = (budgets || []).filter(
        (b: any) => b.limit > 0 && b.spent / b.limit >= 0.8,
      );
      const upcomingDebts = activeDebts.filter((d: any) =>
        d.installments?.some((i: any) => {
          if (i.status !== "pending") return false;
          const due = new Date(i.dueDate + "T00:00:00");
          const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return diff >= 0 && diff <= 7;
        }),
      );

      if (budgetAlerts.length === 0 && upcomingDebts.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ text: "OK" }),
        };
      }

      userPrompt = `Ngân sách cảnh báo (>80%): ${JSON.stringify(budgetAlerts.map((b: any) => `${b.category}: ${formatVND(b.spent)}/${formatVND(b.limit)}`))}\nNợ sắp đến hạn trong 7 ngày: ${JSON.stringify(upcomingDebts.map((d: any) => d.name))}\n\nĐưa ra các cảnh báo ngắn gọn, mỗi dòng bắt đầu bằng icon ⚠️.`;
      maxTokens = 600;
      temperature = 0.1;
    } else if (promptType === "insights") {
      // Skill: Đánh giá sức khỏe tài chính tháng
      userPrompt = `${dataSummary}\nTop chi tiêu: ${topCategory.join(", ")}\nNgân sách: ${budgetSummary}\n\nĐưa ra 3 nhận xét ngắn gọn về sức khỏe tài chính tháng này. Mỗi nhận xét 1 dòng có số liệu.`;
      maxTokens = 1000;
      temperature = 0.3;
    } else if (promptType === "debt") {
      // Skill: Tối ưu công nợ theo chiến lược Debt Avalanche (Trả nợ lãi cao trước)
      userPrompt = `Danh sách nợ hiện tại: ${JSON.stringify(
        activeDebts.map((d: any) => ({
          Tên: d.name,
          Loại:
            d.type === "credit_card"
              ? "Thẻ TD"
              : d.type === "installment"
                ? "Trả góp"
                : "Vay ngoài",
          Dư_nợ: formatVND(d.currentBalance),
          Trả_hàng_tháng: formatVND(d.monthlyPayment),
          Lãi_suất: d.interestRate + "%/năm",
        })),
      )}\n${dataSummary}\n\nYêu cầu phân tích:\n1. Chỉ ra khoản nợ nguy hiểm nhất (dựa trên lãi suất và áp lực dòng tiền).\n2. Gợi ý thứ tự trả nợ tối ưu (Ưu tiên nợ lãi cao).\n3. 1 Hành động dứt điểm nợ ngay tháng này.`;
      maxTokens = 1500;
      temperature = 0.2;
    } else if (promptType === "balance") {
      // Skill: Tối ưu dòng tiền & Cân bằng chi tiêu
      userPrompt = `${dataSummary}\nTop chi tiêu lớn nhất: ${topCategory.join(", ")}\nTrạng thái Ngân sách: ${budgetSummary}\n\nPhân tích dòng tiền:\n1. Tỷ lệ Chi tiêu & Trả nợ so với Thu nhập (Có an toàn không?).\n2. Đánh giá Dòng tiền tự do còn lại (${formatVND(freeCashflow)}).\n3. 2 vị trí có thể cắt giảm chi tiêu ngay lập tức.`;
      maxTokens = 1500;
      temperature = 0.3;
    } else if (promptType === "savings") {
      // Skill: Lập kế hoạch & dự báo hoàn thành mục tiêu tiết kiệm
      userPrompt = `${dataSummary}\nMục tiêu tiết kiệm: ${JSON.stringify(
        (savings || []).map((s: any) => ({
          Mục_tiêu: s.title,
          Cần_đạt: formatVND(s.goalAmount),
          Đã_có: formatVND(s.currentAmount),
        })),
      )}\nDòng tiền dư có thể tích lũy: ${formatVND(freeCashflow)}/tháng.\n\nPhân tích:\n1. Với mức dư ${formatVND(freeCashflow)}/tháng, bao lâu sẽ đạt mục tiêu?\n2. Lộ trình phân bổ tiền tích lũy hợp lý.\n3. 1 Lời khuyên để tăng tốc độ hoàn thành.`;
      maxTokens = 1500;
      temperature = 0.3;
    } else {
      // Skill: Tư vấn & Giải đáp thắc mắc tài chính tổng quát
      userPrompt = `${dataSummary}\nTop chi tiêu: ${topCategory.join(", ")}\n\nCâu hỏi người dùng: "${customMessage}"\n\nTrả lời chính xác, ngắn gọn dựa trên dữ liệu tài chính ở trên.`;
      maxTokens = 1000;
      temperature = 0.4;
    }

    // Thiết lập Controller Timeout (15 giây) để xử lý mượt mà kể cả khi Render Proxy bị Cold Start
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: MASTER_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal as any,
    }).finally(() => clearTimeout(timeoutId));

    const data: any = await response.json();
    if (!response.ok) {
      const errMsg =
        data.error?.message || data.error || `Lỗi HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("AI không trả về phản hồi.");

    return { statusCode: 200, headers, body: JSON.stringify({ text }) };
  } catch (error: any) {
    console.error("gemini-advisor error:", error);
    let message = error.message || "";

    if (error.name === "AbortError") {
      message =
        "Kết nối API phản hồi chậm (Timeout 15s). Vui lòng bấm thử lại.";
    } else if (
      message.includes("API_KEY") ||
      message.includes("401") ||
      message.includes("Unauthorized")
    ) {
      message =
        "API Key không hợp lệ hoặc đã hết hạn trên hệ thống FreeLLMAPI.";
    } else if (
      message.includes("quota") ||
      message.includes("rate") ||
      message.includes("429")
    ) {
      message =
        "Hệ thống FreeLLMAPI đang quá tải lượt gọi. Vui lòng thử lại sau vài giây.";
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Lỗi kết nối AI", message }),
    };
  }
};
