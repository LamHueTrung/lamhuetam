import { Handler } from '@netlify/functions';
import { connectDB, DiaryEntry } from './_db';

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

    if (event.httpMethod === 'GET') {
      const filter: any = {};
      if (params.month) filter.date = { $regex: `^${params.month}` };
      if (params.mood) filter.mood = params.mood;
      const entries = await DiaryEntry.find(filter).sort({ date: -1 }).lean();
      return { statusCode: 200, headers, body: JSON.stringify(entries) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { date, content, mood, location, lat, lng, tags } = body;
      if (!date || !content) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ngày và nội dung bắt buộc' }) };
      const entry = await DiaryEntry.create({ date, content, mood: mood || 'neutral', location: location || '', lat: lat || null, lng: lng || null, tags: tags || [] });
      return { statusCode: 201, headers, body: JSON.stringify(entry) };
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, ...updates } = body;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Thiếu id' }) };
      const entry = await DiaryEntry.findOneAndUpdate({ id }, { $set: updates }, { new: true });
      return { statusCode: 200, headers, body: JSON.stringify(entry) };
    }

    if (event.httpMethod === 'DELETE') {
      const id = params.id;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Thiếu id' }) };
      await DiaryEntry.deleteOne({ id });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
