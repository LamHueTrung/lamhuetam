import { Handler } from '@netlify/functions';
import { connectDB, Transaction, Budget } from './_db';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    await connectDB();

    if (event.httpMethod === 'GET') {
      const transactions = await Transaction.find().sort({ date: -1 }).lean();
      return { statusCode: 200, headers, body: JSON.stringify(transactions) };
    }

    if (event.httpMethod === 'POST' && event.body) {
      const body = JSON.parse(event.body);
      const newTx = await Transaction.create(body);

      if (body.type === 'expense') {
        const budget = await Budget.findOne({ category: body.category } as any);
        if (budget) {
          budget.spent += body.amount;
          await budget.save();
        }
      }

      return { statusCode: 201, headers, body: JSON.stringify(newTx) };
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id;
      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };
      }
      const tx = await Transaction.findOneAndDelete({ id } as any);
      if (tx && tx.type === 'expense') {
        const budget = await Budget.findOne({ category: tx.category } as any);
        if (budget) {
          budget.spent = Math.max(0, budget.spent - tx.amount);
          await budget.save();
        }
      }
      return { statusCode: 200, headers, body: JSON.stringify({ deleted: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
