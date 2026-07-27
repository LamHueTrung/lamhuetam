import { Handler } from '@netlify/functions';
import { connectDB, AIConfig } from './_db';
import fetch from 'node-fetch';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Content-Type': 'application/json',
};

const DEFAULT_CONFIG = {
  model: 'gemini-2.5-flash',
  apiKey: '',
  baseUrl: 'https://openrouter.ai/api/v1',
  lastTestedAt: '',
  testStatus: 'not_tested',
  testMessage: '',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    await connectDB();

    // 1. GET Config
    if (event.httpMethod === 'GET') {
      let config = await AIConfig.findOne().lean();
      if (!config) {
        config = await AIConfig.create(DEFAULT_CONFIG);
      }
      // Ẩn API Key thực tế ở FE, chỉ báo là đã nhập hay chưa
      const responseData = {
        ...config,
        apiKey: '', // clear
        hasKey: !!config.apiKey,
      };
      return { statusCode: 200, headers, body: JSON.stringify(responseData) };
    }

    // 2. PUT Update Config
    if (event.httpMethod === 'PUT') {
      const data = JSON.parse(event.body || '{}');
      let config = await AIConfig.findOne();
      if (!config) {
        config = new AIConfig(DEFAULT_CONFIG);
      }

      // Chỉ cập nhật apiKey nếu user có truyền vào (không rỗng)
      if (data.apiKey !== undefined && data.apiKey !== '') {
        config.apiKey = data.apiKey;
      }
      if (data.model !== undefined) config.model = data.model;
      if (data.baseUrl !== undefined) config.baseUrl = data.baseUrl;

      await config.save();

      const responseData = {
        ...config.toObject(),
        apiKey: '',
        hasKey: !!config.apiKey,
      };
      return { statusCode: 200, headers, body: JSON.stringify(responseData) };
    }

    // 3. POST / Test Connection
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      const { model, apiKey, baseUrl } = data;

      // Lấy apiKey hiện tại trong DB nếu như FE gửi lên chuỗi rỗng (không đổi key)
      let finalKey = apiKey;
      let finalBaseUrl = baseUrl || 'https://openrouter.ai/api/v1';
      let finalModel = model || 'gemini-2.5-flash';

      if (!finalKey) {
        const currentConfig = await AIConfig.findOne();
        if (currentConfig && currentConfig.apiKey) {
          finalKey = currentConfig.apiKey;
        }
      }

      // Fallback về env key nếu hoàn toàn trống
      if (!finalKey) {
        finalKey = process.env.GEMINI_API_KEY || '';
      }

      if (!finalKey) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            testStatus: 'invalid_key',
            testMessage: 'Thiếu API Key để kiểm tra kết nối',
          }),
        };
      }

      let testStatus = 'connected';
      let testMessage = 'Kết nối thành công!';

      try {
        const response = await fetch(`${finalBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${finalKey}`,
          },
          body: JSON.stringify({
            model: finalModel,
            messages: [
              { role: 'user', content: 'respond with ok' }
            ],
            max_tokens: 5,
          }),
        });

        const resData: any = await response.json().catch(() => ({}));

        if (!response.ok) {
          const status = response.status;
          const apiErr = resData.error?.message || resData.error || '';

          if (status === 401 || apiErr.includes('API key') || apiErr.includes('auth')) {
            testStatus = 'invalid_key';
            testMessage = 'API Key không hợp lệ hoặc đã hết hạn (401)';
          } else if (status === 429 || apiErr.includes('quota') || apiErr.includes('rate limit')) {
            testStatus = 'quota_exceeded';
            testMessage = 'Hết quota hoặc bị giới hạn lượt gọi (429)';
          } else if (status === 404 || apiErr.includes('model')) {
            testStatus = 'model_error';
            testMessage = `Mô hình AI '${finalModel}' không tồn tại hoặc không được hỗ trợ (404)`;
          } else {
            testStatus = 'network_error';
            testMessage = `Lỗi hệ thống: ${apiErr || `HTTP status ${status}`}`;
          }
        }
      } catch (err: any) {
        testStatus = 'network_error';
        testMessage = `Không thể kết nối đến máy chủ AI: ${err.message}`;
      }

      // Lưu trạng thái test vào Database
      let config = await AIConfig.findOne();
      if (!config) {
        config = new AIConfig(DEFAULT_CONFIG);
      }
      config.lastTestedAt = new Date().toLocaleString('vi-VN');
      config.testStatus = testStatus;
      config.testMessage = testMessage;
      await config.save();

      return {
        allowed: true,
        statusCode: 200,
        headers,
        body: JSON.stringify({
          testStatus,
          testMessage,
          lastTestedAt: config.lastTestedAt,
        }),
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
