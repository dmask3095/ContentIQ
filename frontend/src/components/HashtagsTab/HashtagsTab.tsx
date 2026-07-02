import { useState } from 'react';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useToast } from '../Common/Toast';
import { useToggleFavoriteHashtag, useTrendingHashtags } from '../../hooks/useHashtags';
import type { TrendingHashtag } from '../../types';
import { MyHashtagStack } from './MyHashtagStack';
import { TrendingList } from './TrendingList';

const CATEGORIES = ['AI', 'Tech', 'Creator', 'General'];

export function HashtagsTab() {
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const { trending, loading, error, refetch, setTrending } = useTrendingHashtags(category || undefined);
  const { toggle } = useToggleFavoriteHashtag();
  const { showToast } = useToast();

  const handleToggleFavorite = async (item: TrendingHashtag) => {
    try {
      const updated = await toggle(item.id, !item.is_favorite);
      setTrending((prev) => prev.map((h) => (h.id === item.id ? { ...h, is_favorite: updated.isFavorite } : h)));
    } catch {
      showToast('Failed to update favorite', 'error');
    }
  };

  const filtered = trending.filter((h) => h.hashtag.toLowerCase().includes(query.toLowerCase()));
  const favorites = trending.filter((h) => h.is_favorite);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-slate-700">My Stack ({favorites.length})</p>
        <MyHashtagStack items={favorites} />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search hashtags…"
          className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button onClick={refetch} className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
          Refresh
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Trending volume/growth is refreshed every 6h from a curated AI/tech/creator pool — historical 7-day charts will
        land once hashtag snapshots are tracked over time.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? <LoadingSpinner label="Loading trending hashtags…" /> : <TrendingList items={filtered} onToggleFavorite={handleToggleFavorite} />}
    </div>
  );
}
