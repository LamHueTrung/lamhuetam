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

    const { transactions, budgets, debts, savings, promptType, customMessage, cashflowData } = JSON.parse(event.body || '{}');

    const totalIncome = transactions?.filter((t: any) => t.type === 'income')?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;
    const totalExpense = transactions?.filter((t: any) => t.type === 'expense')?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;
    const totalDebt = debts?.filter((d: any) => d.status === 'active')?.reduce((sum: number, d: any) => sum + (d.currentBalance || 0), 0) || 0;
    const totalMonthlyPayment = debts?.filter((d: any) => d.status === 'active')?.reduce((sum: number, d: any) => sum + (d.monthlyPayment || 0), 0) || 0;

    let userPrompt = '';
    if (promptType === 'debt') {
      userPrompt = `Bạn là chuyên gia tư vấn tài chính. Hãy phân tích các khoản nợ sau và đưa ra chiến lược trả nợ tối ưu:\n\nDữ liệu khoản nợ: ${JSON.stringify(debts || [])}\nThu nhập hàng tháng: ${totalIncome} VNĐ\nChi tiêu hàng tháng: ${totalExpense} VNĐ\n\nYêu cầu:\n1. Tổng quan: tổng dư nợ ${formatVND(totalDebt)}, tổng trả góp/tháng ${formatVND(totalMonthlyPayment)}.\n2. Sắp xếp thứ tự ưu tiên trả nợ (nợ lãi suất cao trước).\n3. Với mỗi khoản nợ: còn bao nhiêu kỳ, dự kiến tất toán khi nào.\n4. Tư vấn chiến lược: nên trả hết dứt điểm hay vay xoay vòng? Lý do?\n5. Đề xuất phương án để vừa trả nợ vừa còn tiền chi tiêu.`;
    } else if (promptType === 'balance') {
      userPrompt = `Bạn là chuyên gia tư vấn tài chính. Phân tích và đưa ra giải pháp cân đối dòng tiền:\n\nThu nhập: ${totalIncome} VNĐ\nChi tiêu: ${totalExpense} VNĐ\nNgân sách: ${JSON.stringify(budgets || [])}\nKhoản nợ: ${JSON.stringify(debts || [])}\nGiao dịch gần đây: ${JSON.stringify(transactions?.slice(0, 10))}\n\nYêu cầu:\n1. Đánh giá tỷ lệ chi tiêu/thu nhập.\n2. Sau khi trả nợ còn bao nhiêu?\n3. Gợi ý phân bổ dòng tiền theo quy tắc 50/30/20 hoặc 6 chiếc lọ.\n4. 3 mẹo thiết thực để tăng tích lũy ngay tháng này.`;
    } else if (promptType === 'savings') {
      const available = totalIncome - totalExpense - totalMonthlyPayment;
      userPrompt = `Bạn là chuyên gia tài chính. Hãy phân tích mục tiêu tiết kiệm:\n\nMục tiêu: ${JSON.stringify(savings || [])}\nThu nhập: ${totalIncome} VNĐ\nChi tiêu: ${totalExpense} VNĐ\nTrả nợ/tháng: ${totalMonthlyPayment} VNĐ\nCòn lại: ${available} VNĐ\n\nYêu cầu:\n1. Đánh giá khả thi của mục tiêu.\n2. Lộ trình tích lũy hàng tháng.\n3. Gợi ý kênh tiết kiệm phù hợp.`;
    } else {
      userPrompt = `Bạn là trợ lý tài chính cá nhân. Hãy trả lời câu hỏi của người dùng:\n\nCâu hỏi: "${customMessage}"\n\nBối cảnh tài chính:\n- Thu nhập: ${totalIncome} VNĐ\n- Chi tiêu: ${totalExpense} VNĐ\n- Nợ: ${JSON.stringify(debts || [])}\n- Tiết kiệm: ${JSON.stringify(savings || [])}\n- Dữ liệu dòng tiền: ${JSON.stringify(cashflowData || {})}\n\nTrả lời bằng tiếng Việt, dùng số liệu cụ thể, dễ áp dụng. Nếu câu hỏi về chiến lược nợ, hãy tính toán và so sánh các phương án.`;
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
          { role: 'system', content: 'Bạn là Gemini Co-Visor, cố vấn tài chính cá nhân cao cấp. Luôn trả lời bằng tiếng Việt, dùng Markdown, gạch đầu dòng, số liệu cụ thể. Tư vấn thực tế, dễ hiểu, có tính ứng dụng ngay.' },
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
