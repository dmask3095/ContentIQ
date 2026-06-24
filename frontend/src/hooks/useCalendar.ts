import { useCallback, useEffect, useState } from 'react';
import type { ContentDraft } from '../types';
import { api } from '../utils/api';

export type PostsByDay = Record<string, ContentDraft[]>;

export function useWeekSchedule(weekStartIso: string) {
  const [postsByDay, setPostsByDay] = useState<PostsByDay>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeek = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ posts_by_day: PostsByDay }>('/api/calendar/week', {
        params: { week_start: weekStartIso },
      });
      setPostsByDay(res.data.posts_by_day);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar week');
    } finally {
      setLoading(false);
    }
  }, [weekStartIso]);

  useEffect(() => {
    fetchWeek();
  }, [fetchWeek]);

  return { postsByDay, loading, error, refetch: fetchWeek };
}

export interface ScheduleSuggestion {
  date: string;
  time: string;
  format: string;
  reason: string;
}

export function useAutoSuggestSchedule() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ suggestions: ScheduleSuggestion[] }>('/api/calendar/auto-suggest');
      return res.data.suggestions;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get suggestions';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { suggest, loading, error };
}
