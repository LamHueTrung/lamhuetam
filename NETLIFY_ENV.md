# Hướng Dẫn Cập Nhật Environment Variables trên Netlify

## Các biến môi trường cần thiết

| Variable | Bắt buộc | Mô tả | Ví dụ |
|----------|----------|-------|-------|
| `MONGODB_URI` | ✅ | Chuỗi kết nối MongoDB Atlas | `mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/ios-finance` |
| `GEMINI_API_KEY` | ✅ | API Key cho OpenAI-compatible endpoint | `sk-or-...` hoặc `freellmapi-...` |
| `GEMINI_API_BASE_URL` | ❌ | Base URL (mặc định `https://openrouter.ai/api/v1`) | `https://openrouter.ai/api/v1` hoặc `http://localhost:0801/v1` |
| `GEMINI_MODEL` | ❌ | Tên model (mặc định `google/gemini-2.5-flash`) | `google/gemini-2.5-flash`, `gemini-3.5-flash` |
| `JWT_SECRET` | ✅ | Chuỗi bí mật cho JWT | `chuoi-bi-mat-bat-ky-2026` |

### Biến dành cho Discord Bot (Phase 3)

| Variable | Bắt buộc | Mô tả |
|----------|----------|-------|
| `DISCORD_PUBLIC_KEY` | ✅ | Public key của Discord App |
| `DISCORD_APP_ID` | ✅ | Application ID |
| `DISCORD_BOT_TOKEN` | ✅ | Bot token |
| `DISCORD_USER_ID` | ✅ | Discord User ID của bạn (để bot gửi DM) |

Xem hướng dẫn chi tiết cách lấy các key này ở phần bên dưới.

---

## Các bước thực hiện

### 1. Đăng nhập Netlify

Truy cập [app.netlify.com](https://app.netlify.com) và chọn project của bạn.

### 2. Vào Site Settings

```
Site Overview → Site Settings (gear icon) → Environment variables
```

Hoặc đường dẫn trực tiếp:
```
https://app.netlify.com/sites/<tên-site>/settings/env
```

### 3. Thêm từng biến

Nhấn **Add variable** → **Add single variable** và nhập lần lượt:

```env
Key: MONGODB_URI
Value: mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/ios-finance?retryWrites=true&w=majority
```

```env
Key: GEMINI_API_KEY
Value: AIzaSy...
```

```env
Key: JWT_SECRET
Value: <chuỗi ngẫu nhiên, ví dụ: ios-finance-jwt-khoa-2026>
```

**Lưu ý:** Giá trị `JWT_SECRET` có thể là bất kỳ chuỗi nào. Nếu thay đổi, user sẽ bị đăng xuất và cần đăng nhập lại.

### 4. Import từ file `.env` (nhanh hơn)

Có thể upload file `.env` trực tiếp:

1. Tạo file `.env` ở local với nội dung:
   ```
   MONGODB_URI=mongodb+srv://...
   GEMINI_API_KEY=AIzaSy...
   JWT_SECRET=...
   ```

2. Trên Netlify UI: **Add variable** → **Import from .env file** → chọn file

### 5. Kiểm tra biến đã được inject

Vào **Function** → chọn bất kỳ function (VD: `auth`) → **Logs** → Deploy mới nhất

Hoặc dùng CLI:
```bash
ntl env:list
```

### 6. Redeploy để áp dụng

Sau khi thêm/sửa biến, Netlify tự động redeploy. Nếu không:

```
Deploys → Trigger deploy → Deploy site
```

---

## Kiểm tra sau khi deploy

### Cách 1: Kiểm tra qua API

Gửi request đến `https://<tên-site>.netlify.app/.netlify/functions/auth` (GET).

Nếu trả về JSON hợp lệ → env vars đã hoạt động.

### Cách 2: Kiểm tra logs

```
Functions → chọn function → Logs
```

Nếu có lỗi `MongoDB connection error` hoặc `GEMINI_API_KEY not found` → thiếu/th sai biến.

---

---

## Hướng dẫn lấy Discord Keys

### Bước 1: Tạo Discord Application

1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications)
2. Đăng nhập bằng tài khoản Discord của bạn
3. Nhấn **New Application** → đặt tên (VD: `TaiChinhBot`) → **Create**

### Bước 2: Lấy DISCORD_APP_ID và DISCORD_PUBLIC_KEY

```
Discord Developer Portal → Chọn App vừa tạo
                           → General Information (tab đầu tiên)
```

Tại trang này, bạn sẽ thấy:

| Thông tin | Vị trí | Gán vào |
|-----------|--------|---------|
| **APPLICATION ID** | Dòng đầu tiên, dạng số 19 chữ số | `DISCORD_APP_ID` |
| **PUBLIC KEY** | Dòng bên dưới, dạng mã hex | `DISCORD_PUBLIC_KEY` |

📋 Nhấn nút **Copy** bên cạnh mỗi giá trị, dán vào Netlify env vars.

### Bước 3: Lấy DISCORD_BOT_TOKEN

```
Discord Developer Portal → Chọn App
                           → Bot (menu trái)
                           
1. Nhấn nút **Reset Token** (nếu chưa có)
2. Nhấn **Copy** token vừa xuất hiện
```

**Cấu hình Bot bắt buộc:**

| Toggle | Trạng thái | Ghi chú |
|--------|-----------|---------|
| **Public Bot** | 🔴 TẮT | Để bot chỉ dùng cho server của bạn |
| **Required OAuth2 Code Grant** | 🔴 TẮT | Không cần |
| **Message Content Intent** | 🟢 BẬT | Cần để đọc lệnh |

⚠️ **Lưu ý:** Nếu bạn Reset Token, bot cũ sẽ ngừng hoạt động. Cập nhật token mới vào Netlify ngay sau đó.

### Bước 4: Lấy DISCORD_USER_ID

Đây là ID của **chính bạn** (người dùng Discord), dùng để bot gửi thông báo DM.

**Cách lấy:**

```
Discord Desktop/Web:
  Settings (⚙️) → Advanced (Nâng cao)
    → Developer Mode (Chế độ nhà phát triển) → BẬT

Sau đó:
  Chuột phải vào tên/chân dung của bạn trong danh sách bạn bè/kênh
    → Copy ID
```

ID là một số gồm 17-19 chữ số, dán vào `DISCORD_USER_ID`.

### Bước 5: Cấu hình Interactions Endpoint URL

```
Discord Developer Portal → Chọn App
                           → General Information
                           → INTERACTIONS ENDPOINT URL
```

Nhập URL:
```
https://<tên-site>.netlify.app/.netlify/functions/discord
```

Ví dụ: `https://ios-taichinh.netlify.app/.netlify/functions/discord`

**Lưu ý:** Phải deploy code có chứa file `netlify/functions/discord.ts` trước khi nhập URL này, nếu không Discord sẽ báo lỗi khi xác thực endpoint.

### Bước 6: Invite Bot vào Server

```
Discord Developer Portal → Chọn App
                           → OAuth2 → URL Generator

Scopes:
  ☑️ bot
  ☑️ applications.commands

Bot Permissions:
  ☑️ Send Messages
  ☑️ Read Messages/View Channels
  ☑️ Read Message History
  ☑️ Use Slash Commands

→ Copy URL ở cuối trang → mở tab mới → chọn server → Authorize
```

---

## Tổng kết: Các biến cần nhập vào Netlify

Sau khi làm các bước trên, bạn có 4 giá trị:

```env
DISCORD_APP_ID=123456789012345678
DISCORD_PUBLIC_KEY=abc123def456...
DISCORD_BOT_TOKEN=MTk4NjIyNDgzNDk3NDQ1MjM4...
DISCORD_USER_ID=987654321098765432
```

Thêm chúng vào Netlify như hướng dẫn ở phần [Các bước thực hiện](#các-bước-thực-hiện).

## Lưu ý quan trọng

- ⚠️ **Không** commit file `.env` vào git (đã có trong `.gitignore`)
- 🔒 **Không** share `MONGODB_URI`, `GEMINI_API_KEY`, `JWT_SECRET` với bất kỳ ai
- 🔄 Sau khi thay đổi env vars, cần **redeploy** để có hiệu lực
- 📝 Có thể dùng **Scoping** để giới hạn biến cho Production/Deploy Preview/Branch chỉ định
- 🧪 Nếu dùng Netlify CLI local, cần chạy `ntl dev` để tự động load env vars từ Netlify cloud (không cần file `.env` local)
