import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@mdi/react";
import {
  mdiCurrencyUsd, mdiCheck, mdiCogOutline, mdiBank, mdiCash, mdiWalletOutline, mdiCalendar, mdiClose
} from "@mdi/js";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import { Transaction, Category } from "../types";
import { iconMap } from "../lib/iconMap";

import { getLocalDateString } from "../utils/date";

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onUpdateTransaction: (id: string, data: Partial<Transaction>) => void;
}

const wallets = [
  { name: "Ngân hàng", icon: mdiBank },
  { name: "Tiền mặt", icon: mdiCash },
  { name: "Ví điện tử", icon: mdiWalletOutline }
];

export default function EditTransactionModal({ isOpen, transaction, categories: propCategories, onClose, onUpdateTransaction }: EditTransactionModalProps) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amountStr, setAmountStr] = useState("");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [wallet, setWallet] = useState("Ngân hàng");
  const dragControls = useDragControls();
  const [showKeypad, setShowKeypad] = useState(false);

  const handleKeypadPress = useCallback((key: string) => {
    setAmountStr((prev) => {
      let rawDigits = prev.replace(/\D/g, "");
      if (key === "C") return "";
      if (key === "BACK") {
        const nextDigits = rawDigits.slice(0, -1);
        return nextDigits ? new Intl.NumberFormat("vi-VN").format(parseInt(nextDigits, 10)) : "";
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
    if (!showKeypad) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleKeypadPress(e.key);
      } else if (e.key === "Backspace") {
        handleKeypadPress("BACK");
      } else if (e.key === "Delete" || e.key.toLowerCase() === "c") {
        handleKeypadPress("C");
      } else if (e.key === "Enter" || e.key === "Escape") {
        setShowKeypad(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showKeypad, handleKeypadPress]);

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter", "Escape", "Home", "End", "Unidentified", "Process"].includes(e.key) ||
      e.ctrlKey ||
      e.metaKey ||
      e.key.length > 1
    ) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmountStr(new Intl.NumberFormat("vi-VN").format(transaction.amount));
      setSelectedDate(transaction.date);
      setDescription(transaction.description);
      setCategory(transaction.category);
      setWallet(transaction.wallet);
    }
  }, [transaction]);

  const categories = propCategories.length > 0
    ? propCategories.sort((a, b) => a.order - b.order).map(cat => ({
        name: cat.name,
        icon: iconMap[cat.icon] || iconMap['Tag'],
        color: cat.color,
      }))
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    const amountNum = parseFloat(amountStr.replace(/[^0-9]/g, ""));
    if (!amountNum || amountNum <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ!");
      return;
    }

    onUpdateTransaction(transaction.id, {
      type,
      amount: amountNum,
      category,
      date: selectedDate,
      description: description || `Giao dịch ${category}`,
      wallet,
    });

    onClose();
  };

  const handleAmountChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    if (!clean) {
      setAmountStr("");
      return;
    }
    const formatted = new Intl.NumberFormat("vi-VN").format(parseInt(clean));
    setAmountStr(formatted);
  };

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && transaction && (
          <div className="fixed inset-0 overflow-hidden z-50 flex items-end justify-center">
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
            className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white rounded-t-[32px] shadow-[0_-12px_48px_rgba(0,0,0,0.12)] max-h-[92vh] flex flex-col overflow-hidden z-10"
          >
            {/* Draggable Header Section */}
            <div
              onPointerDown={(e) => { e.stopPropagation(); dragControls.start(e); }}
              onTouchStart={(e) => { e.stopPropagation(); }}
              style={{ touchAction: "none" }}
              className="w-full pt-4 pb-3 px-6 cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-slate-900 rounded-full animate-pulse" />
                <h2 className="text-base font-bold text-slate-800">Chỉnh Sửa Giao Dịch</h2>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 pb-6 pt-2">
              <form onSubmit={handleSubmit} className="space-y-6">
              <div
                onClick={() => setShowKeypad(true)}
                className="bg-slate-50 rounded-[24px] p-5 border border-slate-200 text-center space-y-2 cursor-pointer group hover:border-blue-500 transition-colors"
              >
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center justify-center gap-1">
                  <span>SỐ TIỀN GIAO DỊCH</span>
                  <span className="text-[8px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                    Bàn phím số 🔢
                  </span>
                </label>
                <div className="flex items-center justify-center gap-1.5">
                  <Icon path={mdiCurrencyUsd} size={1.25} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    readOnly
                    value={amountStr}
                    placeholder="0"
                    className="w-48 text-2xl font-black text-slate-900 focus:outline-none bg-transparent placeholder-slate-300 text-center cursor-pointer"
                  />
                  <span className="text-lg font-extrabold text-slate-500">₫</span>
                </div>
              </div>

              <div className="bg-slate-100 p-1 rounded-2xl flex items-center">
                <motion.button
                  type="button"
                  onClick={() => setType('expense')}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    type === 'expense'
                      ? "bg-white text-rose-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Khoản chi
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setType('income')}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    type === 'income'
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Khoản thu
                </motion.button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ghi chú mô tả</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả giao dịch..."
                  className="w-full px-4 py-3 bg-slate-50/80 border border-slate-100 rounded-[20px] text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chọn ngày</label>
                <div className="relative">
                  <Icon path={mdiCalendar} size={1} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/80 border border-slate-100 rounded-[20px] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 [color-scheme:light]"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chọn danh mục</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {categories.map((cat) => {
                    const colorMap: Record<string, string> = {
                      red: 'bg-red-50 text-red-600 hover:bg-red-100/80 border-red-100',
                      amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100/80 border-amber-100',
                      blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100/80 border-blue-100',
                      teal: 'bg-teal-50 text-teal-600 hover:bg-teal-100/80 border-teal-100',
                      emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100/80 border-emerald-100',
                      slate: 'bg-slate-50 text-slate-600 hover:bg-slate-100/80 border-slate-100',
                      indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100/80 border-indigo-100',
                      rose: 'bg-rose-50 text-rose-600 hover:bg-rose-100/80 border-rose-100',
                      purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100/80 border-purple-100',
                      orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100/80 border-orange-100',
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
                            ? "bg-slate-900 border-slate-900 text-white shadow-md scale-105"
                            : colorMap[cat.color] || colorMap.slate
                        }`}
                      >
                        <CatIcon className="w-5 h-5" />
                        <span className="text-[10px] font-bold truncate w-full">{cat.name}</span>
                      </motion.button>
                    );
                  })}
                  <motion.button
                    type="button"
                    onClick={() => {}}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 rounded-2xl border border-dashed border-slate-200 bg-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Icon path={mdiCogOutline} size={1} />
                    <span className="text-[10px] font-bold">Quản lý</span>
                  </motion.button>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ví thanh toán</label>
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
                            ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                            : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <Icon path={w.icon} size={0.875} className="shrink-0" />
                        <span className="text-[10px] font-bold truncate w-full">{w.name}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.96 }}
                className="w-full bg-slate-900 text-white py-4 rounded-[22px] font-bold text-sm shadow-[0_8px_24px_rgba(15,23,42,0.15)] hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Icon path={mdiCheck} size={1} />
                <span>Cập Nhật Giao Dịch</span>
              </motion.button>
            </form>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Numeric Keypad Bottom Sheet */}
    <AnimatePresence>
      {showKeypad && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 overflow-hidden z-[60] bg-slate-900/50 backdrop-blur-sm flex items-end justify-center"
              onClick={() => setShowKeypad(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 240 }}
                onClick={(e) => e.stopPropagation()}
                className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] p-5 shadow-2xl flex flex-col space-y-4 border-t border-slate-200 dark:border-slate-800 z-[60]"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                      BÀN PHÍM SỐ
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-1">
                      Sửa số tiền giao dịch (VNĐ)
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
                      Số tiền hiện tại
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
        </AnimatePresence>
    </>,
    document.body
  );
}
