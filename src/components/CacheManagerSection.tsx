import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@mdi/react';
import {
  mdiHarddisk,
  mdiRefresh,
  mdiTrashCanOutline,
  mdiRobot,
  mdiDatabaseOutline,
  mdiLightningBoltOutline,
  mdiCheckCircle,
  mdiAlertCircleOutline,
  mdiShieldCheckOutline,
  mdiLayersOutline,
  mdiLoading,
  mdiInformationOutline,
  mdiChevronDown,
  mdiChevronRight,
  mdiServerNetwork,
  mdiFinance,
  mdiBookOpenVariant,
  mdiCreditCardOutline,
  mdiPiggyBankOutline,
  mdiTune,
} from '@mdi/js';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import {
  fetchFullStorageStats,
  formatBytes,
  clearAICache,
  clearPWACache,
  clearIndexedDBCache,
  quickCleanStorage,
  FullStorageStats,
} from '../utils/storageManager';

interface CacheManagerSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  onResyncRequired?: () => void;
}

export default function CacheManagerSection({
  isOpen,
  onToggle,
  onResyncRequired,
}: CacheManagerSectionProps) {
  const [stats, setStats] = useState<FullStorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    type: 'indexedDB' | 'pwa' | 'fullReset' | null;
    title: string;
    message: string;
    dangerLevel: 'medium' | 'high';
  }>({
    type: null,
    title: '',
    message: '',
    dangerLevel: 'medium',
  });

  const loadStats = useCallback(async (showToast = false) => {
    try {
      setIsLoading(true);
      const data = await fetchFullStorageStats();
      setStats(data);
      if (showToast) {
        toast.success('Đã làm mới thông tin bộ nhớ!', { id: 'cache-refresh' });
      }
    } catch (err) {
      console.error('Lỗi quét bộ nhớ:', err);
      if (showToast) {
        toast.error('Không thể quét thông tin bộ nhớ');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadStats(false);
    }
  }, [isOpen, loadStats]);

  // Handle Quick Clean (Safe)
  const handleQuickClean = async () => {
    try {
      setIsCleaning(true);
      const result = await quickCleanStorage();
      await loadStats(false);
      const sizeText = formatBytes(result.totalBytesCleaned);
      toast.success(
        `Dọn dẹp nhanh thành công! Đã giải phóng ~${sizeText} và dọn ${result.pwaCleaned} bộ nhớ tĩnh.`,
        { duration: 4000 }
      );
    } catch (err) {
      console.error('Lỗi dọn dẹp:', err);
      toast.error('Có lỗi xảy ra khi dọn dẹp bộ nhớ');
    } finally {
      setIsCleaning(false);
    }
  };

  // Handle Clear AI Cache only
  const handleClearAICache = async () => {
    try {
      setIsCleaning(true);
      const res = await clearAICache();
      await loadStats(false);
      toast.success(`Đã xóa ${res.count} mục đệm phân tích AI & Dự báo.`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa cache AI');
    } finally {
      setIsCleaning(false);
    }
  };

  // Handle Confirm Action Execution
  const handleExecuteConfirmedAction = async () => {
    const actionType = confirmModal.type;
    setConfirmModal({ type: null, title: '', message: '', dangerLevel: 'medium' });

    if (!actionType) return;

    try {
      setIsCleaning(true);
      if (actionType === 'pwa') {
        const count = await clearPWACache();
        await loadStats(false);
        toast.success(`Đã xóa ${count} cache PWA. Ứng dụng sẽ nạp lại tài nguyên mới.`);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else if (actionType === 'indexedDB') {
        await clearIndexedDBCache();
        await loadStats(false);
        toast.success('Đã xóa dữ liệu cục bộ IndexedDB.');
        if (onResyncRequired) {
          onResyncRequired();
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Thao tác không thành công');
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
      {/* Header Accordion */}
      <div
        onClick={onToggle}
        className={`flex items-center justify-between pb-3 ${
          !isOpen ? '' : 'border-b border-slate-100 dark:border-slate-800'
        } cursor-pointer select-none`}
      >
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400">
            <Icon path={mdiHarddisk} size={0.9} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Quản lý Bộ nhớ đệm & Dung lượng</span>
              {stats?.estimate && (
                <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                  {stats.estimate.usageFormatted}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-400">
              Kiểm tra dung lượng lưu trữ cục bộ, dọn dẹp cache AI và cơ sở dữ liệu offline
            </p>
          </div>
        </div>
        <Icon
          path={isOpen ? mdiChevronDown : mdiChevronRight}
          size={0.9}
          className="text-slate-400"
        />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-4 pt-1"
          >
            {/* Storage Progress Gauge Card */}
            <div className="p-4 bg-gradient-to-br from-slate-50 to-cyan-50/30 dark:from-slate-800/40 dark:to-cyan-950/20 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Dung lượng thiết bị đã cấp
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {stats?.lastUpdated && (
                    <span className="text-[10px] text-slate-400">
                      Lúc {stats.lastUpdated}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => loadStats(true)}
                    disabled={isLoading}
                    className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                    title="Quét lại dung lượng"
                  >
                    <Icon
                      path={isLoading ? mdiLoading : mdiRefresh}
                      size={0.65}
                      className={isLoading ? 'animate-spin' : ''}
                    />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-700/60 rounded-full overflow-hidden p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.max(2, Math.min(100, stats?.estimate.percent || 1))}%`,
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <span>
                    Đã dùng: <strong className="text-cyan-600 dark:text-cyan-400">{stats?.estimate.usageFormatted || '0 B'}</strong>
                  </span>
                  <span>
                    Hạn mức tối đa: <strong>{stats?.estimate.quotaFormatted || 'Không giới hạn'}</strong>
                  </span>
                </div>
              </div>

              {/* Quick Clean Action Banner */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <Icon path={mdiShieldCheckOutline} size={0.7} className="text-emerald-500 shrink-0" />
                  <span>Dọn an toàn: Giữ nguyên tài khoản, theme và dữ liệu quan trọng</span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickClean}
                  disabled={isCleaning}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Icon
                    path={isCleaning ? mdiLoading : mdiLightningBoltOutline}
                    size={0.65}
                    className={isCleaning ? 'animate-spin' : ''}
                  />
                  <span>{isCleaning ? 'Đang dọn dẹp...' : 'Dọn dẹp nhanh 1 chạm'}</span>
                </button>
              </div>
            </div>

            {/* Storage Categories Breakdown */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Icon path={mdiLayersOutline} size={0.65} className="text-indigo-500" />
                Phân bổ chi tiết các phân vùng bộ nhớ:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. AI & Forecast Cache */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
                        <Icon path={mdiRobot} size={0.7} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                          Bộ nhớ đệm Cố vấn AI
                        </h3>
                        <p className="text-[10px] text-slate-400">Dự báo tài chính & Phân tích thông minh</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded-lg border border-violet-200/40">
                      {formatBytes(stats?.localStorageStats.aiCacheSize || 0)}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                    <span>Số mục đệm đã lưu: <strong>{stats?.localStorageStats.aiCacheCount || 0} mục</strong></span>
                    <button
                      type="button"
                      onClick={handleClearAICache}
                      disabled={isCleaning || (stats?.localStorageStats.aiCacheCount === 0)}
                      className="text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-40"
                    >
                      <Icon path={mdiTrashCanOutline} size={0.55} />
                      <span>Xóa cache AI</span>
                    </button>
                  </div>
                </div>

                {/* 2. PWA Cache Storage */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                        <Icon path={mdiServerNetwork} size={0.7} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                          Bộ nhớ tĩnh PWA & Web
                        </h3>
                        <p className="text-[10px] text-slate-400">File mã nguồn, biểu tượng & font offline</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200/40">
                      {stats?.cacheStorageStats.cacheCount || 0} kho cache
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                    <span>Trạng thái: <strong>{stats?.cacheStorageStats.cacheCount ? 'Đã kích hoạt' : 'Chưa có cache'}</strong></span>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmModal({
                          type: 'pwa',
                          title: 'Xóa bộ nhớ tĩnh PWA?',
                          message:
                            'Hành động này sẽ xóa các file web đã lưu offline và tải lại phiên bản mới nhất từ máy chủ.',
                          dangerLevel: 'medium',
                        })
                      }
                      disabled={isCleaning}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Icon path={mdiRefresh} size={0.55} />
                      <span>Làm mới PWA</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Offline IndexedDB Database */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                      <Icon path={mdiDatabaseOutline} size={0.7} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        Cơ sở dữ liệu cục bộ (IndexedDB)
                      </h3>
                      <p className="text-[10px] text-slate-400">Lưu trữ ngoại tuyến cho giao dịch, sổ cái & nhật ký</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200/40">
                    {stats?.indexedDBStats.totalRecords || 0} bản ghi
                  </span>
                </div>

                {/* Table Record Counts Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                      <Icon path={mdiFinance} size={0.5} className="text-cyan-500" />
                      Giao dịch
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {stats?.indexedDBStats.counts.transactions || 0}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                      <Icon path={mdiTune} size={0.5} className="text-indigo-500" />
                      Ngân sách
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {stats?.indexedDBStats.counts.budgets || 0}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                      <Icon path={mdiCreditCardOutline} size={0.5} className="text-rose-500" />
                      Khoản nợ
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {stats?.indexedDBStats.counts.debts || 0}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                      <Icon path={mdiPiggyBankOutline} size={0.5} className="text-amber-500" />
                      Tiết kiệm
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {stats?.indexedDBStats.counts.savings || 0}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                      <Icon path={mdiBookOpenVariant} size={0.5} className="text-purple-500" />
                      Nhật ký
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {stats?.indexedDBStats.counts.diary || 0}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                      <Icon path={mdiLayersOutline} size={0.5} className="text-emerald-500" />
                      Chi phí cố định
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {stats?.indexedDBStats.counts.fixedExpenseTasks || 0}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                      <Icon path={mdiLayersOutline} size={0.5} className="text-blue-500" />
                      Danh mục
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {stats?.indexedDBStats.counts.categories || 0}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1 mb-0.5">
                      <Icon path={mdiRefresh} size={0.5} className="text-orange-500" />
                      Hàng đợi sync
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {stats?.indexedDBStats.counts.syncQueue || 0}
                    </span>
                  </div>
                </div>

                {/* Clear / Resync IndexedDB Action */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Icon path={mdiInformationOutline} size={0.55} />
                    Dữ liệu trên đám mây an toàn, có thể đồng bộ lại bất kỳ lúc nào
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmModal({
                        type: 'indexedDB',
                        title: 'Xóa dữ liệu đệm IndexedDB?',
                        message:
                          'Hành động này sẽ xóa dữ liệu ngoại tuyến hiện tại và tải lại dữ liệu mới nhất từ máy chủ.',
                        dangerLevel: 'high',
                      })
                    }
                    disabled={isCleaning}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Icon path={mdiTrashCanOutline} size={0.55} />
                    <span>Xóa đệm & Tải lại</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.type && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-2xl ${
                    confirmModal.dangerLevel === 'high'
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}
                >
                  <Icon path={mdiAlertCircleOutline} size={1} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {confirmModal.title}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {confirmModal.dangerLevel === 'high' ? 'Hành động cần lưu ý' : 'Xác nhận thao tác'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ type: null, title: '', message: '', dangerLevel: 'medium' })}
                  disabled={isCleaning}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleExecuteConfirmedAction}
                  disabled={isCleaning}
                  className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                    confirmModal.dangerLevel === 'high'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {isCleaning ? (
                    <Icon path={mdiLoading} size={0.6} className="animate-spin" />
                  ) : (
                    <Icon path={mdiCheckCircle} size={0.6} />
                  )}
                  <span>Xác nhận thực hiện</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
