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

