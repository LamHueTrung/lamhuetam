import { useState, useEffect, useCallback } from 'react';
import { SavingsGoal } from '../types';
import { api } from '../api/client';

export function useSavings() {
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.savings.list();
      setSavings(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSavings(); }, [fetchSavings]);

  const updateSavings = async (amount: number) => {
    const updated = await api.savings.update(amount);
    setSavings(prev => prev.map(s => s.id === updated.id ? updated : s));
    return updated;
  };

  return { savings, loading, error, updateSavings, refetch: fetchSavings };
}
