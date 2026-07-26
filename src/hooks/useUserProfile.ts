import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { api } from '../api/client';

export const defaultUserProfile: UserProfile = {
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

const PROFILE_KEY = 'user_profile_data';

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultUserProfile;
  });
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.profile.get();
      if (data && data.fullName) {
        setProfile(data);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Cannot fetch profile from API, using local profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updatedData: Partial<UserProfile>) => {
    const newProfile = { ...profile, ...updatedData };
    setProfile(newProfile);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      const res = await api.profile.save(updatedData);
      if (res && res.fullName) {
        setProfile(res);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(res));
      }
    } catch (err) {
      console.warn('Saved profile locally, API sync failed:', err);
    }
    return newProfile;
  };

  return { profile, loading, updateProfile, refetch: fetchProfile };
}
