import { Handler } from '@netlify/functions';
import { connectDB, UserProfile } from './_db';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Content-Type': 'application/json',
};

const DEFAULT_PROFILE = {
  fullName: 'Lâm Huệ Trung',
  dob: '08/01/2003',
  hometown: 'Tiểu Cần - Trà Vinh',
  livingContext: 'Ở quê (Tiểu Cần - Trà Vinh), di chuyển xa để đi làm, áp lực gia đình và tiền bạc thường trực.',
  currentJob: 'Lập trình viên tại Rynan Technologies',
  position: 'Lập trình UI/UX và API',
  skills: {
    strongest: 'Node.js',
    foundation: 'Từng có nền tảng và tư duy tốt về UI/UX kết hợp API',
    usedTech: ['Node.js', 'NestJS', 'Next.js', 'ReactJS', 'MongoDB', 'SQL', 'GIS', 'Openplayer'],
    companyTech: ['Laravel PHP 7.3', 'Vue 2'],
    currentWorry: 'Cảm giác bị "mất gốc" Node.js vì môi trường hiện tại không còn phù hợp định hướng dài hạn'
  },
  education: {
    school: 'Sinh viên khóa 21 Đại học Trà Vinh',
    status: 'Chưa làm lễ tốt nghiệp, đã lấy bằng tốt nghiệp'
  },
  avatar: '',
  phone: '0399123456',
  emails: ['huetrung.lam@gmail.com', 'trunglh@rynan.net'],
  customFields: [
    {
      id: 'field-1',
      label: 'Định hướng sự nghiệp dài hạn',
      value: 'Trở thành Senior Fullstack JavaScript / Node.js Architect, xây dựng các giải pháp SaaS quy mô lớn.',
      category: 'Sự nghiệp'
    },
    {
      id: 'field-2',
      label: 'Mục tiêu tài chính ngắn hạn',
      value: 'Tích lũy quỹ dự phòng 6 tháng, thanh toán dứt điểm các khoản nợ vay và hỗ trợ tài chính cho gia đình ở quê.',
      category: 'Tài chính'
    },
    {
      id: 'field-3',
      label: 'Phong cách làm việc',
      value: 'Chủ động, tư duy hệ thống tốt, chú trọng đến trải nghiệm người dùng (UX) và hiệu năng API.',
      category: 'Cá nhân'
    }
  ]
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    await connectDB();

    if (event.httpMethod === 'GET') {
      let profile = await UserProfile.findOne().lean();
      if (!profile) {
        profile = await UserProfile.create(DEFAULT_PROFILE);
      }
      return { statusCode: 200, headers, body: JSON.stringify(profile) };
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const data = JSON.parse(event.body || '{}');
      let profile = await UserProfile.findOne();
      if (!profile) {
        profile = await UserProfile.create({ ...DEFAULT_PROFILE, ...data, updatedAt: new Date() });
      } else {
        Object.assign(profile, data);
        profile.updatedAt = new Date();
        await profile.save();
      }
      return { statusCode: 200, headers, body: JSON.stringify(profile) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
