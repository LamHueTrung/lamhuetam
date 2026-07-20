# Tài Chính Cá Nhân

Ứng dụng quản lý tài chính cá nhân với giao diện iOS, quản lý nợ, ngân sách, mục tiêu tiết kiệm và Cố vấn AI Gemini.

## Tính năng

- **Dashboard** — Tổng quan dòng tiền, net worth, biểu đồ chi tiêu
- **Sổ giao dịch** — Thêm/xoá/filter/search giao dịch thu chi
- **Quản lý ngân sách** — Hạn mức chi tiêu theo danh mục, progress bar
- **Công nợ** — Quản lý khoản vay/cho vay, lịch trả nợ theo đợt
- **Mục tiêu tiết kiệm** — Tạo mục tiêu, nạp/rút quỹ, tính toán tiết kiệm hàng tháng
- **Cố vấn AI (Gemini Co-Visor)** — Chat với AI phân tích tài chính, tối ưu nợ, cân đối thu chi
- **Scan AI OCR** — Quét hóa đơn, tự động điền giao dịch
- **Xác thực đăng nhập** — Đăng ký 1 lần, đăng nhập bằng JWT

## Công nghệ

| Frontend | Backend | Database |
|---|---|---|
| React 19 | Netlify Functions (serverless) | MongoDB Atlas |
| TypeScript | Express | Mongoose |
| Vite 6 | Gemini API | |
| Tailwind CSS 4 | JWT Auth | |
| Framer Motion | | |

## Cài đặt & Chạy local

### Yêu cầu
- Node.js 18+
- Netlify CLI
- MongoDB Atlas cluster (free)
- Gemini API Key

### Cài đặt

```bash
npm install
```

### Cấu hình biến môi trường

Tạo file `.env`:

```env
MONGODB_URI="mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/ios-finance"
GEMINI_API_KEY="AIza..."
JWT_SECRET="chuoi-bi-mat-bat-ky"
```

### Chạy local

```bash
npx netlify dev
```

Mở `http://localhost:5173`

## Deploy lên Netlify

1. Push code lên GitHub
2. Vào [app.netlify.com](https://app.netlify.com) → Import từ GitHub
3. Thêm Environment Variables: `MONGODB_URI`, `GEMINI_API_KEY`, `JWT_SECRET`
4. Deploy tự động sau mỗi lần push

## Cấu trúc thư mục

```
├── netlify/functions/       # API serverless
│   ├── _db.ts               # Kết nối MongoDB + Schemas
│   ├── auth.ts              # Đăng ký, đăng nhập
│   ├── transactions.ts      # CRUD giao dịch
│   ├── budgets.ts           # CRUD ngân sách
│   ├── debts.ts             # CRUD công nợ
│   ├── savings.ts           # CRUD tiết kiệm
│   ├── gemini-advisor.ts    # AI tư vấn tài chính
│   └── gemini-ocr.ts        # OCR quét hóa đơn
├── src/
│   ├── api/client.ts        # Fetch wrapper
│   ├── hooks/               # Custom hooks
│   ├── context/             # AuthContext (JWT)
│   └── components/          # UI Components
├── public/
│   └── favicon.svg
├── netlify.toml
└── package.json
```
