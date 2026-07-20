import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '../types';
import { api } from '../api/client';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.transactions.list();
      setTransactions(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const addTransaction = async (data: Omit<Transaction, 'id'>) => {
    const newTx = await api.transactions.create(data);
    setTransactions(prev => [newTx, ...prev]);
    return newTx;
  };

  const deleteTransaction = async (id: string) => {
    await api.transactions.delete(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  return { transactions, loading, error, addTransaction, deleteTransaction, refetch: fetchTransactions };
}
