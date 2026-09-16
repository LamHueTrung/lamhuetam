import { useState, useEffect } from 'react';
import { Icon } from '@mdi/react';
import { mdiCloudSync, mdiCloudOffOutline, mdiSync } from '@mdi/js';
import toast from 'react-hot-toast';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getQueueCount, processSyncQueue, onQueueChange } from '../services/syncService';

export default function SyncStatus() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getQueueCount().then(setPendingCount);
    const unsub = onQueueChange(setPendingCount);
    return () => unsub();
  }, []);

  const handleSync = async () => {
    if (syncing || pendingCount === 0 || !isOnline) return;
    setSyncing(true);
    const toastId = toast.loading('Đang đồng bộ dữ liệu...');
    try {
      const { success, failed } = await processSyncQueue();
      if (failed > 0) {
        toast.error(`Đồng bộ xong: ${success} thành công, ${failed} thất bại.`, { id: toastId });
      } else if (success > 0) {
        toast.success(`Đã đồng bộ ${success} thay đổi thành công!`, { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } catch {
      toast.error('Lỗi khi đồng bộ dữ liệu.', { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  if (!isOnline) {
    return (
      <div
        className="flex items-center gap-1 text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md text-[10px] font-black cursor-not-allowed select-none"
        title="Đang offline"
      >
        <Icon path={mdiCloudOffOutline} size={0.65} />
        <span>Offline</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <button
        onClick={handleSync}
        disabled={syncing}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black cursor-pointer transition-all ${
          syncing
            ? 'text-blue-400 bg-blue-50 dark:bg-blue-900/20 opacity-70 cursor-wait'
            : 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
        }`}
        title={`${pendingCount} thay đổi chưa đồng bộ. Nhấp để đồng bộ ngay.`}
      >
        <Icon
          path={syncing ? mdiSync : mdiCloudSync}
          size={0.65}
          className={syncing ? 'animate-spin' : ''}
        />
        <span>{syncing ? 'Đang đồng bộ...' : `${pendingCount} chờ sync`}</span>
      </button>
    );
  }

  return null;
}

