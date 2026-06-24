import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { UserSettings } from '../types';
import { api } from '../utils/api';

export function useSettings() {
  const userSettings = useAppStore((s) => s.userSettings);
  const setUserSettings = useAppStore((s) => s.setUserSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<UserSettings>('/api/settings');
      setUserSettings(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [setUserSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings: userSettings, loading, error, refetch: fetchSettings };
}

export function useUpdateSettings() {
  const setUserSettings = useAppStore((s) => s.setUserSettings);
  const [saving, setSaving] = useState(false);

  const update = useCallback(
    async (patch: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await api.put<UserSettings>('/api/settings', patch);
        setUserSettings(res.data);
        return res.data;
      } finally {
        setSaving(false);
      }
    },
    [setUserSettings]
  );

  return { update, saving };
}
