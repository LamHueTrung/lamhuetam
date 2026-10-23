import React, { useState } from "react";
import { Icon } from "@mdi/react";
import {
  mdiAccountOutline,
  mdiLockOutline,
  mdiLockCheckOutline,
  mdiEyeOutline,
  mdiEyeOffOutline,
  mdiArrowRight,
  mdiLoading,
} from "@mdi/js";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import AuthShell from "./AuthShell";

export default function RegisterPage() {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { toast.error("Vui lòng nhập đầy đủ thông tin"); return; }
    if (password !== confirmPassword) { toast.error("Mật khẩu xác nhận không khớp"); return; }
    setLoading(true);
    try {
      await register(username, password);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Tạo tài khoản" subtitle="Khởi tạo không gian cá nhân">
      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <span className="lead"><Icon path={mdiAccountOutline} size={1} /></span>
          <input id="username-reg" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tên đăng nhập" />
        </div>
        <div className="auth-field">
          <span className="lead"><Icon path={mdiLockOutline} size={1} /></span>
          <input id="password-reg" type={showPw ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" />
          <button type="button" className="trail" onClick={() => setShowPw((v) => !v)} aria-label="Hiện/ẩn mật khẩu">
            <Icon path={showPw ? mdiEyeOutline : mdiEyeOffOutline} size={0.95} />
          </button>
        </div>
        <div className="auth-field" style={{ marginBottom: 22 }}>
          <span className="lead"><Icon path={mdiLockCheckOutline} size={1} /></span>
          <input id="confirmpassword-reg" type={showPw ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Xác nhận mật khẩu" />
        </div>

        <button type="submit" disabled={loading} className="auth-submit">
          <span>{loading ? "Đang tạo..." : "Tạo tài khoản"}</span>
          <span className="arrow">
            <Icon path={loading ? mdiLoading : mdiArrowRight} size={0.95} className={loading ? "animate-spin" : ""} />
          </span>
        </button>
      </form>
    </AuthShell>
  );
}