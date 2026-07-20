import { useState, useEffect, useCallback } from 'react';
import { Budget } from '../types';
import { api } from '../api/client';

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.budgets.list();
      setBudgets(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const updateBudgetLimit = async (category: string, limit: number) => {
    const updated = await api.budgets.update(category, limit);
    setBudgets(prev => prev.map(b => b.category === category ? { ...b, limit: updated.limit } : b));
  };

  return { budgets, loading, error, updateBudgetLimit, refetch: fetchBudgets };
}
