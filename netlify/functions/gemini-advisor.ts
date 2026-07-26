import { Handler } from '@netlify/functions';

const BASE_URL = () => process.env.GEMINI_API_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL = () => process.env.GEMINI_MODEL || 'google/gemini-2.5-flash';
const API_KEY = () => process.env.GEMINI_API_KEY || '';

function formatVND(num: number) {
  if (num >= 1000000) return Math.round(num / 1000000) + 'tr';
  if (num >= 1000) return Math.round(num / 1000) + 'k';
  return num.toString();
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const apiKey = API_KEY();
    if (!apiKey) {
      return { statusCode: 400, headers, body: JSON.stringify({
        error: 'Missing API Key',
        message: 'Thiếu GEMINI_API_KEY. Thêm vào biến môi trường Netlify.'
      })};
    }

    const { transactions, budgets, debts, savings, promptType, customMessage, cashflowData, categoryDescription, userProfile } = JSON.parse(event.body || '{}');

    const totalIncome = transactions?.filter((t: any) => t.type === 'income')?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;
    const totalExpense = transactions?.filter((t: any) => t.type === 'expense')?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;
    const totalDebt = debts?.filter((d: any) => d.status === 'active')?.reduce((sum: number, d: any) => sum + (d.currentBalance || 0), 0) || 0;
    const totalMonthlyPayment = debts?.filter((d: any) => d.status === 'active')?.reduce((sum: number, d: any) => sum + (d.monthlyPayment || 0), 0) || 0;

    const profileContext = userProfile ? `
📌 HỒ SƠ & BỐI CẢNH CÁ NHÂN CỦA NGƯỜI DÙNG (LÂM HUỆ TRUNG):
- Họ tên: ${userProfile.fullName || 'Lâm Huệ Trung'} (Sinh: ${userProfile.dob || '08/01/2003'})
- Quê quán & Bối cảnh: ${userProfile.livingContext || 'Ở quê (Tiểu Cần - Trà Vinh), di chuyển xa đi làm, áp lực gia đình và tiền bạc thường trực.'}
- Nghề nghiệp: ${userProfile.currentJob || 'Lập trình viên tại Rynan Technologies'} (Vị trí: ${userProfile.position || 'Lập trình UI/UX và API'})
- Thế mạnh chuyên môn: ${userProfile.skills?.strongest || 'Node.js'} | Nền tảng: ${userProfile.skills?.foundation || 'UI/UX & API'}
- Công nghệ đã kinh qua: ${(userProfile.skills?.usedTech || []).join(', ')}
- Công nghệ làm ở công ty: ${(userProfile.skills?.companyTech || []).join(', ')}
- Nỗi lo hiện tại: ${userProfile.skills?.currentWorry || 'Bị cảm giác "mất gốc" Node.js vì công việc ở Rynan làm Laravel/Vue 2, chưa phù hợp định hướng dài hạn.'}
- Học vấn: ${userProfile.education?.school || 'ĐH Trà Vinh K21'} (${userProfile.education?.status || 'Đã lấy bằng tốt nghiệp'})
- Thông tin mở rộng: ${JSON.stringify(userProfile.customFields || [])}
` : '';

    let userPrompt = '';
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const monthIncome = transactions?.filter((t: any) => t.type === 'income' && t.date?.startsWith(thisMonth))?.reduce((s: number, t: any) => s + Number(t.amount), 0) || 0;
    const monthExpense = transactions?.filter((t: any) => t.type === 'expense' && t.date?.startsWith(thisMonth))?.reduce((s: number, t: any) => s + Number(t.amount), 0) || 0;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const lastMonthIncome = transactions?.filter((t: any) => t.type === 'income' && t.date?.startsWith(lastMonth))?.reduce((s: number, t: any) => s + Number(t.amount), 0) || 0;
    const lastMonthExpense = transactions?.filter((t: any) => t.type === 'expense' && t.date?.startsWith(lastMonth))?.reduce((s: number, t: any) => s + Number(t.amount), 0) || 0;
    const categorySpend: Record<string, number> = {};
    transactions?.filter((t: any) => t.type === 'expense' && t.date?.startsWith(thisMonth))?.forEach((t: any) => {
      categorySpend[t.category] = (categorySpend[t.category] || 0) + Number(t.amount);
    });
    const topCategory = Object.entries(categorySpend).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3);

    if (promptType === 'insights') {
      userPrompt = `${profileContext}\nHãy phân tích tổng quan tài chính và đưa ra 2-3 nhận xét ngắn gọn, súc tích (tối đa 200 chữ, không dùng Markdown, trả về plain text):\n\nTổng thu: ${totalIncome} VNĐ\nTổng chi: ${totalExpense} VNĐ\n\nTháng này: thu ${monthIncome} VNĐ, chi ${monthExpense} VNĐ\nTháng trước: thu ${lastMonthIncome} VNĐ, chi ${lastMonthExpense} VNĐ\n\nTop danh mục chi: ${JSON.stringify(topCategory)}\nBudget: ${JSON.stringify(budgets || [])}\nTổng nợ: ${totalDebt} VNĐ, trả/tháng: ${totalMonthlyPayment} VNĐ\nTiết kiệm: ${JSON.stringify(savings || [])}\n\nViết 2-3 câu ngắn như một lời khuyên cá nhân thấu hiểu bối cảnh của Lâm Huệ Trung.`;
    } else if (promptType === 'alerts') {
      const budgetAlerts = (budgets || []).filter((b: any) => b.limit > 0 && (b.spent / b.limit) >= 0.8);
      const now = new Date();
      const upcomingDebts = (debts || []).filter((d: any) => d.status === 'active' && d.installments?.some((i: any) => {
        if (i.status !== 'pending') return false;
        const due = new Date(i.dueDate + 'T00:00:00');
        const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
      }));
      userPrompt = `Bạn là trợ lý tài chính. Hãy phân tích dữ liệu sau và tạo 2-3 cảnh báo ngắn (tối đa 150 chữ, không Markdown, trả về plain text, mỗi cảnh báo trên một dòng, bắt đầu bằng dấu ⚠️):\n\nBudget vượt 80%: ${JSON.stringify(budgetAlerts)}\nNợ sắp đến hạn (7 ngày): ${JSON.stringify(upcomingDebts)}\nChi tháng này so với tháng trước: ${lastMonthExpense > 0 ? Math.round((monthExpense - lastMonthExpense) / lastMonthExpense * 100) : 0}%\n\nChỉ đưa ra cảnh báo nếu thực sự có vấn đề. Nếu mọi thứ ổn, trả về "OK".`;
    } else if (promptType === 'suggest-category') {
      userPrompt = `Bạn là chuyên gia phân loại chi tiêu. Dựa vào mô tả giao dịch sau, hãy chọn danh mục phù hợp nhất từ danh sách: ${categoryDescription?.join(', ') || 'Ăn uống, Di chuyển, Mua sắm, Hóa đơn, Nhà ở, Sức khỏe, Giải trí, Giáo dục, Khác'}.\n\nMô tả: "${customMessage}"\n\nChỉ trả về tên danh mục, không thêm gì khác.`;
    } else if (promptType === 'report') {
      userPrompt = `${profileContext}\nHãy tạo báo cáo tài chính tháng này ngắn gọn bằng tiếng Việt (dùng Markdown):\n\nTHỐNG KÊ THÁNG ${thisMonth}\n- Tổng thu: ${formatVND(monthIncome)} (tháng trước: ${formatVND(lastMonthIncome)})\n- Tổng chi: ${formatVND(monthExpense)} (tháng trước: ${formatVND(lastMonthExpense)})\n- Chênh lệch: ${formatVND(monthIncome - monthExpense)}\n\nCHI TIẾT CHI:\n- Top danh mục: ${topCategory.map((c: any) => `${c[0]}: ${formatVND(c[1])}`).join(', ')}\n\nNGÂN SÁCH:\n${(budgets || []).map((b: any) => `- ${b.category}: đã chi ${formatVND(b.spent)} / ${formatVND(b.limit)} (${b.limit > 0 ? Math.round(b.spent / b.limit * 100) : 0}%)`).join('\n')}\n\nNỢ: tổng ${formatVND(totalDebt)}, trả/tháng ${formatVND(totalMonthlyPayment)}\n\nYêu cầu:\n1. Nhận xét ngắn về tình hình.\n2. Điểm tích cực và cần cải thiện.\n3. Gợi ý 1-2 hành động cụ thể cho tháng sau.`;
    } else if (promptType === 'debt') {
      userPrompt = `${profileContext}\nHãy phân tích các khoản nợ sau và đưa ra chiến lược trả nợ tối ưu phù hợp bối cảnh gia đình & tiền bạc của Lâm Huệ Trung:\n\nDữ liệu khoản nợ: ${JSON.stringify(debts || [])}\nThu nhập hàng tháng: ${totalIncome} VNĐ\nChi tiêu hàng tháng: ${totalExpense} VNĐ\n\nYêu cầu:\n1. Tổng quan: tổng dư nợ ${formatVND(totalDebt)}, tổng trả góp/tháng ${formatVND(totalMonthlyPayment)}.\n2. Sắp xếp thứ tự ưu tiên trả nợ (nợ lãi suất cao trước).\n3. Với mỗi khoản nợ: còn bao nhiêu kỳ, dự kiến tất toán khi nào.\n4. Tư vấn chiến lược: nên trả hết dứt điểm hay vay xoay vòng? Lý do?\n5. Đề xuất phương án để vừa trả nợ vừa còn tiền chi tiêu và hỗ trợ gia đình.`;
    } else if (promptType === 'balance') {
      userPrompt = `${profileContext}\nPhân tích và đưa ra giải pháp cân đối dòng tiền cho Lâm Huệ Trung:\n\nThu nhập: ${totalIncome} VNĐ\nChi tiêu: ${totalExpense} VNĐ\nNgân sách: ${JSON.stringify(budgets || [])}\nKhoản nợ: ${JSON.stringify(debts || [])}\nGiao dịch gần đây: ${JSON.stringify(transactions?.slice(0, 10))}\n\nYêu cầu:\n1. Đánh giá tỷ lệ chi tiêu/thu nhập.\n2. Sau khi trả nợ còn bao nhiêu?\n3. Gợi ý phân bổ dòng tiền theo quy tắc 50/30/20 hoặc 6 chiếc lọ.\n4. 3 mẹo thiết thực để tăng tích lũy ngay tháng này.`;
    } else if (promptType === 'savings') {
      const available = totalIncome - totalExpense - totalMonthlyPayment;
      userPrompt = `${profileContext}\nHãy phân tích mục tiêu tiết kiệm:\n\nMục tiêu: ${JSON.stringify(savings || [])}\nThu nhập: ${totalIncome} VNĐ\nChi tiêu: ${totalExpense} VNĐ\nTrả nợ/tháng: ${totalMonthlyPayment} VNĐ\nCòn lại: ${available} VNĐ\n\nYêu cầu:\n1. Đánh giá khả thi của mục tiêu.\n2. Lộ trình tích lũy hàng tháng.\n3. Gợi ý kênh tiết kiệm phù hợp.`;
    } else {
      userPrompt = `${profileContext}\nHãy trả lời câu hỏi của Lâm Huệ Trung:\n\nCâu hỏi: "${customMessage}"\n\nBối cảnh tài chính hiện tại:\n- Thu nhập: ${totalIncome} VNĐ\n- Chi tiêu: ${totalExpense} VNĐ\n- Nợ: ${JSON.stringify(debts || [])}\n- Tiết kiệm: ${JSON.stringify(savings || [])}\n- Dữ liệu dòng tiền: ${JSON.stringify(cashflowData || {})}\n\nTrả lời bằng tiếng Việt thấu hiểu bối cảnh cá nhân (Node.js developer, làm việc xa nhà tại Rynan Tech, áp lực tiền bạc & gia đình), dùng số liệu cụ thể, có tính ứng dụng cao.`;
    }

    const model = MODEL();
    const response = await fetch(`${BASE_URL()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Bạn là Gemini Co-Visor, cố vấn tài chính và sự nghiệp cá nhân cao cấp dành riêng cho Lâm Huệ Trung. Luôn trả lời bằng tiếng Việt, dùng Markdown, gạch đầu dòng, số liệu cụ thể. Tư vấn thực tế, sâu sắc, thấu hiểu bối cảnh sống và định hướng sự nghiệp.' },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });


    const data = await response.json();
    if (!response.ok) {
      const errMsg = data.error?.message || data.error || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('AI không trả về phản hồi');

    return { statusCode: 200, headers, body: JSON.stringify({ text }) };
  } catch (error: any) {
    console.error('gemini-advisor error:', error);
    const errMsg = error.message || '';
    let message: string;
    if (errMsg.includes('API_KEY') || errMsg.includes('401') || errMsg.includes('Unauthorized')) {
      message = 'GEMINI_API_KEY không hợp lệ. Kiểm tra lại key hoặc dùng OpenRouter key (sk-or-...).';
    } else if (errMsg.includes('quota') || errMsg.includes('rate') || errMsg.includes('429')) {
      message = `Đã hết quota (model: ${MODEL()}). Đổi model qua env var GEMINI_MODEL hoặc đợi làm mới quota.`;
    } else {
      message = errMsg;
    }
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Lỗi kết nối AI', message }) };
  }
};
