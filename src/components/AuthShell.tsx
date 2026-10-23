import React, { useState } from "react";
import { Icon } from "@mdi/react";
import { mdiWeatherNight, mdiWeatherSunny } from "@mdi/js";
import { motion } from "motion/react";
import AppLogo from "./AppLogo";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/** Khung dùng chung cho Đăng nhập / Đăng ký. */
export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark") || localStorage.getItem("dark_mode") === "true");

  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("dark_mode", String(next));
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <div className="auth-stage">
      <span className="auth-orb o1" />
      <span className="auth-orb o2" />
      <span className="auth-orb o3" />
      <button type="button" className="auth-theme" onClick={toggle} aria-label="Đổi giao diện sáng/tối">
        <Icon path={dark ? mdiWeatherSunny : mdiWeatherNight} size={0.9} />
      </button>
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="auth-logo">
          <AppLogo size={68} />
        </div>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-sub">{subtitle}</p>
        {children}
        <p className="auth-foot">LÂM HUỆ TRUNG • TÀI CHÍNH • NHẬT KÝ</p>
      </motion.div>
    </div>
  );
}
