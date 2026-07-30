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

    const { transactions, budgets, debts, savings, promptType, customMessage, userProfile } =
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

    // Tạo thông tin cá nhân (Profile MD)
    let profileMd = "";
    if (userProfile) {
      profileMd += `## 👤 THÔNG TIN CÁ NHÂN (PROFILE NGƯỜI DÙNG)\n`;
      profileMd += `- **Họ & Tên:** ${userProfile.fullName || "Lâm Huệ Trung"}\n`;
      if (userProfile.dob) profileMd += `- **Ngày sinh:** ${userProfile.dob}\n`;
      if (userProfile.hometown) profileMd += `- **Quê quán:** ${userProfile.hometown}\n`;
      if (userProfile.livingContext) profileMd += `- **Hoàn cảnh sống hiện tại:** ${userProfile.livingContext}\n`;
      if (userProfile.currentJob) profileMd += `- **Công việc hiện tại:** ${userProfile.currentJob}\n`;
      if (userProfile.position) profileMd += `- **Vị trí công việc:** ${userProfile.position}\n`;
      if (userProfile.skills) {
        profileMd += `- **Kỹ năng mạnh nhất:** ${userProfile.skills.strongest || ""}\n`;
        profileMd += `- **Kỹ năng nền tảng:** ${userProfile.skills.foundation || ""}\n`;
        if (userProfile.skills.usedTech && userProfile.skills.usedTech.length > 0) {
          profileMd += `- **Công nghệ đã dùng:** ${userProfile.skills.usedTech.join(", ")}\n`;
        }
        if (userProfile.skills.companyTech && userProfile.skills.companyTech.length > 0) {
          profileMd += `- **Công nghệ tại công ty:** ${userProfile.skills.companyTech.join(", ")}\n`;
        }
        if (userProfile.skills.currentWorry) profileMd += `- **Nỗi lo lắng lớn nhất hiện tại:** ${userProfile.skills.currentWorry}\n`;
      }
      if (userProfile.education) {
        profileMd += `- **Trường học:** ${userProfile.education.school || ""}\n`;
        profileMd += `- **Trạng thái học vấn:** ${userProfile.education.status || ""}\n`;
      }
      if (userProfile.customFields && userProfile.customFields.length > 0) {
        profileMd += `### Thông tin bổ sung:\n`;
        userProfile.customFields.forEach((field: any) => {
          profileMd += `- **${field.label}:** ${field.value} (${field.category})\n`;
        });
      }
    }

    // Tạo báo cáo tài chính Markdown
    const numFmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' VNĐ';
    let financeMd = `# 📊 BÁO CÁO TÀI CHÍNH TỔNG QUAN\n\n`;
    
    financeMd += `## 1. 💵 DÒNG TIỀN THÁNG NÀY\n`;
    financeMd += `- **Tổng thu nhập tháng này:** ${numFmt(monthIncome)}\n`;
    financeMd += `- **Tổng chi tiêu tháng này:** ${numFmt(monthExpense)}\n`;
    financeMd += `- **Tiền trả nợ bắt buộc hàng tháng:** ${numFmt(totalMonthlyDebtPayment)}\n`;
    financeMd += `- **Dòng tiền khả dụng còn lại (Thu - Chi - Nợ):** ${numFmt(freeCashflow)}\n\n`;

    financeMd += `## 2. 📁 NGÂN SÁCH CÁC DANH MỤC\n`;
    if (budgets && budgets.length > 0) {
      budgets.filter((b: any) => b.limit > 0).forEach((b: any) => {
        financeMd += `- **${b.category}:** Đã tiêu ${numFmt(b.spent)} / Hạn mức ${numFmt(b.limit)} (${Math.round((b.spent / b.limit) * 100)}%)\n`;
      });
    } else {
      financeMd += `*Chưa thiết lập ngân sách danh mục*\n`;
    }
    financeMd += `\n`;

    financeMd += `## 3. 💳 DỰ NỢ & TRẢ GÓP\n`;
    financeMd += `- **Tổng dư nợ còn lại:** ${numFmt(totalDebt)}\n`;
    if (activeDebts.length > 0) {
      activeDebts.forEach((d: any, i: number) => {
        const typeLabel = d.type === 'credit_card' ? 'Thẻ tín dụng' : d.type === 'installment' ? 'Trả góp' : 'Vay nợ';
        financeMd += `### ${i + 1}. ${d.name} (${typeLabel})\n`;
        financeMd += `- Dư nợ còn lại: ${numFmt(d.currentBalance || 0)} / Ban đầu: ${numFmt(d.originalAmount || 0)}\n`;
        if (d.type === 'installment') {
          financeMd += `- Trả hàng tháng: ${numFmt(d.monthlyPayment || 0)} (Kỳ hạn: ${d.paidInstallments || 0}/${d.totalInstallments || 0})\n`;
        }
        if (d.notes) financeMd += `- Ghi chú: ${d.notes}\n`;
      });
    } else {
      financeMd += `*Không có khoản vay nợ nào active*\n`;
    }
    financeMd += `\n`;

    financeMd += `## 4. 📈 LỊCH SỬ GIAO DỊCH THU CHI GẦN ĐÂY\n`;
    if (recentTx.length > 0) {
      recentTx.forEach((t: any) => {
        const typeSign = t.type === 'income' ? '+' : '-';
        financeMd += `- [${t.date}] **${t.type === 'income' ? 'Thu' : 'Chi'}**: ${typeSign}${numFmt(t.amount)} | Danh mục: ${t.category} | Ví: ${t.wallet || 'Mặc định'}${t.description ? ` | Ghi chú: ${t.description}` : ''}\n`;
      });
    } else {
      financeMd += `*Chưa có lịch sử giao dịch*\n`;
    }

    // ── MASTER SYSTEM PROMPT ──
    const MASTER_SYSTEM_PROMPT = `Bạn là “Lâm Huệ Trung của 10 năm sau” — phiên bản trưởng thành hơn, tỉnh táo hơn, đã đi qua giai đoạn khó khăn hiện tại và quay về để đồng hành với chính bản thân mình (người dùng, tên là Lâm Huệ Trung).

Vai trò và tính cách của bạn:
- Luôn xưng hô "tao" (bạn) - "mày" (người dùng).
- Bạn là người chí cốt, cố vấn cá nhân, người anh em thân thiết và thực tế nhất.
- Giúp người dùng ra quyết định tốt hơn trong công việc, tài chính, các mối quan hệ, sức khỏe, học tập và định hướng dài hạn.
- Không tâng bốc sáo rỗng, không nói lời khuyên chung chung.
- Luôn nói thật, nói thẳng nhưng không dập tắt tinh thần.
- Ưu tiên hành động thực tế, khả thi với hoàn cảnh thật của người dùng.
- Khi người dùng rối, bạn phải giúp họ nhìn ra gốc vấn đề.
- Khi họ yếu lòng, bạn phải nhắc họ nhớ mình là ai, đang mắc kẹt ở đâu, và phải làm gì tiếp theo.

## Nguyên tắc phản hồi của bạn:

1. Luôn trung thực và thực tế:
   - Không nói kiểu động viên hời hợt.
   - Không “cứ cố lên là được”.
   - Không né tránh sự thật khó nghe.

2. Ưu tiên nhìn gốc rễ:
   Khi người dùng đưa ra một vấn đề, hãy giúp họ bóc tách:
   - Đây là vấn đề bề mặt hay gốc rễ?
   - Nó thuộc nhóm: tài chính, sức khỏe, nghề nghiệp, quan hệ hay tâm lý?
   - Cơ chế nào đang lặp lại?
   - Họ đang tự lừa mình ở đâu?
   - Quyết định nào đang tạo hậu quả dây chuyền?

3. Nhìn theo tư duy hệ thống:
   Hãy chỉ ra:
   - Vòng lặp xấu đang kéo họ xuống.
   - Vòng lặp tốt cần xây.
   - Tác động ngắn hạn và dài hạn.
   - Đâu là đòn bẩy lớn nhất.
   - Đâu là hành động nhỏ nhưng hiệu quả cao.

4. Nói như người anh em chí cốt:
   Giọng điệu: Gần gũi, sâu sắc, tỉnh táo, có tình người, đôi khi nghiêm khắc khi cần. Bảo vệ họ khỏi các quyết định ngu ngốc do cảm xúc nhất thời.

5. Không tiếp tay cho tự hủy:
   If họ định: vay chỗ này đắp chỗ kia, tiêu tiền vì sĩ diện, tiếp tục “nổ hũ”, trì hoãn việc lấy bằng vô thời hạn, thức khuya triền miên làm hỏng sức khỏe, bỏ mặc định hướng nghề nghiệp,... thì bạn phải chặn lại ngay lập tức, nói rõ hậu quả, và đưa ra phương án thay thế thực tế hơn.`;

    let userPrompt = "";
    let maxTokens = 4000;
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
      maxTokens = 1000;
      temperature = 0.1;
    } else if (promptType === "insights") {
      // Skill: Đánh giá sức khỏe tài chính tháng
      userPrompt = `Dữ liệu tài chính:\n${financeMd}\n\nMày hãy đánh giá sức khỏe tài chính tháng này cho tao. Viết dưới giọng điệu "Lâm Huệ Trung 10 năm sau", phân tích sắc nét đúng 3 điểm chính cực kỳ ngắn gọn (mỗi điểm tối đa 2 dòng dưới dạng gạch đầu dòng), không dài dòng sáo rỗng.`;
      maxTokens = 800;
      temperature = 0.3;
    } else if (promptType === "debt") {
      // Skill: Tối ưu công nợ theo chiến lược Debt Avalanche (Trả nợ lãi cao trước)
      userPrompt = `Dữ liệu tài chính:\n${financeMd}\n\nMày hãy phân tích các khoản nợ của tao, chỉ ra khoản nguy hiểm và lập lộ trình dứt điểm tối ưu dưới góc nhìn của mày (Lâm Huệ Trung 10 năm sau).`;
      maxTokens = 4000;
      temperature = 0.2;
    } else if (promptType === "balance") {
      // Skill: Tối ưu dòng tiền & Cân bằng chi tiêu
      userPrompt = `Dữ liệu tài chính:\n${financeMd}\n\nMày hãy đánh giá chi tiêu, dòng tiền khả dụng và chỉ ra các vị trí tao có thể tối ưu/cắt giảm ngay dưới góc nhìn của mày.`;
      maxTokens = 4000;
      temperature = 0.3;
    } else if (promptType === "savings") {
      // Skill: Lập kế hoạch & dự báo hoàn thành mục tiêu tiết kiệm
      userPrompt = `Dữ liệu tài chính:\n${financeMd}\n\nMày hãy phân tích lộ trình tiết kiệm và khuyên tao cách phân bổ dòng tiền dư để đạt mục tiêu nhanh nhất dưới góc nhìn của mày.`;
      maxTokens = 4000;
      temperature = 0.3;
    } else {
      // Skill: Trò chuyện & Giải đáp thắc mắc đa năng (General Chat Assistant)
      userPrompt = `Dưới đây là thông tin cá nhân hiện tại của tao (người dùng):
${profileMd || "Chưa cập nhật thông tin cá nhân."}

Dưới đây là báo cáo tài chính chi tiết của tao:
${financeMd}

Tin nhắn/Câu hỏi của tao gửi cho mày: "${customMessage}"

Mày hãy trả lời tao theo đúng tính cách và nguyên tắc phản hồi của "Lâm Huệ Trung 10 năm sau". Dựa vào thông tin cá nhân và báo cáo tài chính ở trên để đưa ra những lời khuyên chuẩn xác nhất khi tao hỏi về tài chính hay cuộc sống của tao.`;
      maxTokens = 4000;
      temperature = 0.5;
    }    // Thiết lập Controller Timeout (5 phút) để xử lý mượt mà kể cả khi Render Proxy bị Cold Start
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

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
        "Kết nối API phản hồi chậm (Timeout 5p). Vui lòng bấm thử lại.";
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
