import type { TrendingHashtag } from '../../types';
import { HashtagCard } from './HashtagCard';

interface TrendingListProps {
  items: TrendingHashtag[];
  onToggleFavorite: (item: TrendingHashtag) => void;
}

export function TrendingList({ items, onToggleFavorite }: TrendingListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
        No hashtags match your search.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <HashtagCard key={item.id} item={item} onToggleFavorite={onToggleFavorite} />
      ))}
    </div>
  );
}
