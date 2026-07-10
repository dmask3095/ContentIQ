import { useCallback, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ContentDraft, ContentIdea } from '../types';
import { api } from '../utils/api';

export function useGenerateIdeas() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (researchItemIds: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ ideas: ContentIdea[] }>('/api/ideation/generate', {
        research_item_ids: researchItemIds,
      });
      return res.data.ideas;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate ideas';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error };
}

export function useQuickGenerate() {
  const addContentDraft = useAppStore((s) => s.addContentDraft);
  const [loading, setLoading] = useState<'carousel' | 'reel' | null>(null);

  const generate = useCallback(
    async (researchItemId: string, format: 'carousel' | 'reel') => {
      setLoading(format);
      try {
        const res = await api.post<{ draft: ContentDraft }>('/api/ideation/quick-generate', {
          research_item_id: researchItemId,
          format,
        });
        addContentDraft(res.data.draft);
        return res.data.draft;
      } finally {
        setLoading(null);
      }
    },
    [addContentDraft]
  );

  return { generate, loading };
}
