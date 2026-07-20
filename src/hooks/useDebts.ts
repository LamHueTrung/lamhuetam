import { useState, useEffect, useCallback } from 'react';
import { DebtAccount } from '../types';
import { api } from '../api/client';

export function useDebts() {
  const [debts, setDebts] = useState<DebtAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDebts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.debts.list();
      setDebts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDebts(); }, [fetchDebts]);

  const addDebt = async (data: Omit<DebtAccount, 'id'>) => {
    const newDebt = await api.debts.create(data);
    setDebts(prev => [...prev, newDebt]);
    return newDebt;
  };

  const deleteDebt = async (id: string) => {
    await api.debts.delete(id);
    setDebts(prev => prev.filter(d => d.id !== id));
  };

  const payInstallments = async (debtId: string, installmentIndices: number[], partialAmounts?: Record<number, number>, note?: string) => {
    const updated = await api.debts.payInstallments(debtId, installmentIndices, partialAmounts, note);
    setDebts(prev => prev.map(d => d.id === debtId ? updated : d));
  };

  const updateDebt = async (debtId: string, updateData: Partial<DebtAccount>) => {
    const updated = await api.debts.update(debtId, updateData);
    setDebts(prev => prev.map(d => d.id === debtId ? updated : d));
  };

  return { debts, loading, error, addDebt, deleteDebt, payInstallments, updateDebt, refetch: fetchDebts };
}