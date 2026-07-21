import React, { useState, useEffect } from "react";
import { Icon } from "@mdi/react";
import {
  mdiClose, mdiCurrencyUsd, mdiCheck, mdiCogOutline, mdiBank, mdiCash, mdiWalletOutline, mdiCalendar
} from "@mdi/js";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { Transaction, Category } from "../types";
import { iconMap } from "../lib/iconMap";

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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [wallet, setWallet] = useState("Ngân hàng");

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

  return (
    <AnimatePresence>
      {isOpen && transaction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
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
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-[0_-12px_48px_rgba(0,0,0,0.12)] p-6 max-h-[92vh] overflow-y-auto z-10"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-900 rounded-full" />
                <h2 className="text-base font-bold text-slate-800">Chỉnh Sửa Giao Dịch</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"
              >
                <Icon path={mdiClose} size={1} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-slate-50 rounded-[24px] p-5 border border-slate-100 text-center space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SỐ TIỀN GIAO DỊCH</label>
                <div className="flex items-center justify-center gap-1.5">
                  <Icon path={mdiCurrencyUsd} size={1.25} className="text-slate-400" />
                  <input
                    type="text"
                    required
                    value={amountStr}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0"
                    className="w-48 text-2xl font-black text-slate-900 focus:outline-none bg-transparent placeholder-slate-300 text-center"
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
                        <span className="text-[10px] font-bold">{cat.name}</span>
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
                        <span className="text-[10px] font-bold">{w.name}</span>
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
