import type { TrendingHashtag } from '../../types';

interface HashtagCardProps {
  item: TrendingHashtag;
  onToggleFavorite: (item: TrendingHashtag) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  AI: 'bg-blue-100 text-blue-700',
  Tech: 'bg-purple-100 text-purple-700',
  Creator: 'bg-pink-100 text-pink-700',
  General: 'bg-slate-100 text-slate-700',
};

export function HashtagCard({ item, onToggleFavorite }: HashtagCardProps) {
  const isUp = item.growth >= 0;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">{item.hashtag}</span>
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.General}`}>
            {item.category}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {item.usage_count.toLocaleString()} uses ·{' '}
          <span className={isUp ? 'text-emerald-600' : 'text-red-500'}>
            {isUp ? '↑' : '↓'} {Math.abs(item.growth * 100).toFixed(1)}%
          </span>
        </p>
      </div>
      <button
        onClick={() => onToggleFavorite(item)}
        className={`rounded px-2.5 py-1 text-xs font-medium ${
          item.is_favorite ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        {item.is_favorite ? '★ In Stack' : '+ Add to Stack'}
      </button>
    </div>
  );
}
