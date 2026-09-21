-- ==============================================================================
-- CƠ SỞ DỮ LIỆU POSTGRESQL CHO HỆ THỐNG LÂM HUỆ TRUNG (SUPABASE)
-- Lưu ý: Bạn có thể copy toàn bộ file này và chạy trong Supabase SQL Editor.
-- ==============================================================================

-- 1. BẬT CÁC EXTENSION CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ==============================================================================
-- 2. CÁC BẢNG QUẢN TRỊ NGƯỜI DÙNG & CẤU HÌNH
-- ==============================================================================

-- Bảng Hồ Sơ Người Dùng (UserProfile)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT DEFAULT '',
    dob TEXT DEFAULT '',
    hometown TEXT DEFAULT '',
    living_context TEXT DEFAULT '',
    current_job TEXT DEFAULT '',
    position TEXT DEFAULT '',
    skills JSONB DEFAULT '{}'::JSONB,
    education JSONB DEFAULT '{}'::JSONB,
    avatar TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    emails JSONB DEFAULT '[]'::JSONB,
    custom_fields JSONB DEFAULT '[]'::JSONB,
    credit_card_config JSONB DEFAULT '{}'::JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Cấu Hình Lương (SalaryConfig)
CREATE TABLE IF NOT EXISTS public.salary_configs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gross_salary NUMERIC DEFAULT 0,
    net_salary NUMERIC DEFAULT 0,
    receive_day INT DEFAULT 5,
    work_days INT DEFAULT 22,
    leave_days JSONB DEFAULT '[]'::JSONB,
    last_auto_add_month TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. CÁC BẢNG QUẢN LÝ TÀI CHÍNH
-- ==============================================================================

-- Bảng Danh Mục Thu/Chi (Categories)
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'mdi-cash',
    color TEXT DEFAULT '#3B82F6',
    display_order INT DEFAULT 0,
    type TEXT DEFAULT 'expense',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Giao Dịch Sổ Cái (Transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT DEFAULT '',
    wallet TEXT DEFAULT 'Tiền mặt',
    receipt_url TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    frequency TEXT DEFAULT 'none',
    is_credit_card_paid BOOLEAN DEFAULT FALSE,
    credit_card_paid_date TEXT,
    credit_card_due_date TEXT,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Ngân Sách Danh Mục (Budgets)
CREATE TABLE IF NOT EXISTS public.budgets (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    "limit" NUMERIC NOT NULL DEFAULT 0,
    spent NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Quản Lý Nợ & Trả Góp (DebtAccounts)
CREATE TABLE IF NOT EXISTS public.debts (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    original_amount NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    monthly_payment NUMERIC DEFAULT 0,
    interest_rate NUMERIC DEFAULT 0,
    payment_day INT DEFAULT 1,
    start_date TEXT DEFAULT '',
    maturity_date TEXT DEFAULT '',
    total_installments INT DEFAULT 0,
    paid_installments INT DEFAULT 0,
    status TEXT DEFAULT 'active',
    installments JSONB DEFAULT '[]'::JSONB,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Mục Tiêu Tiết Kiệm (SavingsGoals)
CREATE TABLE IF NOT EXISTS public.savings (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    goal_amount NUMERIC NOT NULL DEFAULT 0,
    current_amount NUMERIC DEFAULT 0,
    target_date TEXT DEFAULT '',
    icon TEXT DEFAULT 'mdi-piggy-bank',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Chi Phí Cố Định (Fixed Expenses)
CREATE TABLE IF NOT EXISTS public.fixed_expense_categories (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'mdi-file-document',
    color TEXT DEFAULT '#10B981'
);

CREATE TABLE IF NOT EXISTS public.fixed_expense_tasks (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    name TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    month TEXT NOT NULL,
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Kế Hoạch Tài Chính Tết (TetFinancialPlanner)
CREATE TABLE IF NOT EXISTS public.tet_planner_configs (
    id TEXT PRIMARY KEY DEFAULT 'default',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    net_salary NUMERIC DEFAULT 0,
    expected_bonus NUMERIC DEFAULT 0,
    solar_expense NUMERIC DEFAULT 0,
    lunar_expense NUMERIC DEFAULT 0,
    monthly_living NUMERIC DEFAULT 0,
    initial_savings NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. BẢNG NHẬT KÝ & TIỆN ÍCH
-- ==============================================================================

-- Bảng Nhật Ký & Bản Tin (DiaryEntry)
CREATE TABLE IF NOT EXISTS public.diary_entries (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    content TEXT NOT NULL,
    mood TEXT DEFAULT 'neutral',
    location TEXT DEFAULT '',
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    tags JSONB DEFAULT '[]'::JSONB,
    images JSONB DEFAULT '[]'::JSONB,
    replies JSONB DEFAULT '[]'::JSONB,
    pinned BOOLEAN DEFAULT FALSE,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Lịch & Sự Kiện (CalendarEvents)
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    event_type TEXT DEFAULT 'custom',
    date_type TEXT DEFAULT 'solar',
    solar_date TEXT DEFAULT '',
    lunar_date TEXT DEFAULT '',
    month INT,
    day INT,
    color TEXT DEFAULT '#3B82F6',
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. BẢNG PHÒNG LAB SOC-NOC & ML PRECOMPUTE
-- ==============================================================================

-- Bảng Event Logs cho SOC-NOC Lab
CREATE TABLE IF NOT EXISTS public.event_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    level TEXT DEFAULT 'info',
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::JSONB,
    ip_address TEXT,
    user_agent TEXT,
    latency_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Cache Chỉ Số ML Tính Toán Sẵn (ML Precomputed Metrics)
CREATE TABLE IF NOT EXISTS public.ml_precomputed_metrics (
    id TEXT PRIMARY KEY DEFAULT 'current_metrics',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    runway_days INT DEFAULT 0,
    daily_burn_rate NUMERIC DEFAULT 0,
    projected_forecast JSONB DEFAULT '{}'::JSONB,
    anomalies JSONB DEFAULT '[]'::JSONB,
    last_computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. BẢNG CHIA SẺ GIA ĐÌNH / NGÂN SÁCH CHUNG (SHARED BUDGETS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.shared_budgets (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budget_members (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    shared_budget_id TEXT REFERENCES public.shared_budgets(id) ON DELETE CASCADE,
    member_email TEXT NOT NULL,
    role TEXT DEFAULT 'viewer',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. BẬT ROW LEVEL SECURITY (RLS) BẢO MẬT ĐA TẦNG
-- ==============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_expense_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tet_planner_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_precomputed_metrics ENABLE ROW LEVEL SECURITY;

-- Policies: Cho phép truy cập dữ liệu (Public / Authenticated User)
CREATE POLICY user_profiles_policy ON public.user_profiles FOR ALL USING (true);
CREATE POLICY transactions_policy ON public.transactions FOR ALL USING (true);
CREATE POLICY categories_policy ON public.categories FOR ALL USING (true);
CREATE POLICY debts_policy ON public.debts FOR ALL USING (true);
CREATE POLICY diary_entries_policy ON public.diary_entries FOR ALL USING (true);
CREATE POLICY event_logs_policy ON public.event_logs FOR ALL USING (true);
CREATE POLICY budgets_policy ON public.budgets FOR ALL USING (true);
CREATE POLICY savings_policy ON public.savings FOR ALL USING (true);
CREATE POLICY fixed_expense_categories_policy ON public.fixed_expense_categories FOR ALL USING (true);
CREATE POLICY fixed_expense_tasks_policy ON public.fixed_expense_tasks FOR ALL USING (true);
CREATE POLICY salary_configs_policy ON public.salary_configs FOR ALL USING (true);
CREATE POLICY tet_planner_configs_policy ON public.tet_planner_configs FOR ALL USING (true);
CREATE POLICY calendar_events_policy ON public.calendar_events FOR ALL USING (true);
CREATE POLICY ml_precomputed_metrics_policy ON public.ml_precomputed_metrics FOR ALL USING (true);
CREATE POLICY shared_budgets_policy ON public.shared_budgets FOR ALL USING (true);
CREATE POLICY budget_members_policy ON public.budget_members FOR ALL USING (true);

