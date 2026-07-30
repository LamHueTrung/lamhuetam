import React, { type ReactNode } from "react";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "motion/react";
import { Icon } from "@mdi/react";
import {
  mdiAlertOutline,
  mdiCloseCircleOutline,
  mdiCheckCircleOutline,
  mdiInformationOutline,
} from "@mdi/js";

type AiToastType = "warning" | "error" | "success" | "info";

const toastThemes: Record<AiToastType, { icon: string; gradient: string }> = {
  warning: {
    icon: mdiAlertOutline,
    gradient: "linear-gradient(135deg, #F59E0B, #EF4444)",
  },
  error: {
    icon: mdiCloseCircleOutline,
    gradient: "linear-gradient(135deg, #EF4444, #DC2626)",
  },
  success: {
    icon: mdiCheckCircleOutline,
    gradient: "linear-gradient(135deg, #10B981, #059669)",
  },
  info: {
    icon: mdiInformationOutline,
    gradient: "linear-gradient(135deg, #3B82F6, #2563EB)",
  },
};

export function aiToast(
  message: string,
  options?: { type?: AiToastType; duration?: number },
) {
  const theme = toastThemes[options?.type ?? "warning"];

  return toast.custom(
    (t) => (
      <motion.div
        drag="x"
        dragSnapToOrigin
        dragElastic={0.3}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > 80) toast.dismiss(t.id);
        }}
        animate={{ opacity: t.visible ? 1 : 0, scale: t.visible ? 1 : 0.9 }}
        transition={{ duration: 0.2 }}
        style={{
          borderRadius: "16px",
          background: theme.gradient,
          color: "#fff",
          padding: "10px 18px 10px 14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "grab",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        }}
      >
        <Icon path={theme.icon} size={0.8} />
        <span style={{ fontSize: "12px", fontWeight: 600, lineHeight: 1.4 }}>
          {message}
        </span>
      </motion.div>
    ),
    { duration: options?.duration ?? 6000 },
  );
}

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
