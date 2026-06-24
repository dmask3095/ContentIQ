import { useAppStore } from '../../store/useAppStore';
import type { ResearchItem } from '../../types';
import { timeAgo, truncate } from '../../utils/formatters';

const SOURCE_LABELS: Record<string, string> = {
  hn: 'HN',
  reddit: 'Reddit',
  google: 'Google',
  techcrunch: 'TechCrunch',
  blog: 'Blog',
  rss: 'RSS',
};

const SOURCE_COLORS: Record<string, string> = {
  hn: 'bg-orange-100 text-orange-700',
  reddit: 'bg-orange-100 text-orange-600',
  google: 'bg-blue-100 text-blue-700',
  techcrunch: 'bg-green-100 text-green-700',
  blog: 'bg-purple-100 text-purple-700',
  rss: 'bg-slate-100 text-slate-700',
};

interface ResearchCardProps {
  item: ResearchItem;
  onIdeateNow: (id: string) => void;
  onMarkRead: (id: string) => void;
  onToggleArchive: (id: string) => void;
}

export function ResearchCard({ item, onIdeateNow, onMarkRead, onToggleArchive }: ResearchCardProps) {
  const isSelected = useAppStore((s) => s.selectedItemIds.includes(item.id));
  const toggleSelectedItem = useAppStore((s) => s.toggleSelectedItem);

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
        isSelected ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
      } ${item.isRead ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[item.source] ?? 'bg-slate-100 text-slate-700'}`}>
          {SOURCE_LABELS[item.source] ?? item.source}
        </span>
        <label className="flex items-center gap-1 text-xs text-slate-500">
          <input type="checkbox" checked={isSelected} onChange={() => toggleSelectedItem(item.id)} />
          select
        </label>
      </div>

      <a
        href={item.fullUrl}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-slate-900 hover:underline"
      >
        {truncate(item.title, 80)}
      </a>
      <p className="text-sm text-slate-500">{truncate(item.snippet, 100)}</p>

      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-slate-100">
          <div
            className="h-1.5 rounded-full bg-emerald-500"
            style={{ width: `${Math.min(100, (item.relevanceScore / 10) * 100)}%` }}
          />
        </div>
        <span className="text-xs font-medium text-slate-500">{item.relevanceScore.toFixed(1)}/10</span>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{item.category}</span>
        <span>{timeAgo(item.publishedAt)}</span>
      </div>

      <div className="mt-1 flex gap-2">
        <button
          onClick={() => onIdeateNow(item.id)}
          className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          Ideate Now
        </button>
        <button
          onClick={() => onToggleArchive(item.id)}
          className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          {item.isArchived ? 'Unarchive' : 'Save'}
        </button>
        {!item.isRead && (
          <button
            onClick={() => onMarkRead(item.id)}
            className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            Mark Read
          </button>
        )}
      </div>
    </div>
  );
}
