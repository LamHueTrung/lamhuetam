import React, { useState } from "react";
import { Icon } from "@mdi/react";
import {
  mdiMagnify, mdiTune, mdiPlusCircle, mdiMinusCircleOutline, mdiTagOutline,
  mdiDeleteOutline, mdiChevronLeft, mdiChevronRight, mdiWallet
} from "@mdi/js";
import { motion, AnimatePresence } from "motion/react";
import { Transaction, Category } from "../types";
import { iconMap } from "../lib/iconMap";

interface LedgerProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  categories: Category[];
}

const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function getDateLabel(dateStr: string) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Hôm nay';
  if (dateStr === yesterday) return 'Hôm qua';
  const d = new Date(dateStr + 'T00:00:00');
  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  return `${dayNames[d.getDay()]}, ${d.getDate()} Tháng ${d.getMonth() + 1}`;
}

function formatCurrency(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'tr';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
  return num.toString();
}

function formatVND(num: number) {
  const valueInK = Math.round(num / 1000);
  return new Intl.NumberFormat("vi-VN").format(valueInK) + "k";
}

export default function Ledger({ transactions, onDeleteTransaction, categories }: LedgerProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else { setCurrentMonth(currentMonth - 1); }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else { setCurrentMonth(currentMonth + 1); }
    setSelectedDate(null);
  };

  const todayStr = today.toISOString().split('T')[0];

  const pad = (n: number) => n.toString().padStart(2, '0');
  const makeDateStr = (day: number) => `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;

  const txsForDay = (day: number) => {
    const dateStr = makeDateStr(day);
    return transactions.filter(t => t.date === dateStr);
  };

  const dayTotals = (day: number) => {
    const txs = txsForDay(day);
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  };

  const selectedTxs = selectedDate
    ? transactions
        .filter(t => t.date === selectedDate)
        .filter(t => {
          if (filter === 'income') return t.type === 'income';
          if (filter === 'expense') return t.type === 'expense';
          return true;
        })
        .filter(t =>
          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : [];

  const selectedIncome = selectedTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const selectedExpense = selectedTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleItemClick = (id: string) => {
    setSwipedId(prev => prev === id ? null : id);
  };

  const monthName = firstDayOfMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4 pb-40">
      <div>
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">LỊCH SỬ GIAO DỊCH</span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Sổ Cái Nhật Ký</h1>
      </div>

      <div className="relative">
        <Icon path={mdiMagnify} size={1} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm kiếm giao dịch..."
          className="w-full pl-11 pr-4 py-3.5 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-[22px] text-[16px] focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder-slate-400 font-medium transition-all shadow-[0_4px_16px_rgba(0,0,0,0.01)]" />
      </div>

      <div className="flex items-center justify-between bg-white/80 border border-slate-100 rounded-[24px] px-5 py-3 shadow-sm">
        <button onClick={prevMonth} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer transition-all">
          <Icon path={mdiChevronLeft} size={1.25} />
        </button>
        <span className="text-sm font-bold text-slate-800">{monthName}</span>
        <button onClick={nextMonth} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer transition-all">
          <Icon path={mdiChevronRight} size={1.25} />
        </button>
      </div>

      <div className="bg-white/80 border border-slate-100 rounded-[24px] p-3 shadow-sm">
        <div className="grid grid-cols-7 mb-1">
          {dayNames.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square p-1" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = makeDateStr(day);
            const { income, expense } = dayTotals(day);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            return (
              <button key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`aspect-square p-1 rounded-[14px] flex flex-col items-center justify-center text-center transition-all cursor-pointer ${isSelected ? 'bg-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.15)]' : isToday ? 'bg-slate-100 hover:bg-slate-200' : 'hover:bg-slate-50'}`}>
                <span className={`text-[13px] font-bold leading-tight ${isSelected ? 'text-white' : isToday ? 'text-slate-900' : 'text-slate-700'}`}>{day}</span>
                {income > 0 && <span className={`text-[8px] font-bold leading-tight ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`}>+{formatCurrency(income)}</span>}
                {expense > 0 && <span className={`text-[8px] font-bold leading-tight ${isSelected ? 'text-rose-300' : 'text-rose-500'}`}>-{formatCurrency(expense)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
          <button onClick={() => setFilter("all")} className={`px-4 py-2.5 rounded-[20px] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${filter === "all" ? "bg-slate-900 text-white shadow-[0_6px_16px_rgba(15,23,42,0.15)]" : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"}`}>
            <Icon path={mdiTune} size={0.875} />
            <span>Tất cả</span>
          </button>
          <button onClick={() => setFilter("income")} className={`px-4 py-2.5 rounded-[20px] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${filter === "income" ? "bg-slate-900 text-white shadow-[0_6px_16px_rgba(15,23,42,0.15)]" : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"}`}>
            <Icon path={mdiPlusCircle} size={0.875} className="text-emerald-500" />
            <span>Khoản thu</span>
          </button>
          <button onClick={() => setFilter("expense")} className={`px-4 py-2.5 rounded-[20px] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${filter === "expense" ? "bg-slate-900 text-white shadow-[0_6px_16px_rgba(15,23,42,0.15)]" : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"}`}>
            <Icon path={mdiMinusCircleOutline} size={0.875} className="text-rose-500" />
            <span>Khoản chi</span>
          </button>
        </div>
      )}

      {selectedDate && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{getDateLabel(selectedDate)}</h3>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              {selectedIncome > 0 && <span className="text-emerald-600">+{formatVND(selectedIncome)}</span>}
              {selectedExpense > 0 && <span className="text-rose-500">-{formatVND(selectedExpense)}</span>}
            </div>
          </div>

          {selectedTxs.length === 0 ? (
            <div className="bg-white/60 border border-slate-100 rounded-[28px] p-8 text-center text-slate-400">
              <Icon path={mdiTagOutline} size={2} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">Không có giao dịch nào</p>
            </div>
          ) : (
            <div className="space-y-[1px] bg-slate-100/50 rounded-[20px] overflow-hidden">
              <AnimatePresence initial={false}>
                {selectedTxs.map((transaction, idx) => {
                  const getCategoryMeta = (catName: string) => {
                    const cat = categories.find(c => c.name === catName);
                    const colorMap: Record<string, string> = {
                      red: 'bg-red-100/80 text-red-700', amber: 'bg-amber-100/80 text-amber-700', blue: 'bg-blue-100/80 text-blue-700',
                      teal: 'bg-teal-100/80 text-teal-700', emerald: 'bg-emerald-100/80 text-emerald-700', slate: 'bg-slate-100/80 text-slate-700',
                      indigo: 'bg-indigo-100/80 text-indigo-700', rose: 'bg-rose-100/80 text-rose-700', purple: 'bg-purple-100/80 text-purple-700',
                      orange: 'bg-orange-100/80 text-orange-700',
                    };
                    const iconKey = cat?.icon || 'Tag';
                    const color = cat?.color || 'slate';
                    const bgColor = colorMap[color] || colorMap.slate;
                    const IconComp = iconMap[iconKey];
                    return { icon: IconComp, bg: bgColor.split(' ')[0], text: bgColor.split(' ')[1] };
                  };
                  const { icon: CatIcon, bg, text } = getCategoryMeta(transaction.category);
                  const isIncome = transaction.type === "income";
                  const isSwiped = swipedId === transaction.id;

                  return (
                    <div key={transaction.id} className="relative overflow-hidden">
                      <div className="absolute inset-y-0 right-0 w-20 bg-rose-500 flex items-center justify-center">
                        <button onClick={(e) => { e.stopPropagation(); onDeleteTransaction(transaction.id); setSwipedId(null); }}
                          className="w-full h-full text-white flex flex-col items-center justify-center gap-1 hover:bg-rose-600 transition-colors cursor-pointer">
                          <Icon path={mdiDeleteOutline} size={1.25} />
                          <span className="text-[10px] font-bold">Xóa</span>
                        </button>
                      </div>
                      <motion.div
                        drag="x" dragConstraints={{ left: -80, right: 0 }} dragElastic={0.1}
                        onDragEnd={(_, info) => { if (info.offset.x < -40) setSwipedId(transaction.id); else if (info.offset.x > 30) setSwipedId(null); }}
                        animate={{ x: isSwiped ? -80 : 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        onClick={() => handleItemClick(transaction.id)}
                        className={`bg-white p-4 flex items-center justify-between cursor-grab active:cursor-grabbing relative z-10 ${idx > 0 ? 'border-t border-slate-50' : ''}`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-11 h-11 rounded-full ${bg} ${text} flex items-center justify-center shrink-0`}>
                            {CatIcon && <CatIcon className="w-5 h-5" />}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-slate-800">{transaction.description}</h4>
                              {transaction.isRecurring && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded-full font-bold">Định kỳ</span>}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                              <span className="flex items-center gap-0.5">
                                <Icon path={mdiWallet} size={0.75} />
                                {transaction.wallet}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-extrabold ${isIncome ? "text-emerald-600" : "text-rose-500"}`}>
                            {isIncome ? "+" : "-"}{formatVND(transaction.amount)}
                          </span>
                          <span className="block text-[9px] text-slate-400 font-medium mt-0.5">{transaction.category}</span>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      <div className="text-center text-[10px] text-slate-400 font-semibold italic">
        * Chọn ngày trên lịch để xem chi tiết. Vuốt trái giao dịch để xóa.
      </div>
    </div>
  );
}