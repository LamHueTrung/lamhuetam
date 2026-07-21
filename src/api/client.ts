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
};
