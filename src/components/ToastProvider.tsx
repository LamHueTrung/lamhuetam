import React, { type ReactNode } from "react";
import { Toaster } from "react-hot-toast";

export default function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "20px",
            background: "#1E293B",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
            padding: "12px 20px",
          },
          success: {
            iconTheme: { primary: "#10B981", secondary: "#fff" },
          },
          error: {
            iconTheme: { primary: "#EF4444", secondary: "#fff" },
          },
          duration: 3000,
        }}
      />
    </>
  );
}
