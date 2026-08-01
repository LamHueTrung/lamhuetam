import { Handler } from '@netlify/functions';
import { connectDB, Debt, Transaction, Budget } from './_db';

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
      const debts = await Debt.find().lean();
      return { statusCode: 200, headers, body: JSON.stringify(debts) };
    }

    if (event.httpMethod === 'POST' && event.body) {
      const body = JSON.parse(event.body);
      const newDebt = await Debt.create(body);
      return { statusCode: 201, headers, body: JSON.stringify(newDebt) };
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id;
      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };
      }
      await Debt.findOneAndDelete({ id } as any);
      return { statusCode: 200, headers, body: JSON.stringify({ deleted: true }) };
    }

    if (event.httpMethod === 'PUT' && event.body) {
      const { debtId, installmentIndices, partialAmounts, note, date, updateData } = JSON.parse(event.body);

      if (updateData) {
        const updated = await Debt.findOneAndUpdate(
          { id: debtId } as any,
          { $set: updateData },
          { new: true }
        ).lean();
        return { statusCode: 200, headers, body: JSON.stringify(updated) };
      }

      const indices = installmentIndices || [];
      if (indices.length === 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing installment indices' }) };
      }

      const debt = await Debt.findOne({ id: debtId } as any);
      if (!debt) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Debt not found' }) };
      }

      let totalPaid = 0;
      const nowStr = date || new Date().toISOString().split('T')[0];
      const desc = note ? `${debt.name} - ${note}` : debt.name;

      for (const idx of indices) {
        const target = debt.installments.find((i: any) => i.index === idx);
        if (!target || target.status === 'paid') continue;

        const payAmount = partialAmounts?.[idx] ?? target.amount;
        target.paidAmount = (target.paidAmount || 0) + payAmount;
        target.paidDate = nowStr;

        if (target.paidAmount >= target.amount) {
          target.status = 'paid';
          target.paidAmount = target.amount;
        } else {
          target.status = 'partial';
        }
        totalPaid += payAmount;

        // Tạo phiếu chi cho mỗi kỳ nợ
        await Transaction.create({
          type: 'expense',
          amount: payAmount,
          category: 'Trả nợ',
          date: nowStr,
          description: desc,
          wallet: 'Ngân hàng'
        });
      }

      if (totalPaid === 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'No payable installments selected' }) };
      }

      // Tính lại số dư nợ còn lại chính xác dựa trên các kỳ chưa hoàn thành (pending/partial)
      const remainingBalance = debt.installments
        .filter((i: any) => i.status !== 'paid')
        .reduce((s: number, i: any) => s + (i.amount - (i.paidAmount || 0)), 0);

      debt.currentBalance = Math.max(0, remainingBalance);
      debt.paidInstallments = debt.installments.filter((i: any) => i.status === 'paid').length;

      if (debt.currentBalance <= 0) {
        debt.status = 'settled';
      } else {
        debt.status = 'active';
      }

      const budgetCat = 'Trả nợ';
      const budget = await Budget.findOne({ category: budgetCat } as any);
      if (budget) {
        budget.spent += totalPaid;
        await budget.save();
      }

      await debt.save();
      return { statusCode: 200, headers, body: JSON.stringify(debt) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};