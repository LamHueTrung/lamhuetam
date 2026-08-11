import { Handler } from "@netlify/functions";
import { connectDB, AIKnowledge, AIConfig } from "./_db";
import fetch from "node-fetch";

const RAW_ARTICLES_POOL = [
  { title: "Cách trả nợ quả bóng tuyết", content: "Ưu tiên thanh toán các khoản nợ có số dư nhỏ nhất trước để tạo động lực tinh thần.", tags: ["nợ", "chiến-lược"] },
  { title: "Cách tối ưu nợ lãi suất cao", content: "Tập trung trả nợ có lãi suất cao nhất trước để giảm tổng chi phí lãi phải trả.", tags: ["nợ", "lãi-suất"] },
  { title: "Quy tắc 50/30/20 cải tiến", content: "Phù hợp với thu nhập thực tế tại Việt Nam: 60% thiết yếu, 20% linh hoạt, 20% trả nợ/tích lũy.", tags: ["quản-lý", "chi-tiêu"] }
];

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };

  const secret = event.headers["authorization"]?.replace("Bearer ", "");
  if (process.env.CRAWLER_SECRET && secret !== process.env.CRAWLER_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    await connectDB();
    const config = await AIConfig.findOne().lean();
    const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
    const baseUrl = config?.baseUrl || "https://trungsaas-beta.onrender.com/v1";
    const model = config?.model || "gemini-2.0-flash";

    if (!apiKey) throw new Error("Missing API Key");

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    await AIKnowledge.deleteMany({ createdAt: { $lt: ninetyDaysAgo } });

    const prompt = `Bạn là chuyên gia thẩm định tài chính. Đánh giá 3 bài viết sau theo 3 thang điểm (0-10):
1. accuracyScore (độ chính xác kiến thức)
2. vietnamFitScore (độ phù hợp thị trường VN)
3. userFitScore (độ phù hợp với Lập trình viên trẻ, thu nhập 10-20tr, có nợ)
Trả về kết quả dưới dạng JSON array: [{"title": "...", "accuracy": 9, "vietnamFit": 8, "userFit": 8}]

Danh sách bài viết:
${JSON.stringify(RAW_ARTICLES_POOL)}`;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      })
    });

    const data: any = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || "[]";
    const assessments = JSON.parse(rawContent.match(/\[.*\]/s)?.[0] || "[]");

    const created = [];
    for (const art of RAW_ARTICLES_POOL) {
      const evalData = assessments.find((a: any) => a.title === art.title) || { accuracy: 7, vietnamFit: 7, userFit: 7 };
      const relevanceScore = (evalData.accuracy + evalData.vietnamFit + evalData.userFit) / 3;

      const doc = await AIKnowledge.findOneAndUpdate(
        { title: art.title },
        {
          $set: {
            content: art.content,
            tags: art.tags,
            accuracyScore: evalData.accuracy,
            vietnamFitScore: evalData.vietnamFit,
            userFitScore: evalData.userFit,
            relevanceScore,
            isActive: relevanceScore >= 6
          }
        },
        { upsert: true, new: true }
      );
      created.push(doc);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ message: "Crawl and verify success", data: created }) };
  } catch (error: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
