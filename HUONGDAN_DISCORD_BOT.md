# Hướng Dẫn Sử Dụng Discord Bot

## Yêu cầu

- Đã deploy code lên Netlify
- Đã cấu hình `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN` trên Netlify
- Đã nhập Interactions Endpoint URL trên Discord Developer Portal
- Bot đã được invite vào server

Chưa làm các bước trên? Xem `NETLIFY_ENV.md` → mục **Hướng dẫn lấy Discord Keys**.

---

## 1. Slash Commands

### /balance

Xem tổng quan số dư, thu nhập và chi tiêu.

```
Gõ: /balance
```

**Kết quả:**
```
📊 Tổng quan tài chính

Từ trước đến nay:
• Thu nhập: 15.000.000đ
• Chi tiêu: 12.500.000đ
• Còn lại: 2.500.000đ

Tháng 2026-07:
• Thu nhập: 5.000.000đ
• Chi tiêu: 3.200.000đ
• Còn lại: 1.800.000đ
```

### /help

Xem danh sách lệnh khả dụng.

```
Gõ: /help
```

**Kết quả:**
```
🤖 TaiChinh Bot - Trợ lý tài chính

Lệnh khả dụng:
• /balance — Số dư & thu chi
• /help — Danh sách lệnh
```

---

## 2. Cách gọi lệnh

### Trên Discord Desktop/Web

1. Vào server có chứa bot
2. Gõ `/` ở ô chat
3. Danh sách lệnh hiện ra → chọn lệnh
4. Nhấn Enter

### Trên Discord Mobile

1. Chạm vào ô chat
2. Chạm biểu tượng **+** hoặc **/** bên trái
3. Chọn lệnh từ menu
4. Gửi

---

## 3. Xử lý lỗi thường gặp

| Hiện tượng | Nguyên nhân | Fix |
|------------|------------|-----|
| Gõ `/` không thấy lệnh | Chưa đăng ký slash commands | Chạy script `register-commands.js` (xem mục 4) |
| Bot không phản hồi | Interactions URL chưa lưu | Vào Discord Developer Portal → General Information → nhập URL |
| "This interaction failed" | Function bị timeout hoặc lỗi | Kiểm tra Netlify Logs → discord |
| Bot offline | Bot token sai hoặc hết hạn | Reset token trong Discord Developer Portal → Bot |
| /balance không có dữ liệu | MongoDB chưa có transaction | Thêm giao dịch từ app trước |

---

## 4. Đăng ký Slash Commands (khi thêm lệnh mới)

Mỗi khi thêm lệnh mới vào code Discord, cần đăng ký lại với Discord.

**Tạo file `register-commands.js`:**

```javascript
const { REST, Routes } = require('discord.js');

const commands = [
  { name: 'balance', description: 'Xem số dư & thu chi tháng này' },
  { name: 'help', description: 'Danh sách lệnh khả dụng' },
];

const rest = new REST({ version: '10' }).setToken('DISCORD_BOT_TOKEN');

(async () => {
  try {
    console.log('Đang đăng ký slash commands...');
    await rest.put(
      Routes.applicationCommands('DISCORD_APP_ID'),
      { body: commands }
    );
    console.log('✅ Đã đăng ký thành công!');
  } catch (error) {
    console.error('❌ Lỗi:', error);
  }
})();
```

**Chạy:**
```bash
node register-commands.js
```

Thay `DISCORD_BOT_TOKEN` và `DISCORD_APP_ID` bằng giá trị thật.

---

## 5. Kiểm tra nhanh

- [ ] Gõ `/help` → thấy danh sách lệnh
- [ ] Gõ `/balance` → thấy số dư
- [ ] Bot online (có chấm xanh cạnh tên)
