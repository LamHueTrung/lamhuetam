# Kế Hoạch Nâng Cấp: ios-taichinh ✦ AI ✦ Discord Bot

> **Trạng thái hiện tại:** React 19 + Vite 6 + Tailwind 4 + Netlify Functions + MongoDB + Gemini 2.0 Flash
> **Chiến lược:** Giữ single-user, iOS-style UI, Gemini 2.0 Flash, wallet string

---

## 🏗️ Giai đoạn 1: Nâng Cấp Tính Năng Tài Chính (Core)

### 1.1 Biểu đồ xu hướng thu/chi (Recharts)

- **File:** `src/components/Dashboard.tsx`, `package.json`
- **Thư viện thêm:** `recharts`
- Line chart: trục X = ngày, 2 đường = thu/chi
- 3 chế độ: 7 ngày / 30 ngày / 12 tháng (tab buttons)
- Highlight chênh lệch thu - chi
- Kèm % tăng/giảm so với kỳ trước

### 1.2 Net Worth chart

- **File:** `src/components/Dashboard.tsx`
- Area chart: tích lũy tài sản ròng = tổng thu - tổng chi theo thời gian
- Gradient fill xanh (dương) / đỏ (âm)

### 1.3 Top categories bar chart

- **File:** `src/components/Dashboard.tsx`
- Bar chart ngang: top 5 categories chi tiêu trong tháng
- Màu sắc lấy từ category definition, kèm % tổng chi

### 1.4 Cash flow forecast

- **File:** `src/components/Dashboard.tsx`
- Dự báo số dư cuối tháng = số dư hiện tại + thu dự kiến (recurring + trung bình) - chi dự kiến
- Warning nếu forecast âm

### 1.5 Smart Budget

- **File:** `src/components/FinanceBudget.tsx`, `netlify/functions/budgets.ts`
- **Gợi ý budget:** API mới `GET /budgets/suggest` tính trung bình chi 3 tháng gần nhất theo category
- **Rollover:** Budget chưa dùng hết +50% sang tháng sau
- **Cảnh báo:** Toast khi vượt 80%/100%
- UI: progress bar đổi màu theo % (xanh → vàng → đỏ)

### 1.6 Debt Strategy (Snowball vs Avalanche)

- **File:** `src/components/FinanceBudget.tsx`, `netlify/functions/gemini-advisor.ts`
- Button "Chiến lược trả nợ" → gọi Gemini với prompt chứa danh sách nợ
- AI trả về bảng so sánh Snowball vs Avalanche + đề xuất
- Thêm "Mô phỏng": "Nếu trả thêm X/tháng, hết nợ vào tháng Y"
- Highlight khoản nợ cần ưu tiên

### 1.7 Fix tính số dư khả dụng (BUG)

- **File:** `src/components/Dashboard.tsx`
- **Hiện tại (sai):** `totalPayables = sum of currentBalance của tất cả nợ active` → trừ toàn bộ dư nợ gốc
- **Sửa thành:** `totalPayables = sum of monthlyPayment của nợ active` → chỉ trừ số tiền phải trả TRONG THÁNG
- **Chi tiết:**
  - Đổi `d.currentBalance` → `d.monthlyPayment` trong `totalPayables`
  - Cập nhật label "Nợ trả" → "Trả nợ tháng này"
  - Kiểm tra `FinanceBudget.tsx` cashflow: đã đúng (dùng `monthlyPayment`), không cần sửa

### 1.8 Export PDF

- **File mới:** `src/components/ExportPDF.tsx`
- **Thư viện:** `jspdf`, `jspdf-autotable`
- Button "Xuất PDF" ở Dashboard và Ledger
- Tên file: `baocao-thang-{MM-YYYY}.pdf`

### 1.9 Dark Mode

- **File:** `src/App.tsx`, `src/index.css`, `src/context/AuthContext.tsx`, `src/components/Navbar.tsx`
- Thêm `data-theme` attribute trên `<html>`
- CSS variables cho dark mode (Tailwind `dark:` variant)
- Toggle icon (sun/moon) trên status bar
- Persist vào localStorage + AuthContext

---

## 🤖 Giai đoạn 2: AI Co-Visor Nâng Cao

### 2.1 Context mở rộng

- **File:** `netlify/functions/gemini-advisor.ts`
- Fetch transactions tháng hiện tại + debts + budgets → đính kèm prompt
- Prompt template mới với sections:
  - Dữ liệu tài chính (tổng thu, tổng chi, debts, budgets)
  - Câu hỏi từ user
- Role: "Bạn là chuyên gia tài chính cá nhân người Việt..."

### 2.2 Conversation Memory

- **File:** `netlify/functions/_db.ts`, `netlify/functions/gemini-advisor.ts`
- Schema mới `ChatMessage`: `{ role, content, createdAt }`
- Lưu message vào DB sau mỗi exchange
- Gửi kèm 10 message gần nhất vào prompt context
- API nhận thêm `sessionId`

### 2.3 AI Insights Widget

- **File:** `src/components/Dashboard.tsx`
- Card nhỏ "Gợi ý từ AI" ở cuối Dashboard
- Gọi Gemini 1 lần/tuần (cache result) với data tổng quan
- Hiển thị 1-2 câu ngắn gọn: "Bạn đã chi 80% budget Ăn uống..."

---

## 🤖 Giai đoạn 3: Discord Bot (Webhook trên Netlify)

### 3.1 Kiến trúc

```
User → Discord → POST /.netlify/functions/discord ← Netlify Function
                    ↓
            Verify Ed25519 signature
                    ↓
            Router → /balance → query DB → response
                    → /spending → query DB → response
                    → /advice → Gemini API → response
                    → /add → insert DB → response
```

- **File mới:** `netlify/functions/discord.ts`
- **Thư viện:** `discord-interactions`, `tweetnacl`

### 3.2 Slash Commands

| Command | Logic |
|---------|-------|
| `/balance` | Tổng thu/chi tháng này, số dư hiện tại |
| `/spending [category]` | Chi tiết chi tiêu. Nếu có category → lọc; không → top 5 |
| `/debts` | Danh sách nợ active + tổng dư + khoản đến hạn trong 7 ngày |
| `/add [amount] [category] [note]` | Parse text → insert transaction → trả về confirmation |
| `/advice [question]` | Gửi lên Gemini advisor → trả về Markdown |
| `/report [month]` | Báo cáo tổng quan tháng (hoặc mặc định tháng này) |
| `/budget` | Budget các category + % đã chi |
| `/help` | Danh sách commands |

### 3.3 Proactive Notifications (Scheduled)

- **File mới:** `netlify/functions/discord-reminder.ts`
- **Config:** `netlify.toml` — schedule `cron: 0 8 * * *` (8h sáng mỗi ngày)
- **Logic:**
  - Check debts due trong 3 ngày tới → DM user
  - Check budget > 90% → DM user
  - Chủ Nhật hàng tuần: gửi weekly summary

### 3.4 Interaction Handling

- `PING` → trả `pong`
- `APPLICATION_COMMAND` → router đến handler tương ứng
- Dùng `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE` cho commands chậm (advice)
- Dùng `CHANNEL_MESSAGE_WITH_SOURCE` cho commands nhanh (balance)

---

## 📁 File Impact Summary

```
THÊM MỚI:
  netlify/functions/discord.ts              # Discord webhook handler
  netlify/functions/discord-reminder.ts     # Scheduled cron reminders
  src/components/ExportPDF.tsx              # PDF export component
  src/components/DarkModeToggle.tsx         # Theme toggle component

SỬA ĐỔI:
  src/components/Dashboard.tsx              # Charts, AI insights, export
  src/components/FinanceBudget.tsx          # Smart budget, debt strategy
  src/components/AICovisor.tsx              # Conversation memory UI
  src/components/Ledger.tsx                 # Export button
  src/App.tsx                              # Dark mode state, routing
  src/index.css                            # Dark mode CSS variables
  src/context/AuthContext.tsx               # Theme preference persist
  src/components/Navbar.tsx                 # Theme toggle icon
  netlify/functions/_db.ts                 # ChatMessage schema
  netlify/functions/gemini-advisor.ts      # Context + memory + prompts
  netlify/functions/budgets.ts             # Suggest budget endpoint
  package.json                             # recharts, jspdf, discord-interactions, tweetnacl
  .env.example                             # DISCORD_PUBLIC_KEY, DISCORD_APP_ID, DISCORD_BOT_TOKEN
  netlify.toml                             # Cron schedule for reminders
```

---

## 📦 Thư viện cần thêm

| Package | Version | Dùng cho |
|---------|---------|----------|
| `recharts` | ^2.x | Biểu đồ tương tác |
| `jspdf` | ^2.x | Export PDF |
| `jspdf-autotable` | ^3.x | Bảng trong PDF |
| `discord-interactions` | ^4.x | Xử lý Discord webhook |
| `tweetnacl` | ^1.x | Verify Ed25519 signature |

---

## 🔧 Cấu hình mới (Netlify Environment Variables)

| Variable | Mô tả | Lấy từ đâu |
|----------|-------|-----------|
| `DISCORD_PUBLIC_KEY` | Public key của Discord App | Discord Developer Portal |
| `DISCORD_APP_ID` | Application ID | Discord Developer Portal |
| `DISCORD_BOT_TOKEN` | Bot token | Discord Developer Portal |
| `DISCORD_USER_ID` | Discord User ID của bạn | Discord UI → Settings → Advanced |

---

## 🗓️ Thứ tự thực hiện

```
Phase 1 (Tính năng Core)
  ├── 1.1 Recharts + Dashboard         # Đầu tiên, thay đổi UI chính
  ├── 1.2 Smart Budget                 # Cập nhật logic + UI Finance
  ├── 1.3 Debt Strategy                # AI prompt + UI Finance
  ├── 1.4 Fix số dư khả dụng           # Bug fix Dashboard
  ├── 1.5 Export PDF                   # Component mới + button
  ├── 1.6 Dark Mode                    # CSS + toggle
  └── 1.7 AI Insights Widget           # Dashboard

Phase 2 (AI Nâng cao)
  ├── 2.1 Context mở rộng              # Cập nhật prompt + data fetch
  ├── 2.2 Conversation Memory          # Schema mới + lưu history
  └── 2.3 Prompt Engineering           # Tinh chỉnh

Phase 3 (Discord Bot)
  ├── 3.1 Interactions webhook         # File mới + verify
  ├── 3.2 Quick commands               # balance, spending, debts, add
  ├── 3.3 AI commands                  # advice, report
  ├── 3.4 Scheduled reminders          # Cron + DM
  └── 3.5 Hướng dẫn deploy            # Discord setup + env
```
