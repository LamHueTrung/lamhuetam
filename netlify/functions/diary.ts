import { Handler } from '@netlify/functions';
import mongoose from 'mongoose';
import { connectDB, DiaryEntry } from './_db';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// Helper để query an toàn tránh Mongoose CastError khi id không phải 24-hex ObjectId
function getTargetQuery(targetId: string) {
  const isHex24 = /^[0-9a-fA-F]{24}$/.test(targetId);
  if (isHex24 && mongoose.Types.ObjectId.isValid(targetId)) {
    return { $or: [{ id: targetId }, { _id: targetId }] };
  }
  return { id: targetId };
}

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
      const { id, _id, date, content, mood, location, lat, lng, tags, images, pinned, replies } = body;
      if (!date || !content) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ngày và nội dung bắt buộc' }) };
      
      const customId = id || (typeof _id === 'string' && !_id.startsWith('ObjectId') ? _id : undefined);
      const entry = await DiaryEntry.create({
        ...(customId ? { id: customId } : {}),
        date,
        content,
        mood: mood || 'neutral',
        location: location || '',
        lat: lat || null,
        lng: lng || null,
        tags: tags || [],
        images: Array.isArray(images) ? images : [],
        pinned: Boolean(pinned),
        replies: Array.isArray(replies) ? replies : [],
      });
      return { statusCode: 201, headers, body: JSON.stringify(entry) };
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, _id, ...updates } = body;
      const targetId = id || _id;
      if (!targetId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Thiếu id' }) };
      
      const query = getTargetQuery(String(targetId));
      const entry = await DiaryEntry.findOneAndUpdate(
        query,
        { $set: updates },
        { new: true }
      );
      if (!entry) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Không tìm thấy bài viết' }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify(entry) };
    }

    if (event.httpMethod === 'DELETE') {
      const id = params.id;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Thiếu id' }) };
      const query = getTargetQuery(String(id));
      await DiaryEntry.deleteOne(query);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
