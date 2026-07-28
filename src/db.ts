import Dexie, { type EntityTable } from 'dexie';
import type {
  Transaction, Budget, DebtAccount, SavingsGoal, Category,
  FixedExpenseCategory, FixedExpenseTask, SalaryConfig, DiaryEntry,
} from './types';

export interface SyncQueueItem {
  id?: number;
  table: string;
  operation: 'create' | 'update' | 'delete';
  endpoint: string;
  method: string;
  body?: any;
  localId?: string;
  timestamp: number;
  retryCount: number;
}

const db = new Dexie('TaiChinhCaNhan') as Dexie & {
  transactions: EntityTable<Transaction & { _syncStatus?: string }, 'id'>;
  budgets: EntityTable<Budget & { _syncStatus?: string }, 'category'>;
  debts: EntityTable<DebtAccount & { _syncStatus?: string }, 'id'>;
  savings: EntityTable<SavingsGoal & { _syncStatus?: string }, 'id'>;
  categories: EntityTable<Category & { _syncStatus?: string }, '_id'>;
  fixedExpenseCategories: EntityTable<FixedExpenseCategory & { _syncStatus?: string }, 'id'>;
  fixedExpenseTasks: EntityTable<FixedExpenseTask & { _syncStatus?: string }, 'id'>;
  salaryConfigs: EntityTable<SalaryConfig & { _syncStatus?: string }, '_id'>;
  diary: EntityTable<DiaryEntry & { _syncStatus?: string }, '_id'>;
  syncQueue: EntityTable<SyncQueueItem, 'id'>;
};

db.version(1).stores({
  transactions: 'id, type, category, date, _syncStatus',
  budgets: 'category, _syncStatus',
  debts: 'id, status, _syncStatus',
  savings: 'id, _syncStatus',
  categories: '_id, type, _syncStatus',
  fixedExpenseCategories: 'id, _syncStatus',
  fixedExpenseTasks: 'id, categoryId, month, _syncStatus',
  salaryConfigs: '_id, _syncStatus',
  diary: '_id, date, mood, _syncStatus',
  syncQueue: '++id, table, timestamp, retryCount',
});

export async function clearAllCaches() {
  await Promise.all([
    db.transactions.clear(),
    db.budgets.clear(),
    db.debts.clear(),
    db.savings.clear(),
    db.categories.clear(),
    db.fixedExpenseCategories.clear(),
    db.fixedExpenseTasks.clear(),
    db.salaryConfigs.clear(),
    db.diary.clear(),
  ]);
}

export default db;
