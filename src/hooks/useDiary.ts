import { useState, useEffect, useCallback } from 'react';
import { DiaryEntry } from '../types';
import { api } from '../api/client';

export function useDiary() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async (params?: { month?: string; mood?: string }) => {
    try {
      setLoading(true);
      const data = await api.diary.list(params);
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const addEntry = async (data: Omit<DiaryEntry, 'id' | '_id' | 'createdAt'>) => {
    const entry = await api.diary.create(data);
    setEntries(prev => [entry, ...prev]);
    return entry;
  };

  const updateEntry = async (id: string, data: Partial<DiaryEntry>) => {
    const entry = await api.diary.update(id, data);
    setEntries(prev => prev.map(e => e.id === id ? entry : e));
    return entry;
  };

  const deleteEntry = async (id: string) => {
    await api.diary.delete(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  return { entries, loading, addEntry, updateEntry, deleteEntry, refetch: fetchEntries };
}
