import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ContentDraft } from '../types';
import { api } from '../utils/api';

export interface DraftFilters {
  status?: string;
  format?: string;
}

export function useDrafts(filters: DraftFilters = {}) {
  const contentDrafts = useAppStore((s) => s.contentDrafts);
  const setContentDrafts = useAppStore((s) => s.setContentDrafts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { status, format } = filters;

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (status) params.status = status;
      if (format) params.format = format;
      const res = await api.get<{ drafts: ContentDraft[]; total: number }>('/api/drafts', { params });
      setContentDrafts(res.data.drafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }, [status, format, setContentDrafts]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  return { drafts: contentDrafts, loading, error, refetch: fetchDrafts };
}

export type CreateDraftInput =
  | {
      idea_id: string;
      scheduled_date: string;
      scheduled_time: string;
      caption?: string;
      script?: string;
      hashtags?: string[];
      title?: string;
    }
  | {
      format: string;
      caption: string;
      script?: string;
      scheduled_date: string;
      scheduled_time: string;
      title?: string;
      hashtags?: string[];
    };

export function useCreateDraft() {
  const addContentDraft = useAppStore((s) => s.addContentDraft);

  const create = useCallback(
    async (input: CreateDraftInput) => {
      const res = await api.post<{ draft: ContentDraft }>('/api/drafts', input);
      addContentDraft(res.data.draft);
      return res.data.draft;
    },
    [addContentDraft]
  );

  return { create };
}

export function useUpdateDraft() {
  const updateContentDraft = useAppStore((s) => s.updateContentDraft);

  const update = useCallback(
    async (
      id: string,
      patch: Partial<{
        caption: string;
        script: string;
        hashtags: string[];
        scheduled_date: string;
        scheduled_time: string;
        status: string;
      }>
    ) => {
      const res = await api.put<{ draft: ContentDraft }>(`/api/drafts/${id}`, patch);
      updateContentDraft(id, res.data.draft);
      return res.data.draft;
    },
    [updateContentDraft]
  );

  return { update };
}

export function useDeleteDraft() {
  const removeContentDraft = useAppStore((s) => s.removeContentDraft);

  const remove = useCallback(
    async (id: string) => {
      await api.delete(`/api/drafts/${id}`);
      removeContentDraft(id);
    },
    [removeContentDraft]
  );

  return { remove };
}
