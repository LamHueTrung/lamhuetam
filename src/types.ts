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
  createdAt?: string;
}
