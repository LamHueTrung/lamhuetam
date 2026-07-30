import React from "react";

interface AppLogoProps {
  size?: number;
  className?: string;
}

export default function AppLogo({ size = 64, className = "" }: AppLogoProps) {
  return (
    <img
      src="/logo_192.png"
      alt="Tài Chính Cá Nhân"
      width={size}
      height={size}
      className={`rounded-2xl ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
