import React, { useState } from "react";
import { Icon } from "@mdi/react";
import { mdiAccountPlus, mdiLoading } from "@mdi/js";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import AppLogo from "./AppLogo";

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
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <AppLogo size={72} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Thiết lập tài khoản</h1>
          <p className="text-xs text-slate-400 font-medium">Tạo tài khoản để bắt đầu quản lý tài chính</p>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              id="username-reg"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder=" "
              className="peer w-full px-4 pt-5 pb-2 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#2D5A27]/20 transition-all"
            />
            <label
              htmlFor="username-reg"
              className="absolute left-4 top-3.5 text-xs text-slate-400 font-medium transition-all pointer-events-none origin-[0_0] peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#2D5A27] peer-focus:scale-90 peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:scale-90"
            >
              Tên đăng nhập
            </label>
          </div>

          <div className="relative">
            <input
              type="password"
              id="password-reg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              className="peer w-full px-4 pt-5 pb-2 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#2D5A27]/20 transition-all"
            />
            <label
              htmlFor="password-reg"
              className="absolute left-4 top-3.5 text-xs text-slate-400 font-medium transition-all pointer-events-none origin-[0_0] peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#2D5A27] peer-focus:scale-90 peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:scale-90"
            >
              Mật khẩu
            </label>
          </div>

          <div className="relative">
            <input
              type="password"
              id="confirmpassword-reg"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder=" "
              className="peer w-full px-4 pt-5 pb-2 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2D5A27] focus:ring-2 focus:ring-[#2D5A27]/20 transition-all"
            />
            <label
              htmlFor="confirmpassword-reg"
              className="absolute left-4 top-3.5 text-xs text-slate-400 font-medium transition-all pointer-events-none origin-[0_0] peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#2D5A27] peer-focus:scale-90 peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:scale-90"
            >
              Xác nhận mật khẩu
            </label>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-[#2D5A27] text-white font-bold text-sm py-3.5 rounded-2xl hover:bg-[#20401C] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2">
          {loading ? <Icon path={mdiLoading} size={1} className="animate-spin" /> : <Icon path={mdiAccountPlus} size={1} />}
          <span>{loading ? "Đang tạo..." : "Tạo tài khoản"}</span>
        </button>
      </form>
    </div>
  );
}