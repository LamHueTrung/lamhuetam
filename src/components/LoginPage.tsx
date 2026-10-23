import React, { useState } from "react";
import { Icon } from "@mdi/react";
import {
  mdiAccountOutline,
  mdiLockOutline,
  mdiEyeOutline,
  mdiEyeOffOutline,
  mdiArrowRight,
  mdiCheckBold,
  mdiLoading,
} from "@mdi/js";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import AuthShell from "./AuthShell";

const REMEMBER_KEY = "remember_username";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState(() => localStorage.getItem(REMEMBER_KEY) || "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(() => !!localStorage.getItem(REMEMBER_KEY));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { toast.error("Vui lòng nhập đầy đủ thông tin"); return; }
    setLoading(true);
    try {
      await login(username, password);
      if (remember) localStorage.setItem(REMEMBER_KEY, username.trim());
      else localStorage.removeItem(REMEMBER_KEY);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Chào mừng trở lại" subtitle="Đăng nhập để tiếp tục">
      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <span className="lead"><Icon path={mdiAccountOutline} size={1} /></span>
          <input
            id="username-input"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Tên đăng nhập"
          />
        </div>
        <div className="auth-field">
          <span className="lead"><Icon path={mdiLockOutline} size={1} /></span>
          <input
            id="password-input"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
          />
          <button type="button" className="trail" onClick={() => setShowPw((v) => !v)} aria-label="Hiện/ẩn mật khẩu">
            <Icon path={showPw ? mdiEyeOutline : mdiEyeOffOutline} size={0.95} />
          </button>
        </div>

        <div className="auth-row">
          <label className="auth-check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span className="box"><Icon path={mdiCheckBold} size={0.65} /></span>
            Ghi nhớ tôi
          </label>
          <button
            type="button"
            className="auth-link"
            onClick={() => toast("Vui lòng liên hệ quản trị viên để đặt lại mật khẩu")}
          >
            Quên mật khẩu?
          </button>
        </div>

        <button type="submit" disabled={loading} className="auth-submit">
          <span>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</span>
          <span className="arrow">
            <Icon path={loading ? mdiLoading : mdiArrowRight} size={0.95} className={loading ? "animate-spin" : ""} />
          </span>
        </button>
      </form>
    </AuthShell>
  );
}