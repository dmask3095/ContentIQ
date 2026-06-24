import { useToast } from '../Common/Toast';
import type { TrendingHashtag } from '../../types';

export function MyHashtagStack({ items }: { items: TrendingHashtag[] }) {
  const { showToast } = useToast();

  if (items.length === 0) {
    return <p className="text-sm text-slate-400">No favorites yet — star hashtags below to pin them here for quick reuse.</p>;
  }

  const handleCopyAll = () => {
    navigator.clipboard.writeText(items.map((i) => i.hashtag).join(' '));
    showToast('Copied all favorites to clipboard', 'success');
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item.id} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            {item.hashtag}
          </span>
        ))}
      </div>
      <button onClick={handleCopyAll} className="self-start rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
        Copy All
      </button>
    </div>
  );
}
