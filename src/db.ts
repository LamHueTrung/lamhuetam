import Dexie, { type EntityTable } from 'dexie';
import type {
  Transaction, Budget, DebtAccount, SavingsGoal, Category,
  FixedExpenseCategory, FixedExpenseTask, SalaryConfig, DiaryEntry, TetPlannerStoredConfig,
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
  tetPlannerConfigs: EntityTable<TetPlannerStoredConfig & { _syncStatus?: string }, 'id'>;
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

db.version(2).stores({
  transactions: 'id, type, category, date, _syncStatus',
  budgets: 'category, _syncStatus',
  debts: 'id, status, _syncStatus',
  savings: 'id, _syncStatus',
  categories: '_id, type, _syncStatus',
  fixedExpenseCategories: 'id, _syncStatus',
  fixedExpenseTasks: 'id, categoryId, month, _syncStatus',
  salaryConfigs: '_id, _syncStatus',
  diary: '_id, date, mood, _syncStatus',
  tetPlannerConfigs: 'id, _syncStatus',
  syncQueue: '++id, table, timestamp, retryCount',
});

export async function saveTetPlannerConfigDB(config: Omit<TetPlannerStoredConfig, 'id'>) {
  const item: TetPlannerStoredConfig = {
    ...config,
    id: 'default',
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem('tet_planner_custom_config', JSON.stringify(item));
  } catch {}
  try {
    await db.tetPlannerConfigs.put(item);
  } catch (err) {
    console.warn('Cannot save to Dexie tetPlannerConfigs, saved to localStorage:', err);
  }
  return item;
}

export async function getTetPlannerConfigDB(): Promise<TetPlannerStoredConfig | null> {
  try {
    const item = await db.tetPlannerConfigs.get('default');
    if (item) return item;
  } catch {}
  try {
    const local = localStorage.getItem('tet_planner_custom_config');
    if (local) return JSON.parse(local);
  } catch {}
  return null;
}

export async function clearTetPlannerConfigDB() {
  try {
    localStorage.removeItem('tet_planner_custom_config');
  } catch {}
  try {
    await db.tetPlannerConfigs.delete('default');
  } catch {}
}

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
    db.tetPlannerConfigs.clear().catch(() => {}),
  ]);
}

export async function getDBRecordCounts() {
  const [
    transactions,
    budgets,
    debts,
    savings,
    categories,
    fixedExpenseCategories,
    fixedExpenseTasks,
    salaryConfigs,
    diary,
    syncQueue,
  ] = await Promise.all([
    db.transactions.count().catch(() => 0),
    db.budgets.count().catch(() => 0),
    db.debts.count().catch(() => 0),
    db.savings.count().catch(() => 0),
    db.categories.count().catch(() => 0),
    db.fixedExpenseCategories.count().catch(() => 0),
    db.fixedExpenseTasks.count().catch(() => 0),
    db.salaryConfigs.count().catch(() => 0),
    db.diary.count().catch(() => 0),
    db.syncQueue.count().catch(() => 0),
  ]);

  const totalRecords =
    transactions +
    budgets +
    debts +
    savings +
    categories +
    fixedExpenseCategories +
    fixedExpenseTasks +
    salaryConfigs +
    diary;

  return {
    transactions,
    budgets,
    debts,
    savings,
    categories,
    fixedExpenseCategories,
    fixedExpenseTasks,
    salaryConfigs,
    diary,
    syncQueue,
    totalRecords,
  };
}

export default db;

