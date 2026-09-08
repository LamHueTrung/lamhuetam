export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  description: string;
  wallet: string;
  isRecurring?: boolean;
  frequency?: 'none' | 'weekly' | 'monthly';
  isCreditCardPaid?: boolean;
  creditCardPaidDate?: string;
  creditCardDueDate?: string;
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
}

export interface DebtInstallment {
  index: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  paidDate?: string;
  status: 'pending' | 'paid' | 'partial';
}

export interface DebtAccount {
  id: string;
  type: 'installment' | 'credit_card' | 'friend';
  name: string;
  originalAmount: number;
  currentBalance: number;
  monthlyPayment: number;
  interestRate: number;
  paymentDay: number;
  startDate: string;
  maturityDate: string;
  totalInstallments: number;
  paidInstallments: number;
  status: 'active' | 'settled';
  installments: DebtInstallment[];
  notes?: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
}

export interface MonthlyPlan {
  month: string;
  income: number;
  fixedExpenses: number;
  debtPayments: number;
  variableExpenses: number;
  savings: number;
  remaining: number;
}

export interface TetPlannerStoredConfig {
  id: string; // 'default'
  netSalary: number;
  expectedBonus: number;
  solarExpense: number;
  lunarExpense: number;
  monthlyLiving: number;
  initialSavings: number;
  updatedAt: string;
}

// Legacy alias for backward compatibility
export type Debt = DebtAccount;

export interface SavingsGoal {
  id: string;
  title: string;
  goalAmount: number;
  currentAmount: number;
  targetDate: string;
  icon: string;
}

export interface Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  type?: 'income' | 'expense';
}

export interface Message {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
}

// ── NEW: Salary ──────────────────────────────────────────
export type LeaveType = 'annual' | 'personal' | 'unpaid';

export interface LeaveDay {
  count: number;
  type: LeaveType;
}

export interface SalaryConfig {
  _id?: string;
  grossSalary: number;
  netSalary: number;
  receiveDay: number;
  workDays: number;
  leaveDays: LeaveDay[];
  lastAutoAddMonth: string;
  notes: string;
}

// ── NEW: Fixed Expenses ───────────────────────────────────
export interface FixedExpenseCategory {
  _id?: string;
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface FixedExpenseTask {
  _id?: string;
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  amount: number;
  month: string;
  note: string;
}

// ── NEW: Diary ────────────────────────────────────────────
export type DiaryMood = 'positive' | 'negative' | 'neutral' | 'excited' | 'sad' | 'angry' | 'grateful';

export interface DiaryReply {
  id: string;
  time: string;
  content: string;
}

export interface DiaryEntry {
  _id?: string;
  id: string;
  date: string;
  content: string;
  mood: DiaryMood;
  location: string;
  lat: number | null;
  lng: number | null;
  tags: string[];
  replies?: DiaryReply[];
  createdAt?: string;
  pinned?: boolean;
}

export type DiaryViewMode = 'timeline' | 'tree' | 'map' | 'calendar';

export interface DiaryFilterState {
  search: string;
  mood: DiaryMood | 'all';
  tag: string;
  month: string | null;
  sort: 'newest' | 'oldest';
}

export interface DiaryStreakData {
  current: number;
  longest: number;
  todayWritten: boolean;
}

export interface DiaryMoodStat {
  mood: DiaryMood;
  count: number;
  percentage: number;
}

// ── NEW: User Profile (Hồ sơ nhân vật) ───────────────────
export interface CustomProfileField {
  id: string;
  label: string;
  value: string;
  category?: string;
}

export interface UserProfile {
  _id?: string;
  fullName: string;
  dob: string;
  hometown: string;
  livingContext: string;
  currentJob: string;
  position: string;
  skills: {
    strongest: string;
    foundation: string;
    usedTech: string[];
    companyTech: string[];
    currentWorry: string;
  };
  education: {
    school: string;
    status: string;
  };
  avatar: string;
  phone: string;
  emails: string[];
  customFields: CustomProfileField[];
  creditCardConfig?: {
    statementDay: number;
    cardName?: string;
  };
  updatedAt?: string;
}

export interface AIConfig {
  _id?: string;
  model: string;
  apiKey?: string;
  hasKey?: boolean;
  baseUrl: string;
  lastTestedAt?: string;
  testStatus: 'connected' | 'invalid_key' | 'quota_exceeded' | 'model_error' | 'network_error' | 'not_tested';
  testMessage?: string;
}

// ── NEW: ML Finance Forecasting Layer ──────────────────────
export interface MLForecastDay {
  date: string;
  predicted_daily_expense: number;
  scheduled_inflow: number;
  scheduled_debt: number;
  predicted_balance: number;
  lower_bound: number;
  upper_bound: number;
}

export interface MLRecurringSalary {
  pay_day_of_month: number;
  amount: number;
  category: string;
  last_received: string;
}

export interface MLRunwayAnalysis {
  current_balance: number;
  daily_burn_rate: number;
  financial_runway_days: number;
  is_financially_safe: boolean;
  min_projected_balance: number;
  first_deficit_date: string | null;
  deficit_days_count: number;
  recurring_salary_detected: MLRecurringSalary | null;
}

export interface MLForecastResponse {
  expense_forecast_metrics?: {
    in_sample_expense_mae: number;
    test_days: number;
    backtest_expense_mae: number;
    backtest_expense_rmse: number;
  };
  runway_analysis: MLRunwayAnalysis;
  obligations_count: number;
  forecasts: {
    '7'?: MLForecastDay[];
    '30'?: MLForecastDay[];
    [key: string]: MLForecastDay[] | undefined;
  };
}

export interface MLAnomalyItem {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  anomaly_score: number;
  severity: 'critical' | 'warning';
}

export interface MLAnomalyResponse {
  total_expenses: number;
  anomaly_count: number;
  anomaly_rate: number;
  applied_threshold: number;
  anomalies: MLAnomalyItem[];
  normal: any[];
}

export interface MLClusterItem {
  cluster_id: number;
  count: number;
  avg_amount: number;
  top_categories: string[];
  avg_day_of_week: number;
}

export interface MLAssociationRule {
  antecedents: string[];
  consequents: string[];
  support: number;
  confidence: number;
  lift: number;
}

export interface MLPatternResponse {
  recommended_k: number;
  clusters: MLClusterItem[];
  rules: MLAssociationRule[];
}

export interface MLCutDetail {
  current_spending: number;
  suggested_cut: number;
  target_spending: number;
}

export interface MLResolutionPlanLevel {
  level: number;
  strategy: string;
  amount_recovered: number;
  details: Record<string, MLCutDetail> | { original_target?: number; adjusted_target?: number; [k: string]: any };
}

export interface MLDeficitResponse {
  original_deficit: number;
  total_recovered: number;
  remaining_unresolved: number;
  is_feasible_now: boolean;
  resolution_plan: MLResolutionPlanLevel[];
}

// ── NEW: ML Decision Layer (Debt Optimizer) ─────────────────
export interface MLDebtInput {
  id: string;
  name: string;
  total_balance: number;
  annual_rate: number;
  due_date?: string | null;
  min_payment?: number | null;
}

export interface MLDailyCashflowInput {
  date: string;
  available: number;
}

export interface MLOptimizeDebtPayload {
  debts: MLDebtInput[];
  daily_cashflows: MLDailyCashflowInput[];
  strategy?: 'avalanche' | 'snowball';
  min_balance_threshold?: number | null;
}

export interface MLPaymentDetail {
  debt_id: string;
  debt_name: string;
  amount: number;
}

export interface MLDailyScheduleItem {
  date: string;
  balance_before_payment: number;
  payments: MLPaymentDetail[];
  total_paid_today: number;
  balance_after_payment: number;
  is_safe: boolean;
}

export interface MLDebtSummaryItem {
  debt_id: string;
  debt_name: string;
  original_balance: number;
  total_paid: number;
  total_interest_accrued: number;
  payoff_date: string | null;
  status: 'paid_off' | 'in_progress';
}

export interface MLOptimizeDebtResponse {
  status: string;
  strategy: 'avalanche' | 'snowball';
  horizon_days: number;
  min_balance_threshold_applied: number;
  total_interest_saved: number;
  is_fully_repayable: boolean;
  daily_schedule: MLDailyScheduleItem[];
  debt_summary: MLDebtSummaryItem[];
  warnings?: string[];
}



