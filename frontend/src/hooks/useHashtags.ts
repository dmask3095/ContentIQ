import { useCallback, useEffect, useState } from 'react';
import type { TrendingHashtag } from '../types';
import { api } from '../utils/api';

export function useTrendingHashtags(category?: string) {
  const [trending, setTrending] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      const res = await api.get<{ trending: TrendingHashtag[] }>('/api/hashtags/trending', { params });
      setTrending(res.data.trending);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trending hashtags');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  return { trending, loading, error, refetch: fetchTrending, setTrending };
}

export function useToggleFavoriteHashtag() {
  const toggle = useCallback(async (id: string, isFavorite: boolean) => {
    const res = await api.patch<{ hashtag: { id: string; isFavorite: boolean } }>(`/api/hashtags/${id}/favorite`, {
      is_favorite: isFavorite,
    });
    return res.data.hashtag;
  }, []);

  return { toggle };
}
