import { useCallback, useEffect, useState } from 'react';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useToast } from '../Common/Toast';
import type { ResearchItem } from '../../types';
import { api } from '../../utils/api';
import { timeAgo } from '../../utils/formatters';

const SOURCE_LABELS: Record<string, string> = {
  hn: 'Hacker News',
  reddit: 'Reddit',
  google: 'Google',
  youtube: 'YouTube',
  techcrunch: 'TechCrunch',
  blog: 'Blog',
  rss: 'RSS',
};

const CATEGORY_COLORS: Record<string, string> = {
  'AI News': 'bg-violet-100 text-violet-700',
  'AI Tools': 'bg-blue-100 text-blue-700',
  Trends: 'bg-orange-100 text-orange-700',
  Tips: 'bg-emerald-100 text-emerald-700',
  Other: 'bg-slate-100 text-slate-600',
};

function hoursAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60));
}

function HeatBadge({ hours }: { hours: number }) {
  if (hours <= 3) return <span className="rounded bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">BREAKING</span>;
  if (hours <= 12) return <span className="rounded bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white">HOT</span>;
  return <span className="rounded bg-yellow-400 px-2 py-0.5 text-[11px] font-bold text-slate-800">RECENT</span>;
}

export function HotTopicsTab() {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();

  const fetchHot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: ResearchItem[]; total: number }>('/api/research', {
        params: { hot: 'true', limit: 50 },
      });
      setItems(res.data.items);
    } catch {
      setError('Failed to load hot topics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHot();
  }, [fetchHot]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/api/research/refresh');
      await fetchHot();
      showToast('Research updated', 'success');
    } catch {
      showToast('Refresh failed — check API keys in Settings', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Hot Topics</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Content published in the last 48 hours — trending news, releases, and updates in your niche.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {refreshing ? 'Fetching…' : 'Refresh Now'}
        </button>
      </div>

      {/* Flame legend */}
      <div className="flex gap-4 px-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">BREAKING</span>
          under 3h
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">HOT</span>
          3–12h
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">RECENT</span>
          12–48h
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <LoadingSpinner label="Loading hot topics…" />
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm font-medium text-slate-700">No hot topics in the last 48 hours</p>
          <p className="mt-1 text-xs text-slate-400">
            Hit "Refresh Now" to fetch the latest content from all sources.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const age = hoursAgo(item.publishedAt);
            return (
              <a
                key={item.id}
                href={item.fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Top row */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.Other}`}
                  >
                    {item.category}
                  </span>
                  <HeatBadge hours={age} />
                </div>

                {/* Title */}
                <p className="font-semibold leading-snug text-slate-900 line-clamp-3">{item.title}</p>

                {/* Snippet */}
                {item.snippet && (
                  <p className="text-xs leading-relaxed text-slate-500 line-clamp-2">{item.snippet}</p>
                )}

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between pt-1 text-xs text-slate-400">
                  <span>{SOURCE_LABELS[item.source] ?? item.source}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-indigo-600">{item.relevanceScore.toFixed(1)}</span>
                    <span>{timeAgo(item.publishedAt)}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
