# 🧠 AI Advisor — Adaptive Reasoning AI (FINAL PLAN)

## Constraints đã xác nhận
- ✅ Netlify Free → **GitHub Actions** làm cron thay Scheduled Function
- ✅ Có `netlify.toml` → chỉ thêm config, không tạo mới
- ✅ LLM Free (trungsaas proxy) → **Token Budget Strategy** bắt buộc
- ✅ Không có widget UI — AI hiểu số liệu là đủ
- ✅ Chat history: `chat-history.ts` riêng biệt
- ✅ Knowledge: AI verify **3 tiêu chí** (accuracy + vietnam_fit + user_fit theo app data)

---

## 💰 Token Budget Strategy — Tối ưu cho LLM Free

### Vấn đề với LLM Free:
- Giới hạn **TPM (tokens/phút)** và **RPD (requests/day)**
- Prompt hiện tại ước tính ~2,000-3,000 tokens/request → quá lãng phí
- Mỗi lần gọi AI để verify knowledge cũng tốn token

### Kỹ thuật tối ưu Token:

#### 1. Tiered Context Loading (Không load tất cả mọi lúc)
```typescript
// Thay vì dump toàn bộ financeMd mọi lúc → chỉ load đúng section cần thiết

function selectContextTiers(userMessage: string, dna: PersonalDNA) {
  const tiers = {
    tier1: buildCoreSnapshot(),      // ~200 tokens — LUÔN có
    tier2: buildDebtDetail(),        // ~300 tokens — khi hỏi về nợ/thanh toán
    tier3: buildFixedExpenses(),     // ~200 tokens — khi hỏi về chi phí cố định
    tier4: buildTransactionHistory(), // ~400 tokens — khi hỏi về lịch sử/thống kê
    tier5: buildKnowledge(),         // ~200 tokens — khi hỏi về kiến thức tài chính
    tier6: buildDNAInsights(),       // ~200 tokens — khi hỏi về hành vi/kế hoạch
  };

  const needed = detectNeededTiers(userMessage);
  // Câu "tôi còn bao nhiêu tiền" → chỉ tier1 (~200 tokens total)
  // Câu "kế hoạch trả nợ" → tier1 + tier2 + tier6 (~700 tokens)
  // Câu "phân tích chi tiêu" → tier1 + tier3 + tier4 (~800 tokens)
  return Object.entries(tiers)
    .filter(([key]) => needed.includes(key))
    .map(([, val]) => val)
    .join('\n');
}
```

**Ước tính tiết kiệm**: Từ ~2,500 tokens → xuống ~400-900 tokens/request tùy câu hỏi.

#### 2. Compact Format cho Financial Data
```typescript
// ❌ Cũ (dài dòng):
`## 3. 💳 DỰ NỢ & TRẢ GÓP
- **Tổng dư nợ còn lại:** 15,500,000 VNĐ
### 1. Mua điện thoại (Trả góp)
- **Dư nợ còn lại:** 8,500,000 VNĐ / Ban đầu: 12,000,000 VNĐ
- **Tiến độ trả góp:** Đã trả 4/12 kỳ
- **Số tiền trả hàng tháng:** 1,000,000 VNĐ (Hạn trả: Ngày 5)`

// ✅ Mới (compact, ~60% ít token hơn):
`[NỢ] Điện thoại|trả_góp|CÒN:8.5tr/12tr|KỲ:4/12|THÁNG_NÀY:✅paid|TIẾP:05/09/2,659k`
```

#### 3. DNA Compression — Chỉ inject insights có confidence cao
```typescript
// Chỉ đưa vào prompt những behavioral insights có confidence >= 0.6
// Và chỉ top 3 insights liên quan nhất đến câu hỏi hiện tại
const relevantInsights = dna.behavioralInsights
  .filter(i => i.confidence >= 0.6)
  .sort((a, b) => calcRelevance(b, userMessage) - calcRelevance(a, userMessage))
  .slice(0, 3)
  .map(i => `- ${i.insight}`)
  .join('\n');
```

#### 4. Conversation History Compression
```typescript
// Không truyền raw text — compress mỗi tin thành 1 dòng tóm tắt
const compressedHistory = messages.slice(-6).map(m => {
  const role = m.role === 'user' ? 'U' : 'A';
  // Truncate mỗi tin nhắn xuống max 100 chars
  const content = m.content.length > 100 ? m.content.slice(0, 97) + '...' : m.content;
  return `${role}: ${content}`;
}).join('\n');
// ~6 tin x 100 chars ≈ 150-200 tokens thay vì 600-800 tokens
```

#### 5. System Prompt Caching (via consistent wording)
LLM Free thường có **prompt caching** nếu system prompt giống nhau.  
→ Giữ nguyên phần tĩnh của system prompt (persona, rules) — chỉ thay phần dynamic (snapshot, history).  
→ Prefix `[CACHED]` section ở đầu để proxy có thể cache:
```
[STATIC_PERSONA - reuse mọi request]
Bạn là "Lâm Huệ Trung 10 năm sau"...
[Quy tắc phản hồi...]

[DYNAMIC_CONTEXT - thay đổi mỗi request]  
## SNAPSHOT NGÀY HÔM NAY
...
```

#### 6. Knowledge Crawler — Batch AI verify (tiết kiệm token nhất)
```typescript
// ❌ Xấu: Verify từng bài riêng lẻ → N API calls
for (const article of articles) {
  await verifyArticle(article); // 1 call per article
}

// ✅ Tốt: Batch 5 bài/call → chia 5 số API calls
const batches = chunk(articles, 5);
for (const batch of batches) {
  await verifyBatch(batch); // 1 call cho 5 bài
}
// Format response: JSON array với 5 objects → parse ra
```

#### 7. Intent-based max_tokens
```typescript
const tokenBudget = {
  calculate: 150,    // "còn bao nhiêu tiền" → short
  query: 250,        // "kỳ nợ nào chưa trả" → medium
  advice: 400,       // "có nên rút không" → medium
  plan: 800,         // "kế hoạch trả nợ 6 tháng" → long
  motivation: 300,   // "tao mệt quá" → medium-emotional
};
// Thay vì luôn max_tokens=4000 → trung bình giảm 70% token output
```

#### 8. Session Summarization — 1 call thay vì nhiều
```typescript
// Khi session > 10 messages → gọi 1 lần summarize
// Prompt summarize cực ngắn (~300 tokens input → ~150 tokens output)
const summarizePrompt = `Tóm tắt cuộc trò chuyện tài chính này trong 3 dòng ngắn, 
chỉ giữ lại: quyết định quan trọng, số liệu then chốt, kết luận đã đạt được.
---
${last10Messages.map(m => `${m.role}: ${m.content.slice(0, 80)}`).join('\n')}`;
```

### Token Budget Ước tính Per Request:

| Loại query | Trước | Sau | Tiết kiệm |
|------------|-------|-----|-----------|
| "Còn bao nhiêu tiền?" | ~2,500 | ~350 | **86%** |
| "Kế hoạch trả nợ" | ~3,000 | ~900 | **70%** |
| "Phân tích chi tiêu" | ~3,500 | ~1,100 | **69%** |
| "Quick chips" (debt/balance/savings) | ~3,000 | ~800 | **73%** |

---

## 📁 Danh sách file thay đổi (đầy đủ)

---

### 🗄️ DATABASE

#### [MODIFY] [_db.ts](file:///d:/TrungNe/WebAPP/lamhuetam/netlify/functions/_db.ts)
Thêm 3 schemas:
- `PersonalDNASchema` — DNA sống, tự cập nhật
- `AIKnowledgeSchema` — Knowledge crawled + AI-verified (3 tiêu chí)
- `ChatSessionSchema` — Session summary nén

#### [MODIFY] `ChatMessageSchema` (trong `_db.ts`)
Thêm 2 field: `sessionDate: String`, `isCompressed: Boolean`

---

### ⚡ BACKEND

#### [MODIFY] [gemini-advisor.ts](file:///d:/TrungNe/WebAPP/lamhuetam/netlify/functions/gemini-advisor.ts)
- Xóa toàn bộ `promptType` branches cứng nhắc
- Thêm `detectNeededTiers()` — chọn context section cần thiết
- Thêm `buildCompactSnapshot()` — compact format tiết kiệm token
- Thêm `buildAdaptiveSystemPrompt()` — unified prompt với DNA
- Thêm `detectIntent()` → map `max_tokens` phù hợp
- Fix: `pendingDebtThisMonth` chỉ tính kỳ `status=pending`
- Fix: Biết đã nhận lương chưa (check transactions)
- Thêm: Post-conversation insight extraction → update DNA
- Thêm: Lưu messages vào `ChatMessage` DB
- Thêm: Đọc `conversationHistory` + `sessionSummary` từ body

#### [NEW] [chat-history.ts](file:///d:/TrungNe/WebAPP/lamhuetam/netlify/functions/chat-history.ts)
```
GET   → 20 msgs gần nhất + session summary
POST  → Lưu messages mới (user + assistant)
DELETE → Clear history
POST ?action=summarize → AI tóm tắt → lưu ChatSession
```

#### [NEW] [ai-knowledge.ts](file:///d:/TrungNe/WebAPP/lamhuetam/netlify/functions/ai-knowledge.ts)
```
GET ?tags=... → Search relevant knowledge
POST          → Thêm knowledge manual
DELETE        → Xóa entry
```

#### [NEW] [personal-dna.ts](file:///d:/TrungNe/WebAPP/lamhuetam/netlify/functions/personal-dna.ts)
```
GET           → Lấy DNA hiện tại
PUT           → Update manual (constraints, goals)
POST ?action=analyze → Rebuild patterns từ transactions
```

#### [NEW] [knowledge-crawler.ts](file:///d:/TrungNe/WebAPP/lamhuetam/netlify/functions/knowledge-crawler.ts)
- Manual trigger endpoint (thay scheduled function)
- Batch verify 5 bài/call để tiết kiệm token
- Auto-expire entries > 90 ngày

---

### 🤖 GITHUB ACTIONS (Thay Netlify Scheduled)

#### [NEW] `.github/workflows/knowledge-crawler.yml`
```yaml
name: Daily Knowledge Crawler
on:
  schedule:
    - cron: '0 23 * * *'   # 6:00 SA Việt Nam (UTC+7 = UTC-7h)
  workflow_dispatch:          # Cho phép chạy tay

jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger crawler
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRAWLER_SECRET }}" \
            https://YOUR_NETLIFY_SITE/.netlify/functions/knowledge-crawler
```

---

### 🖥️ FRONTEND

#### [MODIFY] [AICovisor.tsx](file:///d:/TrungNe/WebAPP/lamhuetam/src/components/AICovisor.tsx)
- Load history từ `chat-history` khi mount
- Lưu messages lên DB sau mỗi lượt
- Truyền `conversationHistory` (compressed, 6 msgs) + `sessionSummary`
- Xóa chat → DELETE `/chat-history`
- Quick chips → Adaptive suggestions từ DNA (thay chips cứng)
- Unified send → không còn phân loại `promptType` từ client

#### [MODIFY] [netlify.toml](file:///d:/TrungNe/WebAPP/lamhuetam/netlify.toml)
Thêm redirect cho các endpoints mới:
```toml
# Đã có: /api/* → /.netlify/functions/:splat — đủ dùng, không cần thêm
```
→ Không cần thay đổi gì, cấu trúc hiện tại đã cover tất cả.

---

## 🔢 Execution Order (4 phases, ~3-4 ngày)

```
Phase 1 — Foundation & Bug Fix (cao nhất)
  1. _db.ts       : Thêm PersonalDNA + AIKnowledge + ChatSession schema
  2. gemini-advisor.ts : Fix bug nợ + compact snapshot + unified handler
  3. gemini-advisor.ts : Token-optimized adaptive prompt
  4. AICovisor.tsx: Truyền history vào API call

Phase 2 — Memory Layer
  5. chat-history.ts  : CRUD + session summarizer
  6. AICovisor.tsx    : Load/save history + session summarization trigger

Phase 3 — Knowledge & DNA
  7. ai-knowledge.ts     : CRUD + tag search
  8. personal-dna.ts     : CRUD + analyze endpoint  
  9. knowledge-crawler.ts: Manual trigger + batch verify
  10. .github/workflows/ : Cron job

Phase 4 — Polish
  11. AICovisor.tsx: Adaptive smart chips
  12. gemini-advisor.ts: Hoàn thiện post-conversation learning
```

---

## ✅ Verification

1. **Token check**: Log `prompt_tokens` mỗi call → confirm < 1,000 với câu hỏi thông thường
2. **Bug nợ**: Kỳ tháng 8 đã paid → không bị cộng vào dòng tiền
3. **Lương**: Sau ngày lương + có giao dịch thu → AI xác nhận đã nhận
4. **Memory**: Reload → chat vẫn còn, AI nhớ context
5. **Adaptive**: Hỏi về stress → AI dùng DNA context, không bị "không hiểu"
6. **Brevity**: "Còn bao nhiêu?" → ≤ 60 từ, đưa số ngay
