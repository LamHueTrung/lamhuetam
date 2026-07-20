import React from "react";

interface AppLogoProps {
  size?: number;
}

export default function AppLogo({ size = 64 }: AppLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background rounded square */}
      <rect width="64" height="64" rx="16" fill="#1E293B" />

      {/* Wave line (sóng) */}
      <path
        d="M10 40 C18 28, 26 44, 34 34 C42 24, 48 38, 54 28"
        stroke="#22D3EE"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Upward chart (biểu đồ đi lên) — 3 bars */}
      <rect x="18" y="36" width="6" height="14" rx="1.5" fill="#10B981" opacity="0.7" />
      <rect x="29" y="28" width="6" height="22" rx="1.5" fill="#10B981" opacity="0.85" />
      <rect x="40" y="20" width="6" height="30" rx="1.5" fill="#10B981" />

      {/* Arrow tip on last bar */}
      <path
        d="M43 18 L46 22 L40 22 Z"
        fill="#10B981"
      />
    </svg>
  );
}
