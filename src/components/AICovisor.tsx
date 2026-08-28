import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@mdi/react";
import {
  mdiSend,
  mdiLoading,
  mdiDeleteOutline,
  mdiArrowLeft,
  mdiContentCopy,
  mdiCheck,
  mdiTrendingUp,
  mdiScale,
  mdiPiggyBank,
  mdiAutoFix,
  mdiShieldAlertOutline,
  mdiChartTimelineVariant,
} from "@mdi/js";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";
import {
  Transaction,
  Budget,
  DebtAccount,
  SavingsGoal,
  Message,
  UserProfile,
  SalaryConfig,
  FixedExpenseCategory,
  FixedExpenseTask,
} from "../types";
type Debt = DebtAccount;

interface AICovisorProps {
  transactions: Transaction[];
  budgets: Budget[];
  debts: Debt[];
  savings: SavingsGoal[];
  userProfile?: UserProfile;
  salaryConfig?: SalaryConfig;
  fixedCats?: FixedExpenseCategory[];
  fixedTasks?: FixedExpenseTask[];
  totalFixed?: number;
  onBack: () => void;
}

function formatTime(ts: string) {
  const now = new Date();
  const msgDate = new Date(ts);
  const diffMs = now.getTime() - msgDate.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  return msgDate.toLocaleDateString("vi-VN", {
    month: "short",
    day: "numeric",
  });
}

const quickChips: {
  label: string;
  icon: string;
  promptType: "debt" | "balance" | "savings" | "custom";
  customText?: string;
  color: string;
  bg: string;
}[] = [
  {
    label: "Phân tích chi tiêu",
    icon: mdiTrendingUp,
    promptType: "balance" as const,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    label: "Dự báo Runway 30 ngày",
    icon: mdiChartTimelineVariant,
    promptType: "custom" as const,
    customText: "Phân tích số ngày an toàn tài chính (Runway) và dự báo dòng tiền theo mô hình ML trong 30 ngày tới.",
    color: "text-indigo-500",
    bg: "bg-indigo-50",
  },
  {
    label: "Giao dịch bất thường",
    icon: mdiShieldAlertOutline,
    promptType: "custom" as const,
    customText: "Rà soát giúp tao xem có giao dịch chi tiêu bất thường hay đột biến chi phí lớn nào cần lưu ý không.",
    color: "text-rose-500",
    bg: "bg-rose-50",
  },
  {
    label: "Tối ưu nợ & Tiết kiệm",
    icon: mdiScale,
    promptType: "debt" as const,
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    label: "Kế hoạch thâm hụt",
    icon: mdiAutoFix,
    promptType: "custom" as const,
    customText: "Nếu bị thâm hụt ngân sách tháng này, tao nên cắt giảm những danh mục tùy ý nào trước để cân bằng lại?",
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
];


const WELCOME_TEXT = "Tao nè, ổn không mậy. Hỏi gì hỏi đi, tao chỉ đường cho.";

export default function AICovisor({
  transactions,
  budgets,
  debts,
  savings,
  userProfile,
  salaryConfig,
  fixedCats,
  fixedTasks,
  totalFixed,
  onBack,
}: AICovisorProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "gemini",
      text: WELCOME_TEXT,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [sessionSummary, setSessionSummary] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(`/.netlify/functions/chat-history?sessionDate=${todayStr}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            const mapped = data.messages.map((m: any) => ({
              id: Math.random().toString(),
              sender: m.role === "user" ? "user" : "gemini",
              text: m.content,
              timestamp: new Date().toISOString(),
            }));
            setMessages([
              { id: "welcome", sender: "gemini", text: WELCOME_TEXT, timestamp: new Date().toISOString() },
              ...mapped
            ]);
          }
        }
      } catch (_) {}
    };
    loadHistory();
  }, [todayStr]);

  const sendMessageToGemini = async (
    promptType: "debt" | "balance" | "savings" | "custom",
    customText?: string,
  ) => {
    if (isLoading) return;

    let userText = "";
    if (promptType === "debt")
      userText = "Phân tích và tối ưu các khoản nợ hiện tại";
    else if (promptType === "balance")
      userText = "Phân tích chi tiêu tháng này và gợi ý tiết kiệm";
    else if (promptType === "savings")
      userText = "Dự báo dòng tiền và gợi ý kế hoạch tài chính";
    else userText = customText || inputMessage;

    if (!userText.trim()) return;

    const newUserMessage: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: userText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputMessage("");
    setIsLoading(true);

    const input = document.getElementById("chat-input");
    input?.focus();

    try {
      // Lưu giữ lịch sử hội thoại trọn vẹn (bỏ welcome message, 6 tin gần nhất)
      const conversationHistory = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        }));

      // Lấy dữ liệu ML từ cache để cung cấp số liệu định lượng chuẩn xác cho AI
      let mlContext = undefined;
      try {
        const mlCache = localStorage.getItem("ml_forecast_cache");
        if (mlCache) {
          const parsedMl = JSON.parse(mlCache);
          if (parsedMl?.runway_analysis) {
            mlContext = {
              runway_analysis: parsedMl.runway_analysis,
            };
          }
        }
      } catch (e) {
        console.warn("[AICovisor] ML context read error:", e);
      }

      // Tinh gọn dữ liệu gửi đi (chỉ gửi tối đa 15 giao dịch gần nhất) để tiết kiệm token
      const trimmedTransactions = (transactions || []).slice(-15);

      const response = await fetch("/.netlify/functions/gemini-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: trimmedTransactions,
          budgets,
          debts,
          savings,
          promptType,
          customMessage: promptType === "custom" ? userText : undefined,
          userProfile,
          salaryConfig,
          fixedCats,
          fixedTasks,
          totalFixed,
          conversationHistory,
          sessionSummary,
          mlContext,
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Không thể kết nối với máy chủ AI");

      // Lưu tóm tắt phiên nếu có
      if (data.summary) setSessionSummary(data.summary);

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "gemini",
          text:
            data.text ||
            "Xin lỗi, tao chưa thể phân tích thông tin này lúc này.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "gemini",
          text: `**Lỗi kết nối:** ${error.message}\n\nKiểm tra cấu hình AI trong **Hồ sơ** hoặc thử lại sau.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendMessageToGemini("custom");
  };

  const clearChat = async () => {
    if (window.confirm("Bạn có chắc muốn xóa lịch sử trò chuyện của hôm nay?")) {
      try {
        const res = await fetch(`/.netlify/functions/chat-history?sessionDate=${todayStr}`, {
          method: "DELETE"
        });
        if (res.ok) {
          setMessages([
            {
              id: "welcome",
              sender: "gemini",
              text: WELCOME_TEXT,
              timestamp: new Date().toISOString(),
            },
          ]);
          setSessionSummary("");
          toast.success("Đã xóa lịch sử trò chuyện");
        }
      } catch (_) {
        toast.error("Không thể xóa lịch sử");
      }
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Đã sao chép");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const groupedMessages: { type: "timestamp" | "message"; data: any }[] = [];
  let lastTime = "";
  messages.forEach((msg) => {
    const msgDate = new Date(msg.timestamp);
    const timeKey = msgDate.toLocaleDateString("vi-VN");
    if (timeKey !== lastTime) {
      groupedMessages.push({ type: "timestamp", data: timeKey });
      lastTime = timeKey;
    }
    groupedMessages.push({ type: "message", data: msg });
  });

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 -ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
            title="Quay lại"
          >
            <Icon path={mdiArrowLeft} size={1.2} />
          </button>
           <img src="/avatar_bot.png" alt="AI" className="w-8 h-8 rounded-full" />
          <div>
            <h1 className="text-[15px] font-bold text-slate-900 dark:text-white">
              Huệ Tâm
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Bản thân ở tương lai
            </p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
          title="Xoá chat"
        >
          <Icon path={mdiDeleteOutline} size={1} />
        </button>
      </div>

      {sessionSummary && (
        <div className="shrink-0 bg-blue-50/70 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 px-4 py-2 text-[12px] text-blue-700 dark:text-blue-300 italic flex gap-1">
          <span className="font-bold shrink-0">🗒️ Tóm tắt:</span>
          <span>{sessionSummary}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-4 py-3 overscroll-behavior-contain bg-[#F2F2F7] dark:bg-[#1C1C1E]">
        <div className="space-y-1.5">
          {groupedMessages.map((item, idx) => {
            if (item.type === "timestamp") {
              const isToday =
                item.data === new Date().toLocaleDateString("vi-VN");
              return (
                <div key={`ts-${idx}`} className="flex justify-center py-2">
                  <span className="text-[11px] text-slate-400 font-medium bg-slate-200/80 dark:bg-slate-800/80 px-3 py-1 rounded-full">
                    {isToday ? "Hôm nay" : item.data}
                  </span>
                </div>
              );
            }

            const msg = item.data as Message;
            const isGemini = msg.sender === "gemini";

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-end gap-2 ${isGemini ? "justify-start" : "justify-end"} mb-2`}
              >
                {isGemini && (
                  <div className="shrink-0 mb-1">
                    <img
                      src="/avatar_bot.png"
                      alt="AI"
                      className="w-7 h-7 rounded-full"
                    />
                  </div>
                )}

                <div
                  className={`max-w-[80%] space-y-0.5 ${!isGemini ? "items-end" : ""}`}
                >
                  <div
                    className={`px-3.5 py-2.5 text-[14px] leading-relaxed ${
                      isGemini
                        ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-[20px] rounded-bl-[4px] shadow-sm"
                        : "bg-[#007AFF] text-white rounded-[20px] rounded-br-[4px]"
                    }`}
                  >
                    <div
                      className={`markdown-body prose prose-sm max-w-none ${
                        isGemini
                          ? "prose-slate dark:prose-invert"
                          : "prose-invert"
                      }`}
                    >
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${!isGemini ? "justify-end" : ""}`}
                  >
                    <span className="text-[10px] text-slate-400 font-medium px-1">
                      {formatTime(msg.timestamp)}
                    </span>
                    {isGemini && (
                      <button
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        title="Sao chép"
                      >
                        <Icon
                          path={copiedId === msg.id ? mdiCheck : mdiContentCopy}
                          size={0.65}
                        />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex items-end gap-2 mb-2"
              >
                <div className="shrink-0 mb-1">
                  <img
                    src="/avatar_bot.png"
                    alt="AI"
                    className="w-7 h-7 rounded-full"
                  />
                </div>
                <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-[20px] rounded-bl-[4px] shadow-sm flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-4 py-3">
        {/* Quick chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2.5 no-swipe">
          {quickChips.map((chip) => (
            <button
              key={chip.label}
              onClick={() =>
                sendMessageToGemini(chip.promptType, chip.customText)
              }
              disabled={isLoading}
              className={`px-3 py-1.5 ${chip.bg} dark:bg-slate-800 hover:opacity-80 rounded-full text-[12px] font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 transition-all whitespace-nowrap`}
            >
              <Icon path={chip.icon} size={0.75} className={chip.color} />
              <span className="text-slate-700 dark:text-slate-300">
                {chip.label}
              </span>
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative flex items-center gap-2"
        >
          <input
            id="chat-input"
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            placeholder="Nhập câu hỏi..."
            className="flex-1 pl-4 pr-3 py-2.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-[22px] text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 placeholder-slate-400 dark:text-white dark:placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="p-2.5 bg-[#007AFF] text-white rounded-full hover:bg-[#0066D6] disabled:opacity-40 disabled:hover:bg-[#007AFF] cursor-pointer transition-all shadow-sm flex items-center justify-center"
          >
            {isLoading ? (
              <Icon path={mdiLoading} size={1} className="animate-spin" />
            ) : (
              <Icon path={mdiSend} size={1} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
