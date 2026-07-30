import { useState, useEffect, useCallback } from "react";
import { Category } from "../types";
import { api } from "../api/client";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.categories.list();
      if (Array.isArray(data)) setCategories(data);
    } catch (err) {
      console.error("Failed to load categories", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const addCategory = async (name: string, icon: string, color: string) => {
    const cat = await api.categories.create({ name, icon, color });
    setCategories(prev => [...prev, cat]);
    return cat;
  };

  const updateCategory = async (cat: Category) => {
    const updated = await api.categories.update(cat);
    setCategories(prev => prev.map(c => c._id === updated._id ? updated : c));
    return updated;
  };

  const deleteCategory = async (_id: string) => {
    await api.categories.delete(_id);
    setCategories(prev => prev.filter(c => c._id !== _id));
  };

  const reorderCategories = async (orderedIds: string[]) => {
    // Optimistically update React state immediately
    setCategories(prev => {
      const map = new Map(prev.map(c => [c._id, c]));
      return orderedIds.map((id, i) => {
        const item = map.get(id);
        return item ? { ...item, order: i } : null!;
      }).filter(Boolean);
    });

    try {
      await api.categories.reorder(orderedIds);
    } catch (err) {
      console.error("Failed to reorder categories", err);
    }
  };

  return { categories, loading, addCategory, updateCategory, deleteCategory, reorderCategories, refetch: fetchCategories };
}