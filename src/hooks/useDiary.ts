import { useState, useEffect, useCallback, useMemo } from 'react';
import { DiaryEntry, DiaryMood, DiaryMoodStat, DiaryStreakData } from '../types';
import { api } from '../api/client';
import { getFromCache, setToCache, clearCache } from '../utils/cache';

const CACHE_KEY = 'diary_entries_cache';

export function useDiary() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      if (!forceRefresh) {
        const cached = getFromCache<DiaryEntry[]>(CACHE_KEY, 5 * 60 * 1000);
        if (cached) {
          setEntries(cached);
          setLoading(false);
          return;
        }
      }

      const data = await api.diary.list();
      setEntries(data);
      setToCache(CACHE_KEY, data);
    } catch (e: any) {
      const cached = getFromCache<DiaryEntry[]>(CACHE_KEY, 24 * 60 * 60 * 1000);
      if (cached) {
        setEntries(cached);
      }
      setError(e.message || 'Không thể tải nhật ký');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const addEntry = async (data: Omit<DiaryEntry, 'id' | '_id' | 'createdAt'>) => {
    const entry = await api.diary.create(data);
    const updated = [entry, ...entries];
    setEntries(updated);
    setToCache(CACHE_KEY, updated);
    return entry;
  };

  const updateEntry = async (id: string, data: Partial<DiaryEntry>) => {
    const entry = await api.diary.update(id, data);
    const updated = entries.map(e => e.id === id ? entry : e);
    setEntries(updated);
    setToCache(CACHE_KEY, updated);
    return entry;
  };

  const deleteEntry = async (id: string) => {
    await api.diary.delete(id);
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    setToCache(CACHE_KEY, updated);
  };

  const pinEntry = useCallback(async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const pinned = !entry.pinned;
    const updated = entries.map(e => e.id === id ? { ...e, pinned } : e);
    setEntries(updated);
    setToCache(CACHE_KEY, updated);
    try {
      await api.diary.update(id, { pinned } as any);
    } catch {
      setEntries(entries);
      setToCache(CACHE_KEY, entries);
    }
  }, [entries]);

  const getFilteredEntries = useCallback((
    search: string,
    mood: DiaryMood | 'all',
    tag: string,
    month: string | null,
    sort: 'newest' | 'oldest'
  ): DiaryEntry[] => {
    let result = [...entries];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.content.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (mood !== 'all') {
      result = result.filter(e => e.mood === mood);
    }

    if (tag) {
      result = result.filter(e => e.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
    }

    if (month) {
      result = result.filter(e => e.date.startsWith(month));
    }

    const sortOrder = sort === 'newest' ? -1 : 1;
    result.sort((a, b) => {
      const aPinned = a.pinned ? 0 : 1;
      const bPinned = b.pinned ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      return sortOrder * (a.date.localeCompare(b.date) || (a.createdAt || '').localeCompare(b.createdAt || ''));
    });

    return result;
  }, [entries]);

  const streakData = useMemo((): DiaryStreakData => {
    if (entries.length === 0) return { current: 0, longest: 0, todayWritten: false };

    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    const today = new Date().toISOString().split('T')[0];
    const todayWritten = sorted[0]?.date === today;

    const dateSet = new Set(sorted.map(e => e.date));
    let current = 0;
    const d = new Date();
    if (!todayWritten) d.setDate(d.getDate() - 1);

    while (true) {
      const key = d.toISOString().split('T')[0];
      if (dateSet.has(key)) {
        current++;
        d.setDate(d.getDate() - 1);
      } else break;
    }

    let longest = 0;
    let streak = 0;
    const allDates = [...dateSet].sort();
    for (let i = 0; i < allDates.length; i++) {
      if (i === 0) {
        streak = 1;
      } else {
        const diff = new Date(allDates[i]).getTime() - new Date(allDates[i - 1]).getTime();
        if (diff === 86400000) {
          streak++;
        } else {
          longest = Math.max(longest, streak);
          streak = 1;
        }
      }
    }
    longest = Math.max(longest, streak);

    return { current, longest, todayWritten };
  }, [entries]);

  const moodStats = useMemo((): DiaryMoodStat[] => {
    const moodMap: Record<string, number> = {};
    entries.forEach(e => { moodMap[e.mood] = (moodMap[e.mood] || 0) + 1; });
    const total = entries.length || 1;
    return (Object.entries(moodMap) as [DiaryMood, number][])
      .map(([mood, count]) => ({ mood, count, percentage: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  return {
    entries,
    loading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    pinEntry,
    getFilteredEntries,
    streakData,
    moodStats,
    refetch: () => fetchEntries(true),
  };
}