import { Handler } from '@netlify/functions';
import { connectDB, SalaryConfig, Transaction } from './_db';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    await connectDB();

    if (event.httpMethod === 'GET') {
      let config = await SalaryConfig.findOne().lean();
      if (!config) config = await SalaryConfig.create({});
      return { statusCode: 200, headers, body: JSON.stringify(config) };
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const action = body.action;

      // Auto-add salary for current month
      if (action === 'auto_add') {
        const currentMonth = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7);
        const config = await SalaryConfig.findOne();
        if (!config || config.netSalary <= 0) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Chưa có config lương hoặc lương = 0' }) };
        }
        if (config.lastAutoAddMonth === currentMonth) {
          return { statusCode: 200, headers, body: JSON.stringify({ skipped: true, message: 'Đã cộng lương tháng này rồi' }) };
        }

        const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const receiveDay = config.receiveDay || 1;
        const maxDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const actualDay = Math.min(receiveDay, maxDay);
        const salaryDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
        const totalLeave = (config.leaveDays || []).reduce((s: number, l: any) => s + (l.count || 0), 0);
        const desc = `Lương tháng ${currentMonth} | Công: ${config.workDays}ng | Nghỉ: ${totalLeave}ng`;

        const newTx = await Transaction.create({
          type: 'income',
          amount: config.netSalary,
          category: 'Lương',
          date: salaryDate,
          description: desc,
          wallet: 'Ngân hàng',
          isRecurring: true,
          frequency: 'monthly',
        });

        config.lastAutoAddMonth = currentMonth;
        await config.save();
        return { statusCode: 200, headers, body: JSON.stringify({ transaction: newTx, message: 'Đã cộng lương thành công!' }) };
      }

      // Save/update config
      const { grossSalary, netSalary, receiveDay, workDays, leaveDays, notes } = body;
      let config = await SalaryConfig.findOne();
      if (!config) {
        config = await SalaryConfig.create({ grossSalary, netSalary, receiveDay, workDays, leaveDays: leaveDays || [], notes: notes || '' });
      } else {
        if (grossSalary !== undefined) config.grossSalary = grossSalary;
        if (netSalary !== undefined) config.netSalary = netSalary;
        if (receiveDay !== undefined) config.receiveDay = receiveDay;
        if (workDays !== undefined) config.workDays = workDays;
        if (leaveDays !== undefined) config.leaveDays = leaveDays;
        if (notes !== undefined) config.notes = notes;
        await config.save();
      }
      return { statusCode: 200, headers, body: JSON.stringify(config) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
