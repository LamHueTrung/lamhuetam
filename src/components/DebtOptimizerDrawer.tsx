import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@mdi/react";
import {
  mdiClose,
  mdiCreation,
  mdiLightningBolt,
  mdiSnowflake,
  mdiPiggyBank,
  mdiCalendarCheck,
  mdiAlertOutline,
  mdiShieldCheckOutline,
  mdiCheckCircle,
  mdiClockOutline,
  mdiCurrencyUsd,
  mdiBank,
  mdiCreditCard,
  mdiArrowRight,
  mdiRefresh,
  mdiInformationOutline,
} from "@mdi/js";
import { motion, AnimatePresence } from "motion/react";
import { MLOptimizeDebtResponse } from "../types";

interface DebtOptimizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  result: MLOptimizeDebtResponse | null;
  onSelectStrategy: (strategy: "avalanche" | "snowball") => void;
  currentStrategy: "avalanche" | "snowball";
}

export default function DebtOptimizerDrawer({
  isOpen,
  onClose,
  isLoading,
  result,
  onSelectStrategy,
  currentStrategy,
}: DebtOptimizerDrawerProps) {
  const [filterMode, setFilterMode] = useState<"all" | "payment_only">(
    "payment_only",
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const scheduleList = result?.daily_schedule || [];
  const displaySchedule =
    filterMode === "payment_only"
      ? scheduleList.filter((item) => item.total_paid_today > 0)
      : scheduleList;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl z-10 flex flex-col h-full overflow-hidden border-l border-slate-200 dark:border-slate-800"
          >
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                  <Icon path={mdiCreation} size={1.1} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Kế Hoạch Trả Nợ Tối Ưu
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium">
                      Trợ lý AI
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tự động phân bổ dòng tiền giúp tiết kiệm lãi và tất toán sớm
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Icon path={mdiClose} size={0.9} />
              </button>
            </div>

            {/* Strategy Switcher Bar */}
            <div className="px-6 py-3 bg-indigo-50/50 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Phương pháp phân bổ:
              </div>
              <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onSelectStrategy("avalanche")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentStrategy === "avalanche"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon
                    path={mdiLightningBolt}
                    size={0.7}
                    className="text-amber-500"
                  />
                  Ưu tiên lãi cao
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onSelectStrategy("snowball")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentStrategy === "snowball"
                      ? "bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon
                    path={mdiSnowflake}
                    size={0.7}
                    className="text-cyan-500"
                  />
                  Xóa nợ nhỏ trước
                </button>
              </div>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 animate-spin">
                    <Icon path={mdiRefresh} size={1.8} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      Đang phân tích và tối ưu lộ trình...
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      Đang khớp dòng tiền 30 ngày để lập kế hoạch trả nợ tiết
                      kiệm và an toàn nhất cho bạn.
                    </p>
                  </div>
                </div>
              ) : !result ? (
                <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
                  Chưa có dữ liệu kế hoạch. Vui lòng bấm tính toán lại.
                </div>
              ) : (
                <>
                  {/* KPI Highlight Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-800/40">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <Icon path={mdiPiggyBank} size={0.8} />
                        Dự kiến tiết kiệm tiền lãi
                      </div>
                      <div className="mt-2 text-xl font-black text-emerald-900 dark:text-emerald-200">
                        {formatVND(result.total_interest_saved || 0)}
                      </div>
                      <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400/80">
                        So với thanh toán tối thiểu thông thường
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-800/40">
                      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                        <Icon path={mdiShieldCheckOutline} size={0.8} />
                        Quỹ dự phòng an toàn
                      </div>
                      <div className="mt-2 text-xl font-black text-indigo-900 dark:text-indigo-200">
                        {formatVND(result.min_balance_threshold_applied || 0)}
                      </div>
                      <div className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400/80">
                        Duy trì số dư tối thiểu để sinh hoạt
                      </div>
                    </div>
                  </div>

                  {/* Warnings Alert */}
                  {result.warnings && result.warnings.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
                      <Icon
                        path={mdiAlertOutline}
                        size={1}
                        className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                      />
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                          Cảnh báo rủi ro dòng tiền
                        </h5>
                        {result.warnings.map((w, idx) => (
                          <p
                            key={idx}
                            className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed"
                          >
                            • {w}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Debt Summary Cards */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Tình trạng các khoản nợ (Chu kỳ {result.horizon_days}{" "}
                        ngày)
                      </h4>
                      <span className="text-xs font-medium text-slate-500">
                        {result.debt_summary?.length || 0} khoản nợ
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {result.debt_summary?.map((debt) => (
                        <div
                          key={debt.debt_id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                              {debt.debt_name}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                debt.status === "paid_off"
                                  ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                                  : "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                              }`}
                            >
                              {debt.status === "paid_off"
                                ? "Đã tất toán"
                                : "Đang trả dần"}
                            </span>
                          </div>

                          <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                            <div className="flex justify-between">
                              <span>Tổng trả trong kỳ:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatVND(debt.total_paid)}
                              </span>
                            </div>
                            {debt.payoff_date && (
                              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                                <span>Dự kiến tất toán:</span>
                                <span>{debt.payoff_date}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Daily Schedule Timeline */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Icon path={mdiCalendarCheck} size={0.7} />
                        Lộ trình
                      </h4>

                      <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px]">
                        <button
                          type="button"
                          onClick={() => setFilterMode("payment_only")}
                          className={`px-2 py-1 rounded-md transition font-medium ${
                            filterMode === "payment_only"
                              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          Chỉ ngày cần thanh toán
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterMode("all")}
                          className={`px-2 py-1 rounded-md transition font-medium ${
                            filterMode === "all"
                              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          Tất cả {scheduleList.length} ngày
                        </button>
                      </div>
                    </div>

                    {displaySchedule.length === 0 ? (
                      <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                        Không có ngày nào cần thanh toán nợ trong điều kiện lọc
                        này.
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-4 space-y-4">
                        {displaySchedule.map((item, idx) => {
                          const hasPayment = item.total_paid_today > 0;
                          return (
                            <div key={idx} className="relative group">
                              {/* Dot on line */}
                              <div
                                className={`absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 transition ${
                                  hasPayment
                                    ? "bg-indigo-600 dark:bg-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-950"
                                    : "bg-slate-300 dark:bg-slate-700"
                                }`}
                              />

                              <div
                                className={`p-3.5 rounded-xl border transition ${
                                  hasPayment
                                    ? "bg-white dark:bg-slate-800/80 border-indigo-100 dark:border-indigo-900/40 shadow-xs"
                                    : "bg-slate-50/40 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800/50"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                                      {item.date}
                                    </span>
                                    {item.is_safe ? (
                                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                        An toàn
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                                        Cần lưu ý
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-right text-[11px] text-slate-500">
                                    Số dư còn lại:{" "}
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                      {formatVND(item.balance_after_payment)}
                                    </span>
                                  </div>
                                </div>

                                {hasPayment ? (
                                  <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                                    {item.payments.map((p, pIdx) => (
                                      <div
                                        key={pIdx}
                                        className="flex items-center justify-between text-xs bg-indigo-50/50 dark:bg-indigo-950/30 px-2.5 py-1.5 rounded-lg"
                                      >
                                        <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200 font-medium">
                                          <Icon
                                            path={mdiCreditCard}
                                            size={0.6}
                                            className="text-indigo-500"
                                          />
                                          {p.debt_name}
                                        </div>
                                        <div className="font-bold text-indigo-700 dark:text-indigo-400">
                                          {formatVND(p.amount)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                                    Duy trì chi tiêu sinh hoạt bình thường,
                                    không cần trả nợ ngày này.
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Icon path={mdiInformationOutline} size={0.7} />
                <span>
                  Dữ liệu thời gian thực • Tính toán theo số dư mới nhất
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl hover:opacity-90 transition"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
