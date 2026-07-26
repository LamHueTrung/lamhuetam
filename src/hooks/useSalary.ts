import { useState, useEffect, useCallback } from 'react';
import { SalaryConfig } from '../types';
import { api } from '../api/client';

const defaultConfig: SalaryConfig = {
  grossSalary: 0,
  netSalary: 0,
  receiveDay: 1,
  workDays: 26,
  leaveDays: [],
  lastAutoAddMonth: '',
  notes: '',
};

export function useSalary() {
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.salary.get();
      setSalaryConfig(data);
    } catch {
      setSalaryConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const saveConfig = async (config: Partial<SalaryConfig>) => {
    const updated = await api.salary.save(config);
    setSalaryConfig(updated);
    return updated;
  };

  const autoAddSalary = async () => {
    const result = await api.salary.autoAdd();
    // Refresh config để cập nhật lastAutoAddMonth
    await fetchConfig();
    return result;
  };

  return { salaryConfig, loading, saveConfig, autoAddSalary, refetch: fetchConfig };
}
