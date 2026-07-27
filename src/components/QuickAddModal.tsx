import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@mdi/react";
import {
  mdiCurrencyUsd, mdiPlus, mdiCogOutline, mdiBank, mdiCash, mdiWalletOutline, mdiCalendar, mdiAutoFix
} from "@mdi/js";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import { Transaction, Category } from "../types";
import { iconMap } from "../lib/iconMap";

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
  { name: "Ví điện tử", icon: mdiWalletOutline }
];

export default function QuickAddModal({ isOpen, onClose, onAddTransaction, categories: propCategories, onOpenCategoryManager }: QuickAddModalProps) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState("Ăn uống");
  const [wallet, setWallet] = useState("Ngân hàng");
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dragControls = useDragControls();

  // Auto-sync category when propCategories load
  useEffect(() => {
    if (propCategories.length > 0 && !propCategories.some(c => c.name === category)) {
      setCategory(propCategories[0].name);
    }
  }, [propCategories]);

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
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!description.trim() || type !== 'expense' || propCategories.length === 0) return;
    setAiSuggesting(true);
    suggestTimer.current = setTimeout(async () => {
      try {
        const response = await fetch("/.netlify/functions/gemini-advisor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            promptType: 'suggest-category',
            customMessage: description,
            categoryDescription: propCategories.map(c => c.name),
          }),
        });
        const data = await response.json();
        if (data.text && propCategories.some(c => c.name === data.text.trim())) {
          setCategory(data.text.trim());
        }
      } catch { } finally {
        setAiSuggesting(false);
      }
    }, 800);
    return () => { if (suggestTimer.current) clearTimeout(suggestTimer.current); };
  }, [description, type]);

  const categories = propCategories.length > 0
    ? propCategories.sort((a, b) => a.order - b.order).map(cat => ({
        name: cat.name,
        icon: iconMap[cat.icon] || iconMap['Tag'],
        color: cat.color,
      }))
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = amountStr.replace(/\D/g, "");
    const amountNum = parseFloat(cleanAmount);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ!");
      return;
    }

    if (!selectedDate) {
      toast.error("Vui lòng chọn ngày giao dịch!");
      return;
    }

    const targetCategory = category || (propCategories.length > 0 ? propCategories[0].name : "Khác");

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
    setSelectedDate(new Date().toISOString().split('T')[0]);
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
        <div className="fixed inset-0 z-50 flex items-end justify-center">
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
            className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-[0_-12px_48px_rgba(0,0,0,0.12)] max-h-[92vh] flex flex-col overflow-hidden z-10"
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
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-slate-900 rounded-full animate-pulse" />
                <h2 className="text-base font-bold text-slate-800">Ghi Chép Một Chạm</h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-2">
              <div className="bg-slate-100 p-1 rounded-2xl flex items-center mb-6">
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

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Số tiền (VNĐ)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      id="input-quick-add-amount"
                      value={amountStr}
                      onKeyDown={handleAmountKeyDown}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0"
                      className="w-full text-3xl font-extrabold text-slate-900 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder-slate-300 transition-all tracking-tight"
                    />
                    <span className="absolute right-4 text-xs font-bold text-slate-400 uppercase">
                      k (nghìn)
                    </span>
                  </div>
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
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder-slate-400 transition-all"
                  />
                </div>
                {aiSuggesting && (
                  <p className="text-[9px] text-indigo-400 font-medium italic">AI đang gợi ý danh mục...</p>
                )}

              {/* DATE PICKER */}
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

              {/* CATEGORY GRID LIST */}
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
                  {/* Plus button to add new category */}
                  <motion.button
                    type="button"
                    onClick={onOpenCategoryManager}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 rounded-2xl border border-dashed border-slate-200 bg-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Icon path={mdiCogOutline} size={1} />
                    <span className="text-[10px] font-bold">Quản lý</span>
                  </motion.button>
                </div>
              </div>

              {/* SOURCE WALLET SELECTOR */}
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

              {/* SUBMIT BUTTON */}
              <motion.button
                type="submit"
                id="btn-add-transaction-submit"
                whileTap={{ scale: 0.96 }}
                className="w-full bg-slate-900 text-white py-4 rounded-[22px] font-bold text-sm shadow-[0_8px_24px_rgba(15,23,42,0.15)] hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Icon path={mdiPlus} size={1} />
                <span>Lưu Giao Dịch</span>
              </motion.button>
            </form>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}