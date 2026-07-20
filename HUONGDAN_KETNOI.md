# Hướng Dẫn Kiểm Tra Kết Nối

## 1. Kiểm tra Gemini API Key

### Cách 1: Test qua API trực tiếp

Gửi request POST đến Gemini advisor endpoint:

```bash
curl -X POST https://<site>.netlify.app/.netlify/functions/gemini-advisor \
  -H "Content-Type: application/json" \
  -d '{"promptType":"custom","customMessage":"Xin chào"}'
```

**Kết quả thành công:** Trả về JSON chứa `{ "text": "...phản hồi từ AI..." }`

**Kết quả lỗi API key:**
```json
{ "error": "Missing API Key", "message": "..." }
```
→ Chưa cấu hình `GEMINI_API_KEY` trên Netlify.

```json
{ "error": "Invalid API Key", "message": "..." }
```
→ Key không đúng định dạng (`AIza...` hoặc `AQ.`).

### Cách 2: Test từ App

Mở app → Tab **Cố vấn AI** → Gửi tin nhắn bất kỳ. Nếu AI trả lời được → API key OK.

---

## 2. Kiểm tra Discord Interactions Endpoint

### Bước 1: Deploy code mới

Push code lên GitHub (hoặc trigger redeploy trên Netlify):

```bash
git add .
git commit -m "Add Discord interactions handler + fix Gemini API key"
git push
```

Hoặc vào Netlify Dashboard → **Deploys** → **Trigger deploy** → **Deploy site**.

### Bước 2: Kiểm tra function đã hoạt động

Mở trình duyệt (hoặc dùng curl) gọi trực tiếp:

```
https://<site>.netlify.app/.netlify/functions/discord
```

Nếu trả về `405 Method Not Allowed` → Function đã hoạt động (vì chỉ chấp nhận POST).

### Bước 3: Cấu hình Interactions Endpoint URL trên Discord

1. Vào [Discord Developer Portal](https://discord.com/developers/applications)
2. Chọn Application của bạn
3. Tab **General Information**
4. Mục **INTERACTIONS ENDPOINT URL**, nhập:
   ```
   https://<site>.netlify.app/.netlify/functions/discord
   ```
5. Nhấn **Save Changes**

**Kết quả:**
- 🟢 **Thành công:** Dòng chữ xanh hiện lên "Interaction Endpoint URL updated successfully"
- 🔴 **Thất bại:** "Không thể xác thực URL điểm cuối tương tác" → Kiểm tra:
  - Đã deploy function `discord.ts` chưa?
  - `DISCORD_PUBLIC_KEY` trên Netlify có khớp với App không?
  - URL đã chính xác chưa? (VD: thiếu `.netlify.app`)

### Bước 4: Kiểm tra logs nếu lỗi xác thực

Vào Netlify Dashboard:
```
Functions → discord → Logs → Deploy gần nhất
```

Các lỗi thường gặp trong logs:

| Log error | Nguyên nhân | Fix |
|-----------|------------|-----|
| `DISCORD_PUBLIC_KEY not configured` | Chưa thêm env var | Thêm `DISCORD_PUBLIC_KEY` vào Netlify |
| `Invalid signature` | Public Key sai | Copy lại từ Discord Developer Portal |
| `Signature verification failed` | Header thiếu/ sai | Kiểm tra URL endpoint, deploy lại |

---

## 3. Đăng ký Slash Commands

Discord yêu cầu đăng ký lệnh slash command trước khi dùng.

### Cách 1: Dùng Discord Developer Portal (thủ công)

1. Vào Discord Developer Portal → App → **Slash Commands** (trái)
2. Nhấn **Create Command**
3. Nhập từng lệnh:

| Lệnh | Mô tả | Options |
|------|-------|---------|
| `balance` | Xem số dư & thu chi | _(không có)_ |
| `help` | Danh sách lệnh | _(không có)_ |

4. Nhấn **Save Changes**

Lặp lại cho cả 2 lệnh.

### Cách 2: Dùng script (tự động - khuyên dùng)

Tạo file `register-commands.js` tại thư mục gốc:

```javascript
const { REST, Routes } = require('discord.js');

const commands = [
  {
    name: 'balance',
    description: 'Xem số dư & thu chi tháng này',
  },
  {
    name: 'help',
    description: 'Danh sách lệnh khả dụng',
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('Đang đăng ký slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_APP_ID),
      { body: commands }
    );
    console.log('✅ Đã đăng ký thành công!');
  } catch (error) {
    console.error('❌ Lỗi:', error);
  }
})();
```

Chạy script:

```bash
DISCORD_APP_ID=<app_id> DISCORD_BOT_TOKEN=<bot_token> node register-commands.js
```

---

## 4. Kiểm tra Bot trong Discord

### Bước 1: Invite Bot vào Server

Nếu chưa invite:

1. Discord Developer Portal → App → **OAuth2** → **URL Generator**
2. Tích **bot** + **applications.commands**
3. Copy URL → mở tab mới → chọn server → Authorize

### Bước 2: Test Slash Command

Trong server Discord, gõ:

```
/balance
```

**Kết quả mong đợi:**

> **📊 Tổng quan tài chính**
> 
> **Từ trước đến nay:**
> • Thu nhập: `15.000.000đ`
> • Chi tiêu: `12.500.000đ`
> • Còn lại: `2.500.000đ`
> 
> **Tháng 2026-07:**
> • Thu nhập: `5.000.000đ`
> • Chi tiêu: `3.200.000đ`
> • Còn lại: `1.800.000đ`

Nếu bot không phản hồi:
- Bot có online không? (kiểm tra Discord thành viên)
- Đã deploy function chưa?
- Interactions Endpoint URL đã lưu chưa?

Test `/help`:

> **🤖 TaiChinh Bot - Trợ lý tài chính**
> 
> **Lệnh khả dụng:**
> • `/balance` — Số dư & thu chi
> • `/help` — Danh sách lệnh

---

## 5. Xử lý lỗi thường gặp

### Bot không phản hồi dù endpoint OK

| Vấn đề | Kiểm tra |
|--------|----------|
| Bot chưa invite vào server | Vào Discord → thấy bot trong member list? |
| Slash command chưa đăng ký | Gõ `/` → có thấy command không? |
| Bot không có quyền | Check OAuth2 permissions |
| Function bị timeout (>10s) | Logs Netlify có dòng `Duration: 10000ms`? |

### Endpoint vẫn báo lỗi xác thực

Public Key có thể bị copy thiếu ký tự. So sánh:

| Nơi lấy | Định dạng |
|----------|-----------|
| Discord Portal | `abc123def456...` (hex, 64 ký tự) |
| Netlify env | Phải giống hệt |

### Key Gemini từ AI Studio không hoạt động

- Key dạng `AQ.` đã được hỗ trợ (fix ở trên)
- Nếu vẫn lỗi: lấy key mới tại https://aistudio.google.com/apikey
- Đảm bảo đã bật Gemini API trong Google Cloud Console

---

## 6. Tóm tắt luồng kiểm tra nhanh

```mermaid
graph TD
    A[Deploy code lên Netlify] --> B[Check /discord endpoint]
    B --> C[Cấu hình URL trên Discord Portal]
    C --> D{Save thành công?}
    D -- Yes --> E[Đăng ký slash commands]
    D -- No --> F[Check logs Netlify + Public Key]
    E --> G[/balance trong Discord]
    G --> H{Có phản hồi?}
    H -- Yes --> I[✅ Thành công!]
    H -- No --> J[Check bot permissions + invite]
```

---

## Checklist hoàn tất

- [ ] Deploy code lên Netlify
- [ ] Thêm `DISCORD_PUBLIC_KEY`, `DISCORD_APP_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_USER_ID` vào Netlify env
- [ ] Interactions Endpoint URL lưu thành công trên Discord Portal
- [ ] Đăng ký slash commands (`/balance`, `/help`)
- [ ] Invite bot vào server
- [ ] Test `/balance` → có dữ liệu
- [ ] Test `/help` → hiển thị danh sách lệnh
- [ ] Test Gemini AI trong app (tab Cố vấn AI)
