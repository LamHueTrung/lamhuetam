import React, { useState } from "react";
import { Icon } from "@mdi/react";
import { mdiAccountPlus, mdiLoading } from "@mdi/js";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    <div className="h-screen bg-[#F2F2F7] flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Thiết lập tài khoản</h1>
          <p className="text-xs text-slate-400 font-medium">Tạo tài khoản để bắt đầu quản lý tài chính</p>
        </div>
        <div className="space-y-4">
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tên đăng nhập" className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Xác nhận mật khẩu" className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold text-sm py-3.5 rounded-2xl hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2">
          {loading ? <Icon path={mdiLoading} size={1} className="animate-spin" /> : <Icon path={mdiAccountPlus} size={1} />}
          <span>{loading ? "Đang tạo..." : "Tạo tài khoản"}</span>
        </button>
      </form>
    </div>
  );
}