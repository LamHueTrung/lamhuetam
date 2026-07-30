import React, { useState } from "react";
import { Icon } from "@mdi/react";
import { mdiLogin, mdiLoading } from "@mdi/js";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import AppLogo from "./AppLogo";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { toast.error("Vui lòng nhập đầy đủ thông tin"); return; }
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#F2F2F7] flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <AppLogo size={72} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Đăng nhập</h1>
          <p className="text-xs text-slate-400 font-medium">Tiếp tục quản lý tài chính của bạn</p>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              id="username-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder=" "
              className="peer w-full px-4 pt-5 pb-2 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#2D5A27]/20 transition-all"
            />
            <label
              htmlFor="username-input"
              className="absolute left-4 top-3.5 text-xs text-slate-400 font-medium transition-all pointer-events-none origin-[0_0] peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#2D5A27] peer-focus:scale-90 peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:scale-90"
            >
              Tên đăng nhập
            </label>
          </div>

          <div className="relative">
            <input
              type="password"
              id="password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              className="peer w-full px-4 pt-5 pb-2 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#2D5A27]/20 transition-all"
            />
            <label
              htmlFor="password-input"
              className="absolute left-4 top-3.5 text-xs text-slate-400 font-medium transition-all pointer-events-none origin-[0_0] peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#2D5A27] peer-focus:scale-90 peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:scale-90"
            >
              Mật khẩu
            </label>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-[#2D5A27] text-white font-bold text-sm py-3.5 rounded-2xl hover:bg-[#20401C] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2">
          {loading ? <Icon path={mdiLoading} size={1} className="animate-spin" /> : <Icon path={mdiLogin} size={1} />}
          <span>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</span>
        </button>
      </form>
    </div>
  );
}