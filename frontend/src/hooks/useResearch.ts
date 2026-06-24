import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ResearchItem } from '../types';
import { api } from '../utils/api';

export interface ResearchFilters {
  category?: string;
  source?: string;
  is_read?: boolean;
  is_archived?: boolean;
}

export function useResearch(filters: ResearchFilters = {}) {
  const researchItems = useAppStore((s) => s.researchItems);
  const setResearchItems = useAppStore((s) => s.setResearchItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const { category, source, is_read, is_archived } = filters;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (category) params.category = category;
      if (source) params.source = source;
      if (is_read !== undefined) params.is_read = String(is_read);
      if (is_archived !== undefined) params.is_archived = String(is_archived);
      const res = await api.get<{ items: ResearchItem[]; total: number }>('/api/research', { params });
      setResearchItems(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load research items');
    } finally {
      setLoading(false);
    }
  }, [category, source, is_read, is_archived, setResearchItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items: researchItems, total, loading, error, refetch: fetchItems };
}

export function useRefreshResearch() {
  const setLastRefreshedAt = useAppStore((s) => s.setLastRefreshedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ items_found: number; items_added: number }>('/api/research/refresh');
      setLastRefreshedAt(new Date().toISOString());
      return res.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh research';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [setLastRefreshedAt]);

  return { refresh, loading, error };
}

export function useUpdateResearchItem() {
  const updateResearchItem = useAppStore((s) => s.updateResearchItem);

  const update = useCallback(
    async (id: string, patch: { is_read?: boolean; is_archived?: boolean; is_starred?: boolean }) => {
      const res = await api.patch<{ item: ResearchItem }>(`/api/research/${id}`, patch);
      updateResearchItem(id, res.data.item);
      return res.data.item;
    },
    [updateResearchItem]
  );

  return { update };
}
