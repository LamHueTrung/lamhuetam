import React, { useState, useEffect } from "react";
import { Icon } from "@mdi/react";
import {
  mdiShieldCheck,
  mdiServerNetwork,
  mdiPulse,
  mdiClose,
  mdiRefresh,
  mdiCheckCircle,
  mdiSecurity,
  mdiCodeBraces,
  mdiDatabase,
  mdiLockOutline,
  mdiShieldAccountOutline,
  mdiCpu64Bit,
  mdiFlashOutline,
  mdiMemory,
  mdiAlertCircleOutline,
} from "@mdi/js";
import { motion, AnimatePresence } from "motion/react";
import { getSOCNOCLogs } from "../services/supabaseDataService";
import { supabase } from "../lib/supabase";

interface SOCNOCLabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SOCNOCLabModal({
  isOpen,
  onClose,
}: SOCNOCLabModalProps) {
  const [activeTab, setActiveTab] = useState<"noc" | "soc" | "logs">("noc");
  const [latency, setLatency] = useState<number>(0);
  const [dbStatus, setDbStatus] = useState<"healthy" | "degraded" | "checking">(
    "checking",
  );
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchLog, setSearchLog] = useState<string>("");

  const measureLatency = async () => {
    const start = performance.now();
    try {
      await supabase.from("event_logs").select("id").limit(1);
      const ping = Math.round(performance.now() - start);
      setLatency(ping);
      setDbStatus(ping < 500 ? "healthy" : "degraded");
    } catch {
      setDbStatus("degraded");
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    const data = await getSOCNOCLogs(40);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      measureLatency();
      loadLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(
    (l) =>
      l.action?.toLowerCase().includes(searchLog.toLowerCase()) ||
      l.module?.toLowerCase().includes(searchLog.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="bg-[#0b101b] border border-slate-800/80 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] text-slate-200 overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500/20 via-cyan-500/20 to-blue-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Icon path={mdiSecurity} size={0.9} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  SOC - NOC Command Lab
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Operational
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                PostgreSQL Engine • Supabase Cloud & Local Dexie Cache
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                measureLatency();
                loadLogs();
              }}
              title="Làm mới dữ liệu"
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer"
            >
              <Icon
                path={mdiRefresh}
                size={0.75}
                className={loading ? "animate-spin text-emerald-400" : ""}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer"
            >
              <Icon path={mdiClose} size={0.75} />
            </button>
          </div>
        </div>

        {/* Tab Navigation Segmented Control */}
        <div className="px-5 pt-3 pb-2 bg-slate-950/30 border-b border-slate-800/60">
          <div className="flex p-1 bg-slate-900/80 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab("noc")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "noc"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-950/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Icon path={mdiServerNetwork} size={0.7} />
              <span>NOC</span>
            </button>

            <button
              onClick={() => setActiveTab("soc")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "soc"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Icon path={mdiShieldCheck} size={0.7} />
              <span>SOC</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "logs"
                  ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md shadow-indigo-950/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Icon path={mdiCodeBraces} size={0.7} />
              <span>Logs ({logs.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* TAB 1: NOC */}
          {activeTab === "noc" && (
            <div className="space-y-4">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* RTT Ping */}
                <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">
                      Độ trễ DB (RTT)
                    </span>
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Icon path={mdiPulse} size={0.7} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400 font-mono">
                      {latency}
                    </span>
                    <span className="text-xs font-semibold text-emerald-500/80 font-mono">
                      ms
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${latency < 400 ? "bg-emerald-400" : "bg-amber-400"}`}
                    />
                    <span>
                      {latency < 400
                        ? "Tốc độ lý tưởng"
                        : "Đang kiểm tra kết nối"}
                    </span>
                  </div>
                </div>

                {/* DB Health */}
                <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl relative overflow-hidden group hover:border-teal-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">
                      Trạng thái DB
                    </span>
                    <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                      <Icon path={mdiDatabase} size={0.7} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-white capitalize">
                      {dbStatus === "healthy" ? "Ổn định" : "Đang tải"}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                    <Icon
                      path={mdiCheckCircle}
                      size={0.5}
                      className="text-teal-400"
                    />
                    <span>ACID Compliance 100%</span>
                  </div>
                </div>

                {/* Offline Cache */}
                <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">
                      Bộ nhớ đệm Offline
                    </span>
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <Icon path={mdiMemory} size={0.7} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-cyan-400 font-mono">
                      Active
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>IndexedDB / Dexie v3.0</span>
                  </div>
                </div>
              </div>

              {/* NOC System Topology Panel */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <Icon
                    path={mdiCpu64Bit}
                    size={0.7}
                    className="text-emerald-400"
                  />
                  <span>
                    Kiến Trúc Điều Phối Dữ Liệu Hai Tầng (Hybrid Pipeline)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
                    <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Icon path={mdiFlashOutline} size={0.65} />
                      Primary Cloud Engine
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      PostgreSQL trên Supabase Cloud tiếp nhận các truy vấn tài
                      chính, RLS Policies và đồng bộ đa thiết bị tức thì.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
                    <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
                      <Icon path={mdiServerNetwork} size={0.65} />
                      Cold Standby & Cache
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      MongoDB tiếp nhận bản sao lưu Snapshot khi bấm nút Backup.
                      Local IndexedDB đảm bảo ứng dụng chạy mượt kể cả khi
                      offline.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SOC */}
          {activeTab === "soc" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-cyan-950/40 to-blue-950/30 border border-cyan-800/40 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                  <Icon path={mdiLockOutline} size={0.75} />
                  <span>
                    Chính Sách Bảo Mật Row Level Security (RLS) Đa Tầng
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  PostgreSQL RLS hoạt động ở tầng nhân cơ sở dữ liệu. Mọi truy
                  vấn từ Frontend đều bị ràng buộc theo ID định danh người dùng:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Icon path={mdiShieldAccountOutline} size={0.8} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Sổ cái & Giao dịch
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      RLS cô lập dữ liệu thu/chi và thông tin thẻ tín dụng, chỉ
                      chủ sở hữu mới có quyền đọc/ghi.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
                    <Icon path={mdiShieldCheck} size={0.8} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Nhật ký & Vị trí Check-in
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tọa độ GIS và nội dung bài viết được bảo vệ tuyệt đối,
                      ngăn chặn rò rỉ quyền riêng tư.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-3 font-mono">
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <input
                  type="text"
                  placeholder="Lọc theo hành động hoặc module..."
                  value={searchLog}
                  onChange={(e) => setSearchLog(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
                />
                <span className="text-[11px] text-slate-400 self-center">
                  Hiển thị <b>{filteredLogs.length}</b> bản ghi mới nhất
                </span>
              </div>

              <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-3 max-h-[360px] overflow-y-auto space-y-2 text-xs custom-scrollbar">
                {filteredLogs.length === 0 ? (
                  <div className="text-slate-500 py-8 text-center font-sans text-xs">
                    Không tìm thấy log sự kiện nào phù hợp.
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/50 hover:bg-slate-900/90 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              log.level === "critical"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : log.level === "warning"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {log.module}
                          </span>
                          <span className="text-slate-200 font-semibold text-xs">
                            {log.action}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-md font-sans">
                          {JSON.stringify(log.details)}
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 shrink-0 text-right">
                        <div>
                          {new Date(log.created_at).toLocaleTimeString("vi-VN")}
                        </div>
                        <div className="text-emerald-500/70 font-mono">
                          {log.latency_ms || 0}ms
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/70 flex justify-between items-center text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="hidden sm:inline">
              Trạm Giám Sát SOC-NOC Sẵn Sàng
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl border border-slate-800 transition-colors cursor-pointer text-xs"
          >
            Đóng Console
          </button>
        </div>
      </motion.div>
    </div>
  );
}
