import { Handler } from '@netlify/functions';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB, User } from './_db';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return secret;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    await connectDB();

    if (event.httpMethod === 'GET') {
      const hasUser = await User.countDocuments() > 0;
      return { statusCode: 200, headers, body: JSON.stringify({ hasUser }) };
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const { action, username, password } = JSON.parse(event.body || '{}');

    if (!username || !password) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Username và password không được để trống' }) };
    }

    if (action === 'register') {
      const existing = await User.countDocuments();
      if (existing > 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Đã có tài khoản, không thể đăng ký thêm' }) };
      }

      if (username.length < 3) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Username phải có ít nhất 3 ký tự' }) };
      }
      if (password.length < 6) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password phải có ít nhất 6 ký tự' }) };
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({ username, password: hashed });

      const token = jwt.sign(
        { id: user._id.toString(), username: user.username },
        getSecret(),
        { expiresIn: '7d' }
      );

      return { statusCode: 201, headers, body: JSON.stringify({ token, username: user.username }) };
    }

    if (action === 'login') {
      const user = await User.findOne({ username });
      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Sai tên đăng nhập hoặc mật khẩu' }) };
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Sai tên đăng nhập hoặc mật khẩu' }) };
      }

      const token = jwt.sign(
        { id: user._id.toString(), username: user.username },
        getSecret(),
        { expiresIn: '7d' }
      );

      return { statusCode: 200, headers, body: JSON.stringify({ token, username: user.username }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Action không hợp lệ' }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
