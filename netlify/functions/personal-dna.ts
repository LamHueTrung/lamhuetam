import { Handler } from "@netlify/functions";
import { connectDB, PersonalDNA, Transaction } from "./_db";

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };

  try {
    await connectDB();

    if (event.httpMethod === "GET") {
      let dna = await PersonalDNA.findOne().lean();
      if (!dna) {
        dna = await PersonalDNA.create({
          behavioralInsights: [],
          hardConstraints: [
            { name: "Ăn uống tối thiểu", minAmount: 2000000, reason: "Duy trì sức khỏe cơ bản" }
          ],
          keyDecisions: []
        });
      }
      return { statusCode: 200, headers, body: JSON.stringify(dna) };
    }

    if (event.httpMethod === "PUT") {
      const data = JSON.parse(event.body ?? "{}");
      const updated = await PersonalDNA.findOneAndUpdate(
        {},
        { $set: { ...data, lastUpdated: new Date() } },
        { new: true, upsert: true }
      );
      return { statusCode: 200, headers, body: JSON.stringify(updated) };
    }

    if (event.httpMethod === "POST") {
      const action = event.queryStringParameters?.action;
      if (action === "analyze") {
        const txs = await Transaction.find().sort({ date: -1 }).limit(100).lean();
        const totalExpense = txs.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
        
        const insights = [];
        if (totalExpense > 0) {
          const catMap: Record<string, number> = {};
          txs.filter(t => t.type === "expense").forEach(t => {
            catMap[t.category] = (catMap[t.category] || 0) + t.amount;
          });
          const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 2);
          
          for (const [cat, amt] of topCats) {
            const pct = Math.round((amt / totalExpense) * 100);
            if (pct > 30) {
              insights.push({
                insight: `Chi tiêu danh mục ${cat} chiếm tỉ trọng cao (${pct}% tổng chi tiêu).`,
                confidence: 0.7,
                evidenceCount: 3,
                source: "transaction_analysis"
              });
            }
          }
        }

        const updated = await PersonalDNA.findOneAndUpdate(
          {},
          { $set: { behavioralInsights: insights, lastUpdated: new Date() } },
          { new: true, upsert: true }
        );
        return { statusCode: 200, headers, body: JSON.stringify(updated) };
      }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (error: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
