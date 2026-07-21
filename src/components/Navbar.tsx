import React from "react";
import { Icon } from "@mdi/react";
import { mdiHome, mdiReceiptTextCheckOutline, mdiPlus, mdiSwapHorizontal, mdiAutoFix } from "@mdi/js";
import { motion } from "motion/react";

interface NavbarProps {
  currentTab: number;
  setCurrentTab: (tab: number) => void;
  onOpenQuickAdd: () => void;
}

export default function Navbar({ currentTab, setCurrentTab, onOpenQuickAdd }: NavbarProps) {
  const tabs = [
    { id: 1, label: "Tổng quan", icon: mdiHome },
    { id: 2, label: "Sổ cái", icon: mdiReceiptTextCheckOutline },
    { id: 3, label: "Thêm nhanh", icon: mdiPlus, isFab: true },
    { id: 4, label: "Tài chính", icon: mdiSwapHorizontal },
    { id: 5, label: "Cố vấn AI", icon: mdiAutoFix },
  ];

  return (
    <div id="bottom-navbar" className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-2 bg-gradient-to-t from-slate-50/90 dark:from-slate-900/90 to-transparent pointer-events-none">
      <div className="max-w-md mx-auto bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.3)] px-2 py-2 flex items-center justify-between pointer-events-auto">
        {tabs.map((tab) => {
          if (tab.isFab) {
            return (
              <motion.button
                key={tab.id}
                id="btn-fab-add"
                onClick={onOpenQuickAdd}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92, rotate: 15 }}
                className="relative -top-4 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(15,23,42,0.25)] transition-all cursor-pointer group"
                aria-label={tab.label}
              >
                <Icon path={tab.icon} size={1.75} className="group-hover:rotate-90 transition-transform duration-300" />
                <span className="absolute -bottom-6 text-[10px] font-medium text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {tab.label}
                </span>
              </motion.button>
            );
          }

          const isActive = currentTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => setCurrentTab(tab.id)}
              whileTap={{ scale: 0.9 }}
              className="flex-1 flex flex-col items-center justify-center py-2 relative cursor-pointer group"
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? "bg-slate-100/80 text-slate-900 scale-110" : "text-slate-400 group-hover:text-slate-600"}`}>
                <Icon path={tab.icon} size={1.25} />
              </div>
              <span className={`text-[10px] font-medium mt-0.5 transition-all ${isActive ? "text-slate-900 scale-105" : "text-slate-400 group-hover:text-slate-600"}`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.span layoutId="active-tab-indicator" className="absolute bottom-0 w-1.5 h-1.5 bg-slate-900 rounded-full" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}