import { useState, useEffect, useCallback } from 'react';
import { FixedExpenseCategory, FixedExpenseTask } from '../types';
import { api } from '../api/client';

export function useFixedExpenses(month: string) {
  const [categories, setCategories] = useState<FixedExpenseCategory[]>([]);
  const [tasks, setTasks] = useState<FixedExpenseTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [cats, tks] = await Promise.all([
        api.fixedExpenses.getCategories(),
        api.fixedExpenses.getTasks(month),
      ]);
      setCategories(cats);
      setTasks(tks);
    } catch {
      setCategories([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Categories
  const addCategory = async (data: { name: string; icon: string; color: string }) => {
    const cat = await api.fixedExpenses.createCategory(data);
    setCategories(prev => [...prev, cat]);
    return cat;
  };
  const updateCategory = async (data: Partial<FixedExpenseCategory> & { id: string }) => {
    const cat = await api.fixedExpenses.updateCategory(data);
    setCategories(prev => prev.map(c => c.id === data.id ? cat : c));
    return cat;
  };
  const deleteCategory = async (id: string) => {
    await api.fixedExpenses.deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
    setTasks(prev => prev.filter(t => t.categoryId !== id));
  };

  // Tasks
  const addTask = async (data: Omit<FixedExpenseTask, 'id' | '_id'>) => {
    const task = await api.fixedExpenses.createTask(data);
    setTasks(prev => [...prev, task]);
    return task;
  };
  const updateTask = async (data: Partial<FixedExpenseTask> & { id: string }) => {
    const task = await api.fixedExpenses.updateTask(data);
    setTasks(prev => prev.map(t => t.id === data.id ? task : t));
    return task;
  };
  const deleteTask = async (id: string) => {
    await api.fixedExpenses.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const totalFixed = tasks.reduce((s, t) => s + t.amount, 0);

  return {
    categories, tasks, loading, totalFixed,
    addCategory, updateCategory, deleteCategory,
    addTask, updateTask, deleteTask,
    refetch: fetchAll,
  };
}
