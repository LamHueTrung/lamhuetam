import { Handler } from '@netlify/functions';
import { connectDB, Transaction, Budget } from './_db';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    if (event.httpMethod === 'PUT' && event.body) {
      const body = JSON.parse(event.body);
      const { id, ...updates } = body;
      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };
      }

      const oldTx = await Transaction.findOne({ id } as any);
      if (!oldTx) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Transaction not found' }) };
      }

      const updatedTx = await Transaction.findOneAndUpdate({ id } as any, updates, { new: true });

      if (oldTx.type === 'expense') {
        const oldBudget = await Budget.findOne({ category: oldTx.category } as any);
        if (oldBudget) {
          oldBudget.spent = Math.max(0, oldBudget.spent - oldTx.amount);
          await oldBudget.save();
        }

        const newCategory = updates.category || oldTx.category;
        const newAmount = updates.amount || oldTx.amount;

        if (updates.category && updates.category !== oldTx.category) {
          const newBudget = await Budget.findOne({ category: newCategory } as any);
          if (newBudget) {
            newBudget.spent += newAmount;
            await newBudget.save();
          }
        } else {
          const budget = await Budget.findOne({ category: newCategory } as any);
          if (budget) {
            budget.spent += newAmount;
            await budget.save();
          }
        }
      }

      return { statusCode: 200, headers, body: JSON.stringify(updatedTx) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
