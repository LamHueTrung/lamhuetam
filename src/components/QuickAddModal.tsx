import React, { useState, useRef } from "react";
import { Icon } from "@mdi/react";
import {
  mdiClose, mdiCurrencyUsd, mdiAutoFix, mdiCamera,
  mdiLoading, mdiRefresh, mdiPlus, mdiCogOutline, mdiBank, mdiCash, mdiWalletOutline
} from "@mdi/js";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
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
  const [category, setCategory] = useState("Ăn uống");
  const [wallet, setWallet] = useState("Ngân hàng");
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'none' | 'weekly' | 'monthly'>('none');

  // OCR Scan state
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = propCategories.length > 0
    ? propCategories.sort((a, b) => a.order - b.order).map(cat => ({
        name: cat.name,
        icon: iconMap[cat.icon] || iconMap['Tag'],
        color: cat.color,
      }))
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amountStr.replace(/[^0-9]/g, ""));
    if (!amountNum || amountNum <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ!");
      return;
    }

    onAddTransaction({
      type,
      amount: amountNum,
      category,
      date: new Date().toISOString().split('T')[0],
      description: description || `Giao dịch ${category}`,
      wallet,
      isRecurring,
      frequency: isRecurring ? frequency : 'none'
    });

    // Reset Form
    setAmountStr("");
    setDescription("");
    setCategory("Ăn uống");
    setWallet("Ngân hàng");
    setIsRecurring(false);
    setFrequency('none');
    onClose();
  };

  // Run the OCR scanner via Gemini API backend
  const triggerOCRScan = async (base64Image: string | null, sampleName?: string) => {
    setIsScanning(true);
    try {
      const response = await fetch("/.netlify/functions/gemini-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          sampleName: sampleName
        })
      });

      if (!response.ok) {
        throw new Error("Lỗi bóc tách hóa đơn từ máy chủ");
      }

      const data = await response.json();
      if (data) {
        setAmountStr(new Intl.NumberFormat("vi-VN").format(data.amount));
        setCategory(data.category || "Mua sắm");
        setDescription(data.description || "Giao dịch bóc tách");
        setType('expense'); // Receipts are usually expenses
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        triggerOCRScan(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Manual keypress input formatting for Vietnamese locale style
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

          {/* Full-Screen Sheet Pop-up sliding from bottom */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-[0_-12px_48px_rgba(0,0,0,0.12)] p-6 max-h-[92vh] overflow-y-auto z-10"
          >
            {/* Grab handle top header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-900 rounded-full" />
                <h2 className="text-base font-bold text-slate-800">Ghi Chép Một Chạm</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"
              >
                <Icon path={mdiClose} size={1} />
              </button>
            </div>

            {/* Income / Expense Switch Pill */}
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

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* LARGE AMOUNT INPUT CONTAINER */}
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

              {/* INPUT DESCRIPTION */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ghi chú mô tả</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ví dụ: Đi ăn phở gia đình, mua sắm Tiki..."
                  className="w-full px-4 py-3 bg-slate-50/80 border border-slate-100 rounded-[20px] text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
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
                        <span className="text-[10px] font-bold">{cat.name}</span>
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
                        <span className="text-[10px] font-bold">{w.name}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* AUTOMATION & OCR PANEL */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-[24px] p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon path={mdiAutoFix} size={0.875} className="text-slate-900" />
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Scan AI OCR & Tự động hóa</span>
                  </div>

                  {/* File Upload Hidden Field */}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <motion.button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    whileTap={{ scale: 0.95 }}
                    className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {isScanning ? (
                      <Icon path={mdiLoading} size={0.75} className="animate-spin" />
                    ) : (
                      <Icon path={mdiCamera} size={0.75} />
                    )}
                    <span>Quét biên lai</span>
                  </motion.button>
                </div>

                {/* Simulated quick samples for fast validation */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 select-none">
                  <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">Quét mẫu:</span>
                  <motion.button
                    type="button"
                    onClick={() => triggerOCRScan(null, "starbucks")}
                    disabled={isScanning}
                    whileTap={{ scale: 0.93 }}
                    className="text-[9px] font-semibold bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer"
                  >
                    Starbucks
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => triggerOCRScan(null, "coopmart")}
                    disabled={isScanning}
                    whileTap={{ scale: 0.93 }}
                    className="text-[9px] font-semibold bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer"
                  >
                    Co.opmart
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => triggerOCRScan(null, "cgv")}
                    disabled={isScanning}
                    whileTap={{ scale: 0.93 }}
                    className="text-[9px] font-semibold bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer"
                  >
                    CGV Cinemas
                  </motion.button>
                </div>

                {/* RECURRING OPTIONS */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => {
                        setIsRecurring(e.target.checked);
                        if (e.target.checked) setFrequency('monthly');
                        else setFrequency('none');
                      }}
                      className="w-4 h-4 text-slate-900 rounded border-slate-200 focus:ring-slate-900"
                    />
                    <span className="text-xs font-semibold text-slate-600">Đặt lịch định kỳ</span>
                  </label>

                  {isRecurring && (
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as any)}
                      className="text-xs font-bold text-slate-700 bg-white border border-slate-100 rounded-lg px-2 py-1 focus:outline-none"
                    >
                      <option value="weekly">Hàng tuần</option>
                      <option value="monthly">Hàng tháng (Tiền nhà, v.v)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <motion.button
                type="submit"
                id="btn-add-transaction-submit"
                disabled={isScanning}
                whileTap={{ scale: 0.96 }}
                className="w-full bg-slate-900 text-white py-4 rounded-[22px] font-bold text-sm shadow-[0_8px_24px_rgba(15,23,42,0.15)] hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isScanning ? (
                  <>
                    <Icon path={mdiRefresh} size={0.875} className="animate-spin" />
                    <span>AI đang phân tích hóa đơn...</span>
                  </>
                ) : (
                  <>
                    <Icon path={mdiPlus} size={1} />
                    <span>Lưu Giao Dịch</span>
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}