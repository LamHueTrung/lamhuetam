const BASE = '/.netlify/functions';

async function request(url: string, options?: RequestInit) {
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

export const api = {
  transactions: {
    list: () => request(`${BASE}/transactions`),
    create: (data: any) => request(`${BASE}/transactions`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`${BASE}/transactions`, { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
    delete: (id: string) => request(`${BASE}/transactions?id=${id}`, { method: 'DELETE' }),
  },

  budgets: {
    list: () => request(`${BASE}/budgets`),
    update: (category: string, limit: number) =>
      request(`${BASE}/budgets`, { method: 'PUT', body: JSON.stringify({ category, limit }) }),
  },

  debts: {
    list: () => request(`${BASE}/debts`),
    create: (data: any) => request(`${BASE}/debts`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request(`${BASE}/debts?id=${id}`, { method: 'DELETE' }),
    payInstallments: (debtId: string, installmentIndices: number[], partialAmounts?: Record<number, number>, note?: string) =>
      request(`${BASE}/debts`, { method: 'PUT', body: JSON.stringify({ debtId, installmentIndices, partialAmounts, note }) }),
    update: (debtId: string, updateData: any) =>
      request(`${BASE}/debts`, { method: 'PUT', body: JSON.stringify({ debtId, updateData }) }),
  },

  savings: {
    list: () => request(`${BASE}/savings`),
    update: (amount: number) => request(`${BASE}/savings`, { method: 'PUT', body: JSON.stringify({ amount }) }),
  },

  categories: {
    list: () => request(`${BASE}/categories`),
    create: (data: any) => request(`${BASE}/categories`, { method: 'POST', body: JSON.stringify(data) }),
    update: (data: any) => request(`${BASE}/categories`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (_id: string) => request(`${BASE}/categories`, { method: 'DELETE', body: JSON.stringify({ _id }) }),
    reorder: (orderedIds: string[]) => request(`${BASE}/categories/reorder`, { method: 'PUT', body: JSON.stringify({ orderedIds }) }),
  },

  gemini: {
    advisor: (data: any) => request(`${BASE}/gemini-advisor`, { method: 'POST', body: JSON.stringify(data) }),
  },

  salary: {
    get: () => request(`${BASE}/salary`),
    save: (data: any) => request(`${BASE}/salary`, { method: 'POST', body: JSON.stringify(data) }),
    autoAdd: () => request(`${BASE}/salary`, { method: 'POST', body: JSON.stringify({ action: 'auto_add' }) }),
  },

  fixedExpenses: {
    getCategories: () => request(`${BASE}/fixed-expenses?type=categories`),
    getTasks: (month: string) => request(`${BASE}/fixed-expenses?type=tasks&month=${month}`),
    createCategory: (data: any) => request(`${BASE}/fixed-expenses`, { method: 'POST', body: JSON.stringify({ ...data, entity: 'category' }) }),
    updateCategory: (data: any) => request(`${BASE}/fixed-expenses`, { method: 'PUT', body: JSON.stringify({ ...data, entity: 'category' }) }),
    deleteCategory: (id: string) => request(`${BASE}/fixed-expenses?id=${id}&entity=category`, { method: 'DELETE' }),
    createTask: (data: any) => request(`${BASE}/fixed-expenses`, { method: 'POST', body: JSON.stringify({ ...data, entity: 'task' }) }),
    updateTask: (data: any) => request(`${BASE}/fixed-expenses`, { method: 'PUT', body: JSON.stringify({ ...data, entity: 'task' }) }),
    deleteTask: (id: string) => request(`${BASE}/fixed-expenses?id=${id}&entity=task`, { method: 'DELETE' }),
  },

  diary: {
    list: (params?: { month?: string; mood?: string }) => {
      const qs = new URLSearchParams(params as any).toString();
      return request(`${BASE}/diary${qs ? '?' + qs : ''}`);
    },
    create: (data: any) => request(`${BASE}/diary`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`${BASE}/diary`, { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
    delete: (id: string) => request(`${BASE}/diary?id=${id}`, { method: 'DELETE' }),
  },
};
