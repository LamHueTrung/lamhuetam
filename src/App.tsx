import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@mdi/react";
import {
  mdiContentCopy,
  mdiLoading,
  mdiLogout,
  mdiWeatherNight,
  mdiWeatherSunny,
  mdiPackageUp,
} from "@mdi/js";
import { useRegisterSW } from "virtual:pwa-register/react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ToastProvider, { aiToast } from "./components/ToastProvider";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import Ledger from "./components/Ledger";
import QuickAddModal from "./components/QuickAddModal";
import FinanceBudget from "./components/FinanceBudget";
import AICovisor from "./components/AICovisor";
import CategoryManager from "./components/CategoryManager";
import DiaryView from "./components/DiaryView";
import UserProfileView from "./components/UserProfileView";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import SyncStatus from "./components/SyncStatus";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { scheduleSync } from "./services/syncService";
import { useTransactions } from "./hooks/useTransactions";
import { useBudgets } from "./hooks/useBudgets";
import { useDebts } from "./hooks/useDebts";
import { useSavings } from "./hooks/useSavings";
import { useCategories } from "./hooks/useCategories";
import { useFixedExpenses } from "./hooks/useFixedExpenses";
import { useSalary } from "./hooks/useSalary";
import { useUserProfile } from "./hooks/useUserProfile";
import { Transaction, DebtAccount, Category } from "./types";
type Debt = DebtAccount;


function AppContent() {
  const { isAuthenticated, loading: authLoading, username, logout } = useAuth();
  const { needRefresh, updateServiceWorker } = useRegisterSW();

  useEffect(() => {
    if (needRefresh) {
      toast(
        (t) => (
          <div className="flex flex-col gap-2 p-1">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <span>🚀 Có phiên bản mới!</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Ứng dụng có bản cập nhật mới. Nhấn Cập nhật để áp dụng phiên bản mới ngay lập tức.
            </p>
            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="text-[9px] px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 font-bold cursor-pointer"
              >
                Để sau
              </button>
              <button
                onClick={async () => {
                  toast.dismiss(t.id);
                  toast.loading("Đang cập nhật phiên bản mới...");
                  await updateServiceWorker(true);
                }}
                className="text-[9px] px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-bold cursor-pointer"
              >
                Cập nhật
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity,
          id: "pwa-update-toast",
        }
      );
    }
  }, [needRefresh, updateServiceWorker]);

  const [currentTab, setCurrentTab] = useState<number>(1);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);

  const {
    transactions,
    loading: txLoading,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    refetch: refetchTransactions,
  } = useTransactions();
  const { budgets, loading: budgetLoading, updateBudgetLimit } = useBudgets();
  const {
    debts,
    loading: debtLoading,
    addDebt,
    deleteDebt,
    payInstallments: payMultipleInstallments,
    updateDebt,
  } = useDebts();
  const { savings, loading: saveLoading, updateSavings } = useSavings();
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
  } = useCategories();

  const isOnline = useOnlineStatus();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const { categories: fixedCats, tasks: fixedTasks, totalFixed } = useFixedExpenses(currentMonth);
  const { salaryConfig } = useSalary();
  const { profile: userProfile, updateProfile } = useUserProfile();


  const isInitialLoading =
    txLoading || budgetLoading || debtLoading || saveLoading;
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [alertsChecked, setAlertsChecked] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("dark_mode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    localStorage.setItem("dark_mode", String(isDarkMode));
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const handleCopyFinancialMarkdown = useCallback(() => {
    const nowStr = new Date().toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const numFmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' VNĐ';

    let md = `# 📊 BÁO CÁO TÀI CHÍNH TỔNG QUAN\n`;
    md += `*Xuất dữ liệu lúc: ${nowStr}*\n\n`;
    md += `---\n\n`;

    // 1. Dòng tiền & Lương
    md += `## 1. 💵 DÒNG TIỀN & LƯƠNG\n`;
    if (salaryConfig && (salaryConfig.netSalary > 0 || salaryConfig.grossSalary > 0)) {
      md += `- **Lương thực nhận (Net):** ${numFmt(salaryConfig.netSalary || 0)}\n`;
      md += `- **Lương Gross:** ${numFmt(salaryConfig.grossSalary || 0)}\n`;
      md += `- **Ngày nhận lương:** Ngày ${salaryConfig.receiveDay || '—'} hàng tháng\n`;
      md += `- **Số ngày công:** ${salaryConfig.workDays || 0} ngày\n`;
      const totalLeaveDays = (salaryConfig.leaveDays || []).reduce((s, l) => s + l.count, 0);
      md += `- **Tổng số ngày nghỉ:** ${totalLeaveDays} ngày\n`;
      if (salaryConfig.notes) md += `- **Ghi chú:** ${salaryConfig.notes}\n`;
    } else {
      md += `*Chưa có thông tin cấu hình lương*\n`;
    }
    md += `\n---\n\n`;

    // 2. Chi tiêu cố định
    md += `## 2. 📌 CHI TIÊU CỐ ĐỊNH (Tháng ${currentMonth})\n`;
    md += `**Tổng Chi Cố Định:** ${numFmt(totalFixed || 0)}\n\n`;
    if (fixedCats.length > 0) {
      fixedCats.forEach(cat => {
        const catTasks = fixedTasks.filter(t => t.categoryId === cat.id);
        const catTotal = catTasks.reduce((s, t) => s + t.amount, 0);
        md += `### 📁 ${cat.name} (Tổng: ${numFmt(catTotal)})\n`;
        if (catTasks.length === 0) {
          md += `- *(Chưa có khoản chi)*\n`;
        } else {
          catTasks.forEach(t => {
            md += `- **${t.name}**: ${numFmt(t.amount)}${t.note ? ` *(Ghi chú: ${t.note})*` : ''}\n`;
          });
        }
        md += `\n`;
      });
    } else {
      md += `*Chưa có danh mục chi tiêu cố định*\n\n`;
    }
    md += `---\n\n`;

    // 3. Danh sách nợ & Trả góp
    const totalDebtsRemaining = debts.reduce((s, d) => s + (d.currentBalance || 0), 0);
    md += `## 3. 💳 DỰ NỢ & TRẢ GÓP\n`;
    md += `**Tổng Dư Nợ Còn Lại:** ${numFmt(totalDebtsRemaining)}\n\n`;
    if (debts.length > 0) {
      debts.forEach((d, i) => {
        const typeLabel = d.type === 'credit_card' ? 'Thẻ tín dụng' : d.type === 'installment' ? 'Trả góp' : 'Vay nợ';
        md += `### ${i + 1}. ${d.name} (${typeLabel})\n`;
        md += `- **Dư nợ còn lại:** ${numFmt(d.currentBalance || 0)} / Ban đầu: ${numFmt(d.originalAmount || 0)}\n`;
        if (d.type === 'installment') {
          md += `- **Tiến độ trả góp:** Đã trả ${d.paidInstallments || 0}/${d.totalInstallments || 0} kỳ\n`;
          md += `- **Số tiền trả hàng tháng:** ${numFmt(d.monthlyPayment || 0)} (Hạn trả: Ngày ${d.paymentDay || '—'})\n`;
        } else if (d.type === 'credit_card') {
          md += `- **Hạn mức:** ${numFmt(d.currentBalance || 0)} (Hạn thanh toán: Ngày ${d.paymentDay || '—'})\n`;
        }
        if (d.notes) md += `- **Ghi chú:** ${d.notes}\n`;
        md += `\n`;
      });
    } else {
      md += `*Chưa có khoản vay nợ / trả góp*\n\n`;
    }
    md += `---\n\n`;

    // 4. Giao dịch thu chi gần đây
    md += `## 4. 📈 LỊCH SỬ GIAO DỊCH THU CHI (Gần đây)\n`;
    if (transactions.length > 0) {
      const recentTx = transactions.slice(0, 30);
      recentTx.forEach(t => {
        const typeSign = t.type === 'income' ? '+' : '-';
        md += `- [${t.date}] **${t.type === 'income' ? 'Thu' : 'Chi'}**: ${typeSign}${numFmt(t.amount)} | Danh mục: ${t.category} | Ví: ${t.wallet || 'Mặc định'}${t.description ? ` | Ghi chú: ${t.description}` : ''}\n`;
      });
    } else {
      md += `*Chưa có lịch sử giao dịch*\n`;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md)
        .then(() => toast.success('Đã sao chép toàn bộ dữ liệu tài chính (Markdown)!'))
        .catch(() => toast.error('Lỗi khi sao chép'));
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = md;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Đã sao chép toàn bộ dữ liệu tài chính (Markdown)!');
      } catch {
        toast.error('Lỗi khi sao chép');
      }
      document.body.removeChild(textArea);
    }
  }, [salaryConfig, fixedCats, fixedTasks, totalFixed, currentMonth, debts, transactions]);

  const checkAiAlerts = useCallback(async () => {
    if (alertsChecked) return;
    setAlertsChecked(true);
    try {
      const response = await fetch("/.netlify/functions/gemini-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions,
          budgets,
          debts,
          savings,
          promptType: "alerts",
        }),
      });
      const data = await response.json();
      if (data.text && data.text !== "OK") {
        const alerts = data.text.split("\n").filter((l: string) => l.trim());
        alerts.forEach((alert: string) => {
          aiToast(alert, { type: "warning", duration: 300000 });
        });
      }
    } catch {}
  }, [transactions, budgets, debts, savings, alertsChecked]);

  useEffect(() => {
    if (!isInitialLoading) checkAiAlerts();
  }, [isInitialLoading, checkAiAlerts]);

  useEffect(() => {
    if (isOnline) scheduleSync();
  }, [isOnline]);

  const handleAddTransaction = async (newTx: Omit<Transaction, "id">) => {
    try {
      await addTransaction(newTx);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateTransaction = async (
    id: string,
    data: Partial<Transaction>,
  ) => {
    try {
      await updateTransaction(id, data);
      toast.success("Đã cập nhật giao dịch");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateBudgetLimit = async (
    category: string,
    newLimit: number,
  ) => {
    try {
      await updateBudgetLimit(category, newLimit);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePayMultipleInstallments = async (
    debtId: string,
    installmentIndices: number[],
    partialAmounts?: Record<number, number>,
    note?: string,
  ) => {
    try {
      await payMultipleInstallments(
        debtId,
        installmentIndices,
        partialAmounts,
        note,
      );
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddDebt = async (newDebt: Omit<DebtAccount, "id">) => {
    try {
      await addDebt(newDebt as any);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteDebt = async (id: string) => {
    try {
      await deleteDebt(id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".no-swipe") ||
      target.closest("[drag]") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("textarea") ||
      target.closest("a")
    ) {
      return;
    }
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const diffX = touchStartX - e.changedTouches[0].clientX;
    const diffY = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 60) {
      const tabSequence = [1, 2, 4, 5, 7, 6];
      const currentIndex = tabSequence.indexOf(currentTab);

      if (diffX > 0 && currentIndex < tabSequence.length - 1)
        setCurrentTab(tabSequence[currentIndex + 1]);
      else if (diffX < 0 && currentIndex > 0)
        setCurrentTab(tabSequence[currentIndex - 1]);
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  // Auth loading
  if (authLoading) {
    return (
      <div className="h-screen min-h-0 bg-[#F2F2F7] flex items-center justify-center">
        <Icon
          path={mdiLoading}
          size={2}
          className="text-slate-400 animate-spin"
        />
      </div>
    );
  }

  // Not authenticated — check if any user exists
  if (!isAuthenticated) {
    return <AuthRouter />;
  }

  return (
    <div className="h-screen min-h-0 bg-[#F2F2F7] dark:bg-[#1C1C1E] flex flex-col select-none overflow-hidden">
      {/* iOS Status Bar */}
      <div className="w-full max-w-md mx-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/30 dark:border-slate-700/30 px-6 py-3 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 z-10">
        <button
          onClick={handleCopyFinancialMarkdown}
          className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 px-2.5 py-1 rounded-lg transition-all text-[11px] font-bold cursor-pointer border border-slate-200/50 dark:border-slate-700 shadow-sm"
          title="Sao chép toàn bộ dữ liệu tài chính (dạng Markdown)"
        >
          <Icon path={mdiContentCopy} size={0.7} />
          <span>Copy MD</span>
        </button>
        <div className="flex items-center gap-2">
          <SyncStatus />
          {needRefresh && (
            <button
              onClick={async () => {
                toast.loading("Đang cập nhật phiên bản mới...");
                await updateServiceWorker(true);
              }}
              className="flex items-center gap-1 text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md text-[10px] font-black cursor-pointer animate-pulse border border-amber-200/50"
              title="Có phiên bản mới, click để cập nhật ngay"
            >
              <Icon path={mdiPackageUp} size={0.65} />
              <span>Có bản mới</span>
            </button>
          )}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md hover:bg-slate-200 transition-colors text-[10px] font-black cursor-pointer"
            title={isDarkMode ? "Chế độ sáng" : "Chế độ tối"}
          >
            <Icon
              path={isDarkMode ? mdiWeatherSunny : mdiWeatherNight}
              size={0.75}
            />
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md hover:bg-rose-100 transition-colors text-[10px] font-black cursor-pointer"
            title="Đăng xuất"
          >
            <Icon path={mdiLogout} size={0.75} />
            <span>Thoát</span>
          </button>
          <span className="text-slate-400 font-extrabold">
            {new Date().toLocaleDateString("vi-VN")}
          </span>
        </div>
      </div>

      <main
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`flex-1 w-full max-w-md mx-auto px-5 pt-4 min-h-0 overflow-hidden relative ${currentTab === 5 ? "pb-4" : "pb-[127px]"}`}
      >
        {isInitialLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <Icon
              path={mdiLoading}
              size={2.5}
              className="text-slate-400 dark:text-slate-500 animate-spin"
            />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Đang tải dữ liệu...
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className={
                currentTab === 5
                  ? "h-full flex flex-col min-h-0 overflow-x-hidden"
                  : "h-full overflow-y-auto overflow-x-hidden overscroll-behavior-contain"
              }
            >
              {currentTab === 1 && (
                <Dashboard
                  transactions={transactions}
                  debts={debts}
                  categories={categories}
                  budgets={budgets}
                  savings={savings}
                  totalFixed={totalFixed}
                  onNavigateToTab={setCurrentTab}
                  username={username}
                  userProfile={userProfile}
                />
              )}
              {currentTab === 2 && (
                <Ledger
                  transactions={transactions}
                  onDeleteTransaction={handleDeleteTransaction}
                  onUpdateTransaction={handleUpdateTransaction}
                  categories={categories}
                />
              )}
              {currentTab === 4 && (
                <FinanceBudget
                  debts={debts}
                  transactions={transactions}
                  onPayMultipleInstallments={handlePayMultipleInstallments}
                  onAddDebt={handleAddDebt}
                  onDeleteDebt={handleDeleteDebt}
                  onUpdateDebt={(id, data) => updateDebt(id, data)}
                  onTransactionAdded={refetchTransactions}
                />
              )}
              {currentTab === 5 && (
                <AICovisor
                  transactions={transactions}
                  budgets={budgets}
                  debts={debts}
                  savings={savings}
                  userProfile={userProfile}
                  onBack={() => setCurrentTab(1)}
                />
              )}
              {currentTab === 6 && (
                <DiaryView />
              )}
              {currentTab === 7 && (
                <UserProfileView
                  profile={userProfile}
                  onUpdateProfile={updateProfile}
                  onNavigateToTab={setCurrentTab}
                />
              )}

            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {currentTab !== 5 && (
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        />
      )}

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onAddTransaction={handleAddTransaction}
        categories={categories}
        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
      />

      <CategoryManager
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onAdd={addCategory}
        onUpdate={updateCategory}
        onDelete={deleteCategory}
        onReorder={reorderCategories}
      />
    </div>
  );
}

function AuthRouter() {
  const [hasUser, setHasUser] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/.netlify/functions/auth")
      .then((r) => r.json())
      .then((data) => setHasUser(data.hasUser))
      .catch(() => setHasUser(false));
  }, []);

  if (hasUser === null) {
    return (
      <div className="h-screen min-h-0 bg-[#F2F2F7] flex items-center justify-center">
        <Icon
          path={mdiLoading}
          size={2}
          className="text-slate-400 animate-spin"
        />
      </div>
    );
  }

  return hasUser ? <LoginPage /> : <RegisterPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
