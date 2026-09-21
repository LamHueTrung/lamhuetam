import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  user: any | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = 'ios_finance_token';
const USER_KEY = 'ios_finance_username';

function normalizeEmail(usernameOrEmail: string): string {
  const clean = usernameOrEmail.trim().toLowerCase();
  if (clean.includes('@')) return clean;
  return `${clean}@gmail.com`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem(USER_KEY));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Kiểm tra session hiện tại từ Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const name = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'lamhuetrung';
        setUsername(name);
        localStorage.setItem(USER_KEY, name);
        localStorage.setItem(TOKEN_KEY, session.access_token);
      } else {
        // Fallback: kiểm tra token cũ nếu có
        const oldToken = localStorage.getItem(TOKEN_KEY);
        if (!oldToken) {
          setUser(null);
          setUsername(null);
        }
      }
      setLoading(false);
    });

    // 2. Lắng nghe thay đổi trạng thái đăng nhập
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const name = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'lamhuetrung';
        setUsername(name);
        localStorage.setItem(USER_KEY, name);
        localStorage.setItem(TOKEN_KEY, session.access_token);
      } else {
        setUser(null);
        setUsername(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (usernameInput: string, password: string) => {
    const email = normalizeEmail(usernameInput);
    
    // 1. Thử đăng nhập qua Supabase Auth
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // 2. Nếu tài khoản chưa có trên Supabase (Invalid login credentials) -> Tự động tạo tài khoản
    if (error && (error.message.includes('Invalid login credentials') || (error as any).code === 'invalid_credentials')) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: usernameInput.trim() },
        },
      });

      if (!signUpError) {
        if (signUpData?.session) {
          setUser(signUpData.user);
          setUsername(usernameInput.trim());
          return;
        } else {
          // Thử đăng nhập lại sau khi đăng ký
          const retry = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (retry.data?.session) {
            setUser(retry.data.user);
            setUsername(usernameInput.trim());
            return;
          }
        }
      }
    }

    if (error) {
      // 3. Fallback: Kiểm tra qua MongoDB auth cũ nếu Supabase yêu cầu xác nhận email
      try {
        const mongoRes = await fetch('/.netlify/functions/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', username: usernameInput.trim(), password }),
        });
        if (mongoRes.ok) {
          const mongoData = await mongoRes.json();
          localStorage.setItem(TOKEN_KEY, mongoData.token);
          localStorage.setItem(USER_KEY, mongoData.username);
          setUsername(mongoData.username);
          setUser({ id: 'legacy_mongodb_user', email });
          return;
        }
      } catch {}

      throw new Error(`Đăng nhập thất bại: Sai tên đăng nhập hoặc mật khẩu`);
    }

    if (data?.session) {
      setUser(data.user);
      const name = data.user.user_metadata?.username || usernameInput.trim();
      setUsername(name);
    }
  }, []);

  const register = useCallback(async (usernameInput: string, password: string) => {
    const email = normalizeEmail(usernameInput);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: usernameInput.trim() },
      },
    });

    if (error) throw new Error(error.message);
    if (data?.user) {
      setUser(data.user);
      setUsername(usernameInput.trim());
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // fallback
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user || !!localStorage.getItem(TOKEN_KEY),
      username,
      user,
      loading,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

