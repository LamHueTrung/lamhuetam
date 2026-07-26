import { Handler } from '@netlify/functions';
import { connectDB, FixedExpenseCategory, FixedExpenseTask } from './_db';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    await connectDB();
    const params = event.queryStringParameters || {};
    const type = params.type || 'tasks'; // 'categories' | 'tasks'
    const month = params.month || new Date().toISOString().slice(0, 7);

    // ── GET ──────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      if (type === 'categories') {
        const cats = await FixedExpenseCategory.find().lean();
        return { statusCode: 200, headers, body: JSON.stringify(cats) };
      }
      // tasks by month
      const tasks = await FixedExpenseTask.find({ month }).lean();
      return { statusCode: 200, headers, body: JSON.stringify(tasks) };
    }

    const body = JSON.parse(event.body || '{}');
    const entity = body.entity || 'task'; // 'category' | 'task'

    // ── POST ─────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      if (entity === 'category') {
        const { name, icon, color } = body;
        if (!name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Tên danh mục bắt buộc' }) };
        const cat = await FixedExpenseCategory.create({ name, icon: icon || 'cash', color: color || 'slate' });
        return { statusCode: 201, headers, body: JSON.stringify(cat) };
      }
      // task
      const { categoryId, categoryName, name, amount, month: taskMonth, note } = body;
      if (!categoryId || !name || !amount) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Thiếu thông tin task' }) };
      const task = await FixedExpenseTask.create({ categoryId, categoryName: categoryName || '', name, amount, month: taskMonth || month, note: note || '' });
      return { statusCode: 201, headers, body: JSON.stringify(task) };
    }

    // ── PUT ──────────────────────────────────────────────
    if (event.httpMethod === 'PUT') {
      const { id } = body;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Thiếu id' }) };
      if (entity === 'category') {
        const cat = await FixedExpenseCategory.findOneAndUpdate({ id }, { $set: body }, { new: true });
        return { statusCode: 200, headers, body: JSON.stringify(cat) };
      }
      const task = await FixedExpenseTask.findOneAndUpdate({ id }, { $set: body }, { new: true });
      return { statusCode: 200, headers, body: JSON.stringify(task) };
    }

    // ── DELETE ───────────────────────────────────────────
    if (event.httpMethod === 'DELETE') {
      const id = params.id;
      const entityDel = params.entity || 'task';
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Thiếu id' }) };
      if (entityDel === 'category') {
        await FixedExpenseCategory.deleteOne({ id });
        await FixedExpenseTask.deleteMany({ categoryId: id });
      } else {
        await FixedExpenseTask.deleteOne({ id });
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
