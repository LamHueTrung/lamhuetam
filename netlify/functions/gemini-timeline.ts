import { Handler } from '@netlify/functions';

const BASE_URL = () => process.env.GEMINI_API_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL = () => process.env.GEMINI_MODEL || 'google/gemini-2.5-flash';
const API_KEY = () => process.env.GEMINI_API_KEY || '';

function generateDefaultTimeline(startStr: string, totalInst: number, amtPerInst: number, dueDayNum: number) {
  const timeline = [];
  const start = new Date(startStr);
  const baseYear = start.getFullYear();
  const baseMonth = start.getMonth();

  for (let i = 0; i < totalInst; i++) {
    const targetMonth = baseMonth + i;
    const year = baseYear + Math.floor(targetMonth / 12);
    const month = targetMonth % 12;
    const maxDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(dueDayNum, maxDay);
    const instDate = new Date(Date.UTC(year, month, day));

    timeline.push({ date: instDate.toISOString().split('T')[0], amount: amtPerInst, completed: false });
  }
  return timeline;
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
    const { partner, amtPerPeriod, installments, startDate, paymentDueDay } = JSON.parse(event.body || '{}');

    if (!amtPerPeriod || !installments || !startDate) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Thiếu dữ liệu đầu vào' }) };
    }

    const dueDayNum = parseInt(paymentDueDay) || 5;
    const apiKey = API_KEY();

    if (!apiKey) {
      const fallback = generateDefaultTimeline(startDate, installments, amtPerPeriod, dueDayNum);
      return { statusCode: 200, headers, body: JSON.stringify({ timeline: fallback, fromAI: false }) };
    }

    const model = MODEL();
    const prompt = `Tạo lịch thanh toán ${installments} kỳ, mỗi kỳ ${amtPerPeriod} VNĐ, bắt đầu từ tháng ${startDate}, thanh toán vào ngày ${paymentDueDay} hàng tháng. Trả về mảng JSON: [{"date":"YYYY-MM-DD","amount":${amtPerPeriod},"completed":false}]. Chỉ trả về JSON, không markdown.`;

    const response = await fetch(`${BASE_URL()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Chỉ trả về mảng JSON thuần, không text thêm.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const fallback = generateDefaultTimeline(startDate, installments, amtPerPeriod, dueDayNum);
      return { statusCode: 200, headers, body: JSON.stringify({ timeline: fallback, fromAI: false, note: 'AI lỗi, dùng lộ trình mặc định' }) };
    }

    let raw = (data.choices?.[0]?.message?.content || '').trim();
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();

    const parsed = JSON.parse(raw);
    const timeline = Array.isArray(parsed) ? parsed : (parsed.timeline || parsed.installments || []);

    if (!Array.isArray(timeline) || timeline.length === 0) {
      throw new Error('AI trả về dữ liệu không hợp lệ');
    }

    return { statusCode: 200, headers, body: JSON.stringify({ timeline, fromAI: true }) };
  } catch (error: any) {
    console.error('gemini-timeline error:', error);
    const { startDate, installments, amtPerPeriod, paymentDueDay } = JSON.parse(event.body || '{}');
    const fallback = generateDefaultTimeline(
      startDate || new Date().toISOString().split('T')[0],
      parseInt(installments) || 1,
      parseInt(amtPerPeriod) || 0,
      parseInt(paymentDueDay) || 5
    );
    return { statusCode: 200, headers, body: JSON.stringify({ timeline: fallback, fromAI: false, note: 'Đã dùng lộ trình mặc định' }) };
  }
};
