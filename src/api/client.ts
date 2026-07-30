import db from '../db';
import { enqueue } from '../services/syncService';

const BASE = '/.netlify/functions';

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.message || err.error || 'Request failed');
  }
  return res.json();
}

function genLocalId(): string {
  return 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

// ── Cache helpers ──────────────────────────────────────────

async function cacheList<T>(table: any, data: T[]): Promise<T[]> {
  try {
    await table.clear();
    const withStatus = data.map((d: any) => ({ ...d, _syncStatus: 'synced' }));
    await table.bulkPut(withStatus);
  } catch { /* cache write best-effort */ }
  return data;
}

async function cachePut<T>(table: any, item: T): Promise<T> {
  try {
    await table.put({ ...(item as any), _syncStatus: 'synced' });
  } catch { /* cache write best-effort */ }
  return item;
}

async function cacheDelete(table: any, key: any) {
  try { await table.delete(key); } catch { /* best-effort */ }
}

async function readCache<T>(table: any): Promise<T[]> {
  return (await table.toArray()) as T[];
}

async function readCacheOne<T>(table: any, key: any): Promise<T | null> {
  return (await table.get(key)) as T | null;
}

function isNetworkError(err: any): boolean {
  return err instanceof TypeError || err.message === 'Failed to fetch' || !navigator.onLine;
}

// ── Transactions ───────────────────────────────────────────

async function listTransactions() {
  try {
    const data = await apiFetch(`${BASE}/transactions`);
    return cacheList(db.transactions, data);
  } catch (err: any) {
    if (isNetworkError(err)) {
      const cached = await readCache<any>(db.transactions);
      if (cached.length) return cached;
    }
    throw err;
  }
}

async function createTransaction(data: any) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/transactions`, { method: 'POST', body: JSON.stringify(data) });
      return cachePut(db.transactions, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  const localId = genLocalId();
  const local = { ...data, id: localId, _syncStatus: 'pending' };
  await db.transactions.add(local);
  await enqueue('transactions', 'create', `${BASE}/transactions`, 'POST', data, localId);
  return local;
}

async function updateTransaction(id: string, data: any) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/transactions`, { method: 'PUT', body: JSON.stringify({ id, ...data }) });
      return cachePut(db.transactions, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  const updateData = { id, ...data, _syncStatus: 'pending' };
  await db.transactions.put(updateData);
  await enqueue('transactions', 'update', `${BASE}/transactions`, 'PUT', { id, ...data });
  return updateData;
}

async function deleteTransaction(id: string) {
  if (navigator.onLine) {
    try {
      await apiFetch(`${BASE}/transactions?id=${id}`, { method: 'DELETE' });
      await cacheDelete(db.transactions, id);
      return;
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  await db.transactions.delete(id);
  await enqueue('transactions', 'delete', `${BASE}/transactions`, 'DELETE', undefined, id);
}

// ── Budgets ────────────────────────────────────────────────

async function listBudgets() {
  try {
    const data = await apiFetch(`${BASE}/budgets`);
    return cacheList(db.budgets, data);
  } catch (err: any) {
    if (isNetworkError(err)) {
      const cached = await readCache<any>(db.budgets);
      if (cached.length) return cached;
    }
    throw err;
  }
}

async function updateBudgetLimit(category: string, limit: number) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/budgets`, { method: 'PUT', body: JSON.stringify({ category, limit }) });
      return cachePut(db.budgets, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  const local = { category, limit, spent: 0, _syncStatus: 'pending' };
  await db.budgets.put(local);
  await enqueue('budgets', 'update', `${BASE}/budgets`, 'PUT', { category, limit });
  return local;
}

// ── Debts ──────────────────────────────────────────────────

async function listDebts() {
  try {
    const data = await apiFetch(`${BASE}/debts`);
    return cacheList(db.debts, data);
  } catch (err: any) {
    if (isNetworkError(err)) {
      const cached = await readCache<any>(db.debts);
      if (cached.length) return cached;
    }
    throw err;
  }
}

async function createDebt(data: any) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/debts`, { method: 'POST', body: JSON.stringify(data) });
      return cachePut(db.debts, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  const localId = genLocalId();
  const local = { ...data, id: localId, _syncStatus: 'pending' };
  await db.debts.add(local);
  await enqueue('debts', 'create', `${BASE}/debts`, 'POST', data, localId);
  return local;
}

async function deleteDebt(id: string) {
  if (navigator.onLine) {
    try {
      await apiFetch(`${BASE}/debts?id=${id}`, { method: 'DELETE' });
      await cacheDelete(db.debts, id);
      return;
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  await db.debts.delete(id);
  await enqueue('debts', 'delete', `${BASE}/debts`, 'DELETE', undefined, id);
}

async function payDebtInstallments(debtId: string, installmentIndices: number[], partialAmounts?: Record<number, number>, note?: string) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/debts`, { method: 'PUT', body: JSON.stringify({ debtId, installmentIndices, partialAmounts, note }) });
      return cachePut(db.debts, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  await enqueue('debts', 'update', `${BASE}/debts`, 'PUT', { debtId, installmentIndices, partialAmounts, note });
  throw new Error('Không có kết nối mạng. Vui lòng thử lại sau.');
}

async function updateDebt(debtId: string, updateData: any) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/debts`, { method: 'PUT', body: JSON.stringify({ debtId, updateData }) });
      return cachePut(db.debts, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  await enqueue('debts', 'update', `${BASE}/debts`, 'PUT', { debtId, updateData });
  throw new Error('Không có kết nối mạng. Vui lòng thử lại sau.');
}

// ── Savings ────────────────────────────────────────────────

async function listSavings() {
  try {
    const data = await apiFetch(`${BASE}/savings`);
    return cacheList(db.savings, data);
  } catch (err: any) {
    if (isNetworkError(err)) {
      const cached = await readCache<any>(db.savings);
      if (cached.length) return cached;
    }
    throw err;
  }
}

async function updateSavings(amount: number) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/savings`, { method: 'PUT', body: JSON.stringify({ amount }) });
      return cachePut(db.savings, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  await enqueue('savings', 'update', `${BASE}/savings`, 'PUT', { amount });
  throw new Error('Không có kết nối mạng. Vui lòng thử lại sau.');
}

// ── Categories ─────────────────────────────────────────────

async function listCategories() {
  try {
    const data = await apiFetch(`${BASE}/categories`);
    return cacheList(db.categories, data);
  } catch (err: any) {
    if (isNetworkError(err)) {
      const cached = await readCache<any>(db.categories);
      if (cached.length) return cached;
    }
    throw err;
  }
}

async function createCategory(data: any) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/categories`, { method: 'POST', body: JSON.stringify(data) });
      return cachePut(db.categories, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  const localId = genLocalId();
  const local = { ...data, _id: localId, _syncStatus: 'pending' };
  await db.categories.add(local);
  await enqueue('categories', 'create', `${BASE}/categories`, 'POST', data, localId);
  return local;
}

async function updateCategory(data: any) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/categories`, { method: 'PUT', body: JSON.stringify(data) });
      return cachePut(db.categories, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  await enqueue('categories', 'update', `${BASE}/categories`, 'PUT', data);
  throw new Error('Không có kết nối mạng. Vui lòng thử lại sau.');
}

async function deleteCategory(_id: string) {
  if (navigator.onLine) {
    try {
      await apiFetch(`${BASE}/categories`, { method: 'DELETE', body: JSON.stringify({ _id }) });
      await cacheDelete(db.categories, _id);
      return;
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  await db.categories.delete(_id);
  await enqueue('categories', 'delete', `${BASE}/categories`, 'DELETE', { _id });
}

async function reorderCategories(orderedIds: string[]) {
  try {
    const cached = await readCache<any>(db.categories);
    if (cached && cached.length) {
      const map = new Map(cached.map((c: any) => [c._id, c]));
      const updated = orderedIds.map((id, i) => {
        const item = map.get(id);
        return item ? { ...item, order: i } : null;
      }).filter(Boolean);
      if (updated.length) {
        await db.categories.bulkPut(updated as any);
      }
    }
  } catch (err) {
    console.error("Failed to update IndexedDB during category reordering:", err);
  }

  if (navigator.onLine) {
    try {
      await apiFetch(`${BASE}/categories/reorder`, { method: 'PUT', body: JSON.stringify({ orderedIds }) });
      return;
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  await enqueue('categories', 'update', `${BASE}/categories/reorder`, 'PUT', { orderedIds });
  throw new Error('Không có kết nối mạng. Vui lòng thử lại sau.');
}

// ── Salary ─────────────────────────────────────────────────

async function getSalary() {
  try {
    const data = await apiFetch(`${BASE}/salary`);
    return cachePut(db.salaryConfigs, data);
  } catch (err: any) {
    if (isNetworkError(err)) {
      const cached = await db.salaryConfigs.toArray();
      if (cached.length) return cached[0];
    }
    throw err;
  }
}

async function saveSalary(data: any) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/salary`, { method: 'POST', body: JSON.stringify(data) });
      return cachePut(db.salaryConfigs, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  const local = { ...data, _syncStatus: 'pending' };
  await db.salaryConfigs.put(local);
  await enqueue('salaryConfigs', 'update', `${BASE}/salary`, 'POST', data);
  return local;
}

async function autoAddSalary() {
  const result = await apiFetch(`${BASE}/salary`, { method: 'POST', body: JSON.stringify({ action: 'auto_add' }) });
  return cachePut(db.salaryConfigs, result);
}

// ── Fixed Expenses ─────────────────────────────────────────

async function getFixedCategories() {
  try {
    const data = await apiFetch(`${BASE}/fixed-expenses?type=categories`);
    return cacheList(db.fixedExpenseCategories, data);
  } catch (err: any) {
    if (isNetworkError(err)) {
      const cached = await readCache<any>(db.fixedExpenseCategories);
      if (cached.length) return cached;
    }
    throw err;
  }
}

async function getFixedTasks(month: string) {
  try {
    const data = await apiFetch(`${BASE}/fixed-expenses?type=tasks&month=${month}`);
    return cacheList(db.fixedExpenseTasks, data);
  } catch (err: any) {
    if (isNetworkError(err)) {
      const cached = await readCache<any>(db.fixedExpenseTasks);
      if (cached.length) return cached;
    }
    throw err;
  }
}

async function createFixedCategory(data: any) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/fixed-expenses`, {
        method: 'POST', body: JSON.stringify({ ...data, entity: 'category' }),
      });
      return cachePut(db.fixedExpenseCategories, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  const localId = genLocalId();
  const local = { ...data, id: localId, _syncStatus: 'pending' };
  await db.fixedExpenseCategories.add(local);
  await enqueue('fixedExpenseCategories', 'create', `${BASE}/fixed-expenses`, 'POST', { ...data, entity: 'category' }, localId);
  return local;
}

async function updateFixedCategory(data: any) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/fixed-expenses`, {
        method: 'PUT', body: JSON.stringify({ ...data, entity: 'category' }),
      });
      return cachePut(db.fixedExpenseCategories, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  await enqueue('fixedExpenseCategories', 'update', `${BASE}/fixed-expenses`, 'PUT', { ...data, entity: 'category' });
  throw new Error('Không có kết nối mạng.');
}

async function deleteFixedCategory(id: string) {
  if (navigator.onLine) {
    try {
      await apiFetch(`${BASE}/fixed-expenses?id=${id}&entity=category`, { method: 'DELETE' });
      await cacheDelete(db.fixedExpenseCategories, id);
      return;
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  await db.fixedExpenseCategories.delete(id);
  await enqueue('fixedExpenseCategories', 'delete', `${BASE}/fixed-expenses`, 'DELETE', { id, entity: 'category' }, id);
}

async function createFixedTask(data: any) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/fixed-expenses`, {
        method: 'POST', body: JSON.stringify({ ...data, entity: 'task' }),
      });
      return cachePut(db.fixedExpenseTasks, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  const localId = genLocalId();
  const local = { ...data, id: localId, _syncStatus: 'pending' };
  await db.fixedExpenseTasks.add(local);
  await enqueue('fixedExpenseTasks', 'create', `${BASE}/fixed-expenses`, 'POST', { ...data, entity: 'task' }, localId);
  return local;
}

async function updateFixedTask(data: any) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/fixed-expenses`, {
        method: 'PUT', body: JSON.stringify({ ...data, entity: 'task' }),
      });
      return cachePut(db.fixedExpenseTasks, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  await enqueue('fixedExpenseTasks', 'update', `${BASE}/fixed-expenses`, 'PUT', { ...data, entity: 'task' });
  throw new Error('Không có kết nối mạng.');
}

async function deleteFixedTask(id: string) {
  if (navigator.onLine) {
    try {
      await apiFetch(`${BASE}/fixed-expenses?id=${id}&entity=task`, { method: 'DELETE' });
      await cacheDelete(db.fixedExpenseTasks, id);
      return;
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  await db.fixedExpenseTasks.delete(id);
  await enqueue('fixedExpenseTasks', 'delete', `${BASE}/fixed-expenses`, 'DELETE', { entity: 'task' }, id);
}

// ── Diary ──────────────────────────────────────────────────

async function listDiary(params?: { month?: string; mood?: string }) {
  const qs = new URLSearchParams(params as any).toString();
  try {
    const data = await apiFetch(`${BASE}/diary${qs ? '?' + qs : ''}`);
    return cacheList(db.diary, data);
  } catch (err: any) {
    if (isNetworkError(err)) {
      let cached = await readCache<any>(db.diary);
      if (params?.month) {
        cached = cached.filter((e: any) => e.date?.startsWith(params.month!));
      }
      if (params?.mood) {
        cached = cached.filter((e: any) => e.mood === params.mood);
      }
      if (cached.length) return cached;
    }
    throw err;
  }
}

async function createDiary(data: any) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/diary`, { method: 'POST', body: JSON.stringify(data) });
      return cachePut(db.diary, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  const localId = genLocalId();
  const local = { ...data, id: localId, _id: localId, _syncStatus: 'pending' };
  await db.diary.add(local);
  await enqueue('diary', 'create', `${BASE}/diary`, 'POST', data, localId);
  return local;
}

async function updateDiary(id: string, data: any) {
  if (navigator.onLine) {
    try {
      const result = await apiFetch(`${BASE}/diary`, { method: 'PUT', body: JSON.stringify({ id, ...data }) });
      return cachePut(db.diary, result);
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  const updateData = { ...data, _id: id, _syncStatus: 'pending' };
  await db.diary.put(updateData);
  await enqueue('diary', 'update', `${BASE}/diary`, 'PUT', { id, ...data });
  return updateData;
}

async function deleteDiary(id: string) {
  if (navigator.onLine) {
    try {
      await apiFetch(`${BASE}/diary?id=${id}`, { method: 'DELETE' });
      await cacheDelete(db.diary, id);
      return;
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
  }
  await db.diary.delete(id);
  await enqueue('diary', 'delete', `${BASE}/diary`, 'DELETE', undefined, id);
}

// ── Profile ────────────────────────────────────────────────

async function getProfile() {
  try {
    const data = await apiFetch(`${BASE}/profile`);
    localStorage.setItem('user_profile_data', JSON.stringify(data));
    return data;
  } catch (err: any) {
    if (isNetworkError(err)) {
      const cached = localStorage.getItem('user_profile_data');
      if (cached) return JSON.parse(cached);
    }
    throw err;
  }
}

async function saveProfile(data: any) {
  localStorage.setItem('user_profile_data', JSON.stringify(data));
  if (navigator.onLine) {
    const result = await apiFetch(`${BASE}/profile`, { method: 'POST', body: JSON.stringify(data) });
    return result;
  }
  return data;
}

// ── Gemini / AI ────────────────────────────────────────────

const geminiAdvisor = (data: any) => apiFetch(`${BASE}/gemini-advisor`, { method: 'POST', body: JSON.stringify(data) });

// ── Exported API ───────────────────────────────────────────

export const api = {
  transactions: {
    list: listTransactions,
    create: createTransaction,
    update: updateTransaction,
    delete: deleteTransaction,
  },

  budgets: {
    list: listBudgets,
    update: updateBudgetLimit,
  },

  debts: {
    list: listDebts,
    create: createDebt,
    delete: deleteDebt,
    payInstallments: payDebtInstallments,
    update: updateDebt,
  },

  savings: {
    list: listSavings,
    update: updateSavings,
  },

  categories: {
    list: listCategories,
    create: createCategory,
    update: updateCategory,
    delete: deleteCategory,
    reorder: reorderCategories,
  },

  gemini: {
    advisor: geminiAdvisor,
  },

  salary: {
    get: getSalary,
    save: saveSalary,
    autoAdd: autoAddSalary,
  },

  fixedExpenses: {
    getCategories: getFixedCategories,
    getTasks: getFixedTasks,
    createCategory: createFixedCategory,
    updateCategory: updateFixedCategory,
    deleteCategory: deleteFixedCategory,
    createTask: createFixedTask,
    updateTask: updateFixedTask,
    deleteTask: deleteFixedTask,
  },

  diary: {
    list: listDiary,
    create: createDiary,
    update: updateDiary,
    delete: deleteDiary,
  },

  profile: {
    get: getProfile,
    save: saveProfile,
  },
};
