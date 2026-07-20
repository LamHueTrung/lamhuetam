import { Handler } from '@netlify/functions';
import { connectDB, SavingsGoal } from './_db';

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
      const savings = await SavingsGoal.find().lean();
      return { statusCode: 200, headers, body: JSON.stringify(savings) };
    }

    if (event.httpMethod === 'PUT' && event.body) {
      const { amount } = JSON.parse(event.body);
      const goal = await SavingsGoal.findOne();
      if (!goal) {
        const newGoal = await SavingsGoal.create({
          title: 'Mục tiêu tiết kiệm',
          goalAmount: 50000000,
          currentAmount: Math.max(0, amount),
          targetDate: '2026-12-31',
          icon: 'piggy'
        });
        return { statusCode: 200, headers, body: JSON.stringify(newGoal) };
      }

      goal.currentAmount = Math.max(0, Math.min(goal.goalAmount, goal.currentAmount + amount));
      await goal.save();
      return { statusCode: 200, headers, body: JSON.stringify(goal) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
