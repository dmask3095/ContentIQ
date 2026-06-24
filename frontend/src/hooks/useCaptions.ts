import { useCallback, useState } from 'react';
import type { ContentTone } from '../types';
import { api } from '../utils/api';

export function useGenerateCaptions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (topic: string, tone: ContentTone) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ captions: string[] }>('/api/captions/generate', { topic, tone });
      return res.data.captions;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate captions';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error };
}
