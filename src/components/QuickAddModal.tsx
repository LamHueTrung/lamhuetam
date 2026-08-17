import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@mdi/react";
import {
  mdiCurrencyUsd,
  mdiPlus,
  mdiMinus,
  mdiCogOutline,
  mdiBank,
  mdiCash,
  mdiWalletOutline,
  mdiCalendar,
  mdiAutoFix,
  mdiCheck,
  mdiClose,
} from "@mdi/js";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import { Transaction, Category } from "../types";
import { iconMap } from "../lib/iconMap";
import { getLocalDateString } from "../utils/date";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, "id">) => void;
  categories: Category[];
  onOpenCategoryManager: () => void;
}

const wallets = [
  { name: "Ngân hàng", icon: mdiBank },
  { name: "Tiền mặt", icon: mdiCash },
  { name: "Ví điện tử", icon: mdiWalletOutline },
];

export default function QuickAddModal({
  isOpen,
  onClose,
  onAddTransaction,
  categories: propCategories,
  onOpenCategoryManager,
}: QuickAddModalProps) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [category, setCategory] = useState("Ăn uống");
  const [wallet, setWallet] = useState("Ngân hàng");
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const dragControls = useDragControls();
  const [showKeypad, setShowKeypad] = useState(false);

  const handleKeypadPress = useCallback((key: string) => {
    setAmountStr((prev) => {
      let rawDigits = prev.replace(/\D/g, "");
      if (key === "C") return "";
      if (key === "BACK") {
        const nextDigits = rawDigits.slice(0, -1);
        return nextDigits
          ? new Intl.NumberFormat("vi-VN").format(parseInt(nextDigits, 10))
          : "";
      }
      if (key === "000") {
        if (!rawDigits || rawDigits === "0") return prev;
        const combined = rawDigits + "000";
        if (combined.length > 13) return prev;
        return new Intl.NumberFormat("vi-VN").format(parseInt(combined, 10));
      }
      if (rawDigits === "0") rawDigits = "";
      const combined = rawDigits + key;
      if (combined.length > 13) return prev;
      return new Intl.NumberFormat("vi-VN").format(parseInt(combined, 10));
    });
  }, []);

  const handleKeypadPreset = (val: number | string) => {
    if (typeof val === "number") {
      const currentRaw = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
      setAmountStr(new Intl.NumberFormat("vi-VN").format(currentRaw + val));
    } else {
      setAmountStr(new Intl.NumberFormat("vi-VN").format(parseInt(val, 10)));
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")
      ) {
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        handleKeypadPress(e.key);
      } else if (e.key === "Backspace") {
        handleKeypadPress("BACK");
      } else if (e.key === "Delete" || e.key.toLowerCase() === "c") {
        handleKeypadPress("C");
      } else if (e.key === "Enter") {
        if (showKeypad) setShowKeypad(false);
      } else if (e.key === "Escape") {
        if (showKeypad) {
          setShowKeypad(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showKeypad, handleKeypadPress, onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmountStr("");
      setDescription("");
      setSelectedDate(getLocalDateString());
      setWallet("Ngân hàng");
      if (propCategories.length > 0) {
        setCategory(propCategories[0].name);
      } else {
        setCategory("Ăn uống");
      }
      setShowKeypad(false);
    }
  }, [isOpen, propCategories]);

  // Auto-sync category when propCategories load
  useEffect(() => {
    if (
      propCategories.length > 0 &&
      !propCategories.some((c) => c.name === category)
    ) {
      setCategory(propCategories[0].name);
    }
  }, [propCategories]);


  // useEffect(() => {
  //   if (suggestTimer.current) clearTimeout(suggestTimer.current);
  //   if (
  //     !description.trim() ||
  //     type !== "expense" ||
  //     propCategories.length === 0
  //   )
  //     return;
  //   setAiSuggesting(true);
  //   suggestTimer.current = setTimeout(async () => {
  //     try {
  //       const response = await fetch("/.netlify/functions/gemini-advisor", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({
  //           promptType: "suggest-category",
  //           customMessage: description,
  //           categoryDescription: propCategories.map((c) => c.name),
  //         }),
  //       });
  //       const data = await response.json();
  //       if (
  //         data.text &&
  //         propCategories.some((c) => c.name === data.text.trim())
  //       ) {
  //         setCategory(data.text.trim());
  //       }
  //     } catch {
  //     } finally {
  //       setAiSuggesting(false);
  //     }
  //   }, 800);
  //   return () => {
  //     if (suggestTimer.current) clearTimeout(suggestTimer.current);
  //   };
  // }, [description, type]);

  const categories =
    propCategories.length > 0
      ? propCategories
          .sort((a, b) => a.order - b.order)
          .map((cat) => ({
            name: cat.name,
            icon: iconMap[cat.icon] || iconMap["Tag"],
            color: cat.color,
          }))
      : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = amountStr.replace(/\D/g, "");
    const amountNum = parseInt(cleanAmount, 10);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ!");
      return;
    }

    if (!selectedDate) {
      toast.error("Vui lòng chọn ngày giao dịch!");
      return;
    }

    const targetCategory =
      category || (propCategories.length > 0 ? propCategories[0].name : "Khác");

    onAddTransaction({
      type,
      amount: amountNum,
      category: targetCategory,
      date: selectedDate,
      description: description.trim() || `Giao dịch ${targetCategory}`,
      wallet: wallet || "Ngân hàng",
    });

    // Reset Form
    setAmountStr("");
    setDescription("");
    setSelectedDate(getLocalDateString());
    onClose();
  };

  // Manual keypress input formatting for Vietnamese locale style
  const handleAmountChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 13);
    if (!clean) {
      setAmountStr("");
      return;
    }
    const num = parseInt(clean, 10);
    if (isNaN(num)) {
      setAmountStr("");
      return;
    }
    const formatted = new Intl.NumberFormat("vi-VN").format(num);
    setAmountStr(formatted);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 overflow-hidden z-50 flex items-end justify-center">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md cursor-pointer"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 60 || info.velocity.y > 200) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] shadow-[0_-12px_48px_rgba(0,0,0,0.12)] dark:shadow-[0_-12px_48px_rgba(0,0,0,0.5)] max-h-[92vh] flex flex-col overflow-hidden z-10 border-t border-slate-100 dark:border-slate-800"
          >
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                dragControls.start(e);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              style={{ touchAction: "none" }}
              className="w-full pt-4 pb-3 px-6 cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-center gap-2 w-full">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <h2 className="text-base font-bold text-slate-800 dark:text-white">
                  Thêm Giao Dịch Thu / Chi
                </h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 pb-6 pt-2">
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center mb-6 border border-transparent dark:border-slate-700">
                <motion.button
                  type="button"
                  onClick={() => setType("expense")}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    type === "expense"
                      ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  <span>Khoản chi</span>
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setType("income")}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    type === "income"
                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span>Khoản thu</span>
                </motion.button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Số tiền (VNĐ)</span>
                    <span className="text-[9px] font-bold text-slate-400">Nhấn vào ô để nhập</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKeypad(true)}
                    className="w-full relative flex items-center cursor-pointer group"
                  >
                    <div className={`w-full text-left text-3xl font-extrabold bg-slate-50 dark:bg-slate-800/80 border rounded-2xl px-4 py-3.5 pr-16 transition-all tracking-tight select-none ${
                      amountStr
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-300 dark:text-slate-600"
                    } ${showKeypad ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 dark:border-slate-700 group-hover:border-blue-400"}`}>
                      {amountStr || "0"}
                    </div>
                    <span className="absolute right-4 text-xs font-bold text-slate-400 uppercase pointer-events-none">
                      đ
                    </span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Ghi chú / Tiêu đề
                  </label>
                  <input
                    type="text"
                    id="input-quick-add-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ví dụ: Đi ăn phở gia đình, mua sắm Tiki..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder-slate-400 transition-all"
                  />
                </div>
                {aiSuggesting && (
                  <p className="text-[9px] text-indigo-400 font-medium italic">
                    AI đang gợi ý danh mục...
                  </p>
                )}

                {/* DATE PICKER */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Chọn ngày
                  </label>
                  <div className="relative">
                    <Icon
                      path={mdiCalendar}
                      size={1}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50/80 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[20px] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* CATEGORY GRID LIST */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Chọn danh mục
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {categories.map((cat) => {
                      const colorMap: Record<string, string> = {
                        red: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100/80 border-red-100 dark:border-red-900/50",
                        amber:
                          "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100/80 border-amber-100 dark:border-amber-900/50",
                        blue: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100/80 border-blue-100 dark:border-blue-900/50",
                        teal: "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 hover:bg-teal-100/80 border-teal-100 dark:border-teal-900/50",
                        emerald:
                          "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/80 border-emerald-100 dark:border-emerald-900/50",
                        slate:
                          "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 border-slate-100 dark:border-slate-700",
                        indigo:
                          "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/80 border-indigo-100 dark:border-indigo-900/50",
                        rose: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100/80 border-rose-100 dark:border-rose-900/50",
                        purple:
                          "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100/80 border-purple-100 dark:border-purple-900/50",
                        orange:
                          "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 hover:bg-orange-100/80 border-orange-100 dark:border-orange-900/50",
                      };
                      const CatIcon = cat.icon;
                      const isSelected = category === cat.name;

                      return (
                        <motion.button
                          key={cat.name}
                          type="button"
                          onClick={() => setCategory(cat.name)}
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.02 }}
                          className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all duration-300 cursor-pointer ${
                            isSelected
                              ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900 shadow-md scale-105"
                              : colorMap[cat.color] || colorMap.slate
                          }`}
                        >
                          <CatIcon className="w-5 h-5" />
                          <span className="text-[10px] font-bold truncate w-full">
                            {cat.name}
                          </span>
                        </motion.button>
                      );
                    })}
                    {/* Plus button to add new category */}
                    <motion.button
                      type="button"
                      onClick={onOpenCategoryManager}
                      whileTap={{ scale: 0.95 }}
                      className="p-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Icon path={mdiCogOutline} size={1} />
                      <span className="text-[10px] font-bold">Quản lý</span>
                    </motion.button>
                  </div>
                </div>

                {/* SOURCE WALLET SELECTOR */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Ví thanh toán
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {wallets.map((w) => {
                      const isSelected = wallet === w.name;

                      return (
                        <motion.button
                          key={w.name}
                          type="button"
                          onClick={() => setWallet(w.name)}
                          whileTap={{ scale: 0.95 }}
                          className={`p-3 rounded-2xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900 shadow-sm"
                              : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          <Icon
                            path={w.icon}
                            size={0.875}
                            className="shrink-0"
                          />
                          <span className="text-[10px] font-bold truncate w-full">
                            {w.name}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <motion.button
                  type="submit"
                  id="btn-add-transaction-submit"
                  whileTap={{ scale: 0.96 }}
                  className={`w-full py-4 rounded-[22px] font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    type === "expense"
                      ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                  }`}
                >
                  <Icon
                    path={type === "expense" ? mdiMinus : mdiPlus}
                    size={1}
                  />
                  <span>
                    {type === "expense" ? "Lưu Khoản Chi" : "Lưu Khoản Thu"}
                  </span>
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
      {/* Numeric Keypad Bottom Sheet Portal */}
      {createPortal(
        <AnimatePresence>
          {showKeypad && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 overflow-hidden z-[99999] bg-slate-900/50 backdrop-blur-sm flex items-end justify-center"
              onClick={() => setShowKeypad(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 240 }}
                onClick={(e) => e.stopPropagation()}
                className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] p-5 shadow-2xl flex flex-col space-y-4 border-t border-slate-200 dark:border-slate-800 z-[99999]"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                      BÀN PHÍM SỐ
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-1">
                      Nhập số tiền giao dịch (VNĐ)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKeypad(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Icon path={mdiClose} size={0.75} />
                  </button>
                </div>

                {/* Display Value Box */}
                <div className="bg-slate-50 dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Số tiền
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate block">
                      {amountStr ? `${amountStr} đ` : "0 đ"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("C")}
                    className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Xóa hết
                  </button>
                </div>

                {/* Quick Presets Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { label: "+10k", val: 10000 },
                    { label: "+20k", val: 20000 },
                    { label: "+50k", val: 50000 },
                    { label: "+100k", val: 100000 },
                    { label: "+200k", val: 200000 },
                    { label: "+500k", val: 500000 },
                    { label: "+1tr", val: 1000000 },
                    { label: "+5tr", val: 5000000 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleKeypadPreset(p.val)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* 3x4 Keypad Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-lg font-black text-slate-800 dark:text-white transition-all cursor-pointer shadow-sm flex items-center justify-center"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("C")}
                    className="h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 active:scale-95 text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center"
                  >
                    C
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("0")}
                    className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-lg font-black text-slate-800 dark:text-white transition-all cursor-pointer shadow-sm flex items-center justify-center"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("000")}
                    className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-sm font-black text-slate-800 dark:text-white transition-all cursor-pointer shadow-sm flex items-center justify-center"
                  >
                    000
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("BACK")}
                    className="col-span-3 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-sm font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center justify-center gap-1 mt-1"
                  >
                    <span>⌫ Xóa ký tự cuối</span>
                  </button>
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  onClick={() => setShowKeypad(false)}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl hover:opacity-90 transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Icon path={mdiCheck} size={0.875} />
                  <span>Xác nhận</span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </AnimatePresence>
  );
}
