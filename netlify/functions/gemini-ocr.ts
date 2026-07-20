import { Handler } from '@netlify/functions';

const BASE_URL = () => process.env.GEMINI_API_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL = () => process.env.GEMINI_MODEL || 'google/gemini-2.5-flash';
const API_KEY = () => process.env.GEMINI_API_KEY || '';

const SAMPLE_RESPONSES: Record<string, { amount: number; category: string; description: string }> = {
  starbucks: { amount: 85000, category: 'Ăn uống', description: 'Cà phê Starbucks' },
  coopmart: { amount: 450000, category: 'Mua sắm', description: 'Thực phẩm Co.opmart' },
  cgv: { amount: 220000, category: 'Mua sắm', description: 'Vé xem phim CGV' },
};

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
    const { image, sampleName } = JSON.parse(event.body || '{}');

    if (sampleName && SAMPLE_RESPONSES[sampleName]) {
      return { statusCode: 200, headers, body: JSON.stringify(SAMPLE_RESPONSES[sampleName]) };
    }

    const apiKey = API_KEY();
    if (!apiKey) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing API Key' }) };
    }

    if (!image || typeof image !== 'string' || !image.startsWith('data:image')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Không tìm thấy ảnh hợp lệ' }) };
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
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Phân tích hóa đơn này, trích xuất: tổng tiền (amount), danh mục (category: Ăn uống/Di chuyển/Mua sắm/Hóa đơn/Khác), mô tả ngắn (description). Chỉ trả về JSON.' },
              { type: 'image_url', image_url: { url: image } }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 512,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data.error?.message || data.error || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const resultText = data.choices?.[0]?.message?.content?.trim();
    if (!resultText) throw new Error('AI không trả về kết quả');

    const parsedData = JSON.parse(resultText);
    return { statusCode: 200, headers, body: JSON.stringify(parsedData) };
  } catch (error: any) {
    console.error('gemini-ocr error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Lỗi quét hóa đơn', message: error.message }) };
  }
};
