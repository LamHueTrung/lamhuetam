import React, { type ReactNode } from "react";
import toast, { Toaster, ToastBar } from "react-hot-toast";
import { motion } from "motion/react";
import { Icon } from "@mdi/react";
import {
  mdiAlertOutline,
  mdiCloseCircleOutline,
  mdiCheckCircleOutline,
  mdiInformationOutline,
  mdiClose,
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
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > 40 || Math.abs(info.velocity.x) > 200) {
            toast.dismiss(t.id);
          }
        }}
        animate={{ opacity: t.visible ? 1 : 0, scale: t.visible ? 1 : 0.9 }}
        transition={{ duration: 0.2 }}
        className="select-none active:cursor-grabbing"
        style={{
          borderRadius: "16px",
          background: theme.gradient,
          color: "#fff",
          padding: "10px 14px 10px 14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "grab",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          touchAction: "pan-y",
          maxWidth: "92vw",
        }}
      >
        <Icon path={theme.icon} size={0.8} className="shrink-0" />
        <span style={{ fontSize: "12px", fontWeight: 600, lineHeight: 1.4 }} className="flex-1">
          {message}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(t.id);
          }}
          className="p-1 rounded-full hover:bg-black/20 active:scale-90 transition-all opacity-80 hover:opacity-100 flex items-center justify-center cursor-pointer shrink-0"
          title="Đóng thông báo"
        >
          <Icon path={mdiClose} size={0.65} />
        </button>
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
        containerStyle={{
          zIndex: 999999999,
        }}
        toastOptions={{
          style: {
            borderRadius: "16px",
            background: "#1E293B",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 500,
            padding: "10px 14px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
          },
          success: {
            iconTheme: { primary: "#10B981", secondary: "#fff" },
          },
          error: {
            iconTheme: { primary: "#EF4444", secondary: "#fff" },
          },
          duration: 3500,
        }}
      >
        {(t) => (
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 40 || Math.abs(info.velocity.x) > 200) {
                toast.dismiss(t.id);
              }
            }}
            onClick={() => {
              if (t.type !== "loading") {
                toast.dismiss(t.id);
              }
            }}
            animate={{
              opacity: t.visible ? 1 : 0,
              scale: t.visible ? 1 : 0.9,
            }}
            transition={{ duration: 0.15 }}
            style={{
              touchAction: "pan-y",
              cursor: "pointer",
            }}
          >
            <ToastBar
              toast={t}
              style={{
                ...t.style,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                pointerEvents: "auto",
              }}
            >
              {({ icon, message }) => (
                <div className="flex items-center gap-2.5 w-full">
                  {icon}
                  <div className="flex-1 text-xs md:text-sm font-medium leading-snug">{message}</div>
                  {t.type !== "loading" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.dismiss(t.id);
                      }}
                      className="p-1 -mr-1.5 rounded-full hover:bg-white/20 active:scale-90 text-white/70 hover:text-white transition-all flex items-center justify-center cursor-pointer shrink-0"
                      title="Đóng thông báo"
                      aria-label="Đóng thông báo"
                    >
                      <Icon path={mdiClose} size={0.65} />
                    </button>
                  )}
                </div>
              )}
            </ToastBar>
          </motion.div>
        )}
      </Toaster>
    </>
  );
}
