import { Handler } from '@netlify/functions';
import { connectDB, Budget } from './_db';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    await connectDB();

    if (event.httpMethod === 'GET') {
      const budgets = await Budget.find().lean();
      return { statusCode: 200, headers, body: JSON.stringify(budgets) };
    }

    if (event.httpMethod === 'PUT' && event.body) {
      const { category, limit } = JSON.parse(event.body);
      const budget = await Budget.findOneAndUpdate(
        { category } as any,
        { limit },
        { upsert: true, new: true }
      ).lean();
      return { statusCode: 200, headers, body: JSON.stringify(budget) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
