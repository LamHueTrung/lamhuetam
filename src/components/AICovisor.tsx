import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@mdi/react";
import { mdiAutoFix, mdiSend, mdiTrendingUp, mdiScale, mdiTarget, mdiLoading, mdiRobot, mdiAccount, mdiDeleteOutline } from "@mdi/js";
import Markdown from "react-markdown";
import { motion } from "motion/react";
import { Transaction, Budget, DebtAccount, SavingsGoal, Message } from "../types";
type Debt = DebtAccount;

interface AICovisorProps {
  transactions: Transaction[];
  budgets: Budget[];
  debts: Debt[];
  savings: SavingsGoal[];
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
  return msgDate.toLocaleDateString("vi-VN", { month: "short", day: "numeric" });
}

const quickChips = [
  { label: "Phân tích nợ", icon: mdiTrendingUp, promptType: 'debt' as const, color: "text-rose-500" },
  { label: "Dự báo dòng tiền", icon: mdiScale, promptType: 'balance' as const, color: "text-amber-500" },
  { label: "Mẹo tiết kiệm", icon: mdiTarget, promptType: 'savings' as const, color: "text-indigo-500" },
];

const WELCOME_TEXT = "Xin chào! Tôi là **Gemini Co-Visor** — Trợ lý tài chính của bạn.\n\nTôi đã đồng bộ dữ liệu Sổ cái, Ngân sách, Công nợ và Mục tiêu tích lũy.\n\nHãy chọn một gợi ý bên dưới hoặc nhập câu hỏi để bắt đầu!";

const SESSION_KEY = 'ai_chat_session';

export default function AICovisor({ transactions, budgets, debts, savings }: AICovisorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setInitialized(true);
          return;
        }
      }
    } catch { }
    setMessages([{ id: "welcome", sender: "gemini", text: WELCOME_TEXT, timestamp: new Date().toISOString() }]);
    setInitialized(true);
  }, []);

  // Save messages to localStorage on change
  useEffect(() => {
    if (initialized) {
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(messages)); } catch { }
    }
  }, [messages, initialized]);

  const sendMessageToGemini = async (promptType: 'debt' | 'balance' | 'savings' | 'custom', customText?: string) => {
    if (isLoading) return;

    let userText = "";
    if (promptType === "debt") userText = "Phân tích tối ưu hóa công nợ";
    else if (promptType === "balance") userText = "Đánh giá cân đối thu chi";
    else if (promptType === "savings") userText = "Tư vấn chiến lược tích lũy";
    else userText = customText || inputMessage;

    if (!userText.trim()) return;

    const newUserMessage: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: userText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/.netlify/functions/gemini-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions, budgets, debts, savings, promptType, customMessage: promptType === "custom" ? userText : undefined })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể kết nối với máy chủ AI");

      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: "gemini",
        text: data.text || "Xin lỗi, tôi chưa thể phân tích thông tin này lúc này.",
        timestamp: new Date().toISOString()
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: "gemini",
        text: `❌ **Lỗi kết nối AI:** ${error.message}\n\nHãy đảm bảo đã cấu hình **GEMINI_API_KEY** trong Netlify Environment Variables hoặc kiểm tra kết nối mạng.`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendMessageToGemini("custom");
  };

  const clearChat = () => {
    try { localStorage.removeItem(SESSION_KEY); } catch { }
    setMessages([{
      id: "welcome",
      sender: "gemini",
      text: WELCOME_TEXT,
      timestamp: new Date().toISOString()
    }]);
  };

  const groupedMessages: { type: 'timestamp' | 'message'; data: any }[] = [];
  let lastTime = "";
  messages.forEach((msg) => {
    const msgDate = new Date(msg.timestamp);
    const timeKey = msgDate.toLocaleDateString("vi-VN");
    if (timeKey !== lastTime) {
      groupedMessages.push({ type: 'timestamp', data: timeKey });
      lastTime = timeKey;
    }
    groupedMessages.push({ type: 'message', data: msg });
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-sm">
            <Icon path={mdiAutoFix} size={1.25} className="text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-slate-900">Gemini Co-Visor</h1>
            <p className="text-[11px] text-slate-400 font-medium">Cố vấn tài chính AI</p>
          </div>
        </div>
        <button onClick={clearChat} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors" title="Xoá chat">
          <Icon path={mdiDeleteOutline} size={1} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 py-2 -mx-1 px-1 overscroll-behavior-contain">
        <div className="space-y-1">
          {groupedMessages.map((item, idx) => {
            if (item.type === 'timestamp') {
              return (
                <div key={`ts-${idx}`} className="flex justify-center py-2">
                  <span className="text-[11px] text-slate-400 font-medium bg-slate-100/80 px-3 py-1 rounded-full">
                    {item.data === new Date().toLocaleDateString("vi-VN") ? "Hôm nay" : item.data}
                  </span>
                </div>
              );
            }

            const msg = item.data as Message;
            const isGemini = msg.sender === "gemini";

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex items-end gap-2 px-1 ${isGemini ? "justify-start" : "justify-end"} mb-2`}
              >
                {isGemini && (
                  <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center shrink-0 mb-1">
                    <Icon path={mdiRobot} size={0.875} className="text-white" />
                  </div>
                )}

                <div className={`max-w-[78%] space-y-0.5 ${!isGemini ? "items-end" : ""}`}>
                  <div className={`px-3.5 py-2.5 text-[14px] leading-relaxed ${isGemini ? "bg-[#E9E9EB] text-slate-800 rounded-[20px] rounded-bl-[4px]" : "bg-[#007AFF] text-white rounded-[20px] rounded-br-[4px]"}`}>
                    <div className={`markdown-body prose prose-sm max-w-none ${isGemini ? "prose-slate" : "prose-invert"}`}>
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                  <p className={`text-[10px] text-slate-400 font-medium px-1 ${!isGemini ? "text-right" : ""}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>

                {!isGemini && (
                  <div className="w-7 h-7 rounded-full bg-[#007AFF]/10 flex items-center justify-center shrink-0 mb-1">
                    <Icon path={mdiAccount} size={0.875} className="text-[#007AFF]" />
                  </div>
                )}
              </motion.div>
            );
          })}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-end gap-2 px-1 mb-2"
            >
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center shrink-0 mb-1">
                <Icon path={mdiRobot} size={0.875} className="text-white" />
              </div>
              <div className="bg-[#E9E9EB] px-4 py-3 rounded-[20px] rounded-bl-[4px] flex items-center gap-1.5">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-2.5 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 select-none no-swipe">
          {quickChips.map((chip) => {
            return (
              <button
                key={chip.label}
                onClick={() => sendMessageToGemini(chip.promptType)}
                disabled={isLoading}
                className="px-3.5 py-2 bg-white border border-slate-100 hover:bg-slate-50 rounded-full text-[11px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm disabled:opacity-50 transition-all"
              >
                <Icon path={chip.icon} size={0.875} className={chip.color} />
                <span className="text-slate-700">{chip.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            placeholder="Tin nhắn..."
            className="flex-1 pl-4 pr-3 py-3 bg-white border border-slate-100 rounded-[22px] text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]/30 placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="p-3 bg-[#007AFF] text-white rounded-full hover:bg-[#0066D6] disabled:opacity-40 disabled:hover:bg-[#007AFF] cursor-pointer transition-all shadow-sm flex items-center justify-center"
          >
            <Icon path={mdiSend} size={1} />
          </button>
        </form>
      </div>
    </div>
  );
}