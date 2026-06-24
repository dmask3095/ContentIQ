import type { ResearchItem } from '../../types';
import { ResearchCard } from './ResearchCard';

interface ResearchGridProps {
  items: ResearchItem[];
  onIdeateNow: (id: string) => void;
  onMarkRead: (id: string) => void;
  onToggleArchive: (id: string) => void;
}

export function ResearchGrid({ items, onIdeateNow, onMarkRead, onToggleArchive }: ResearchGridProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400">
        No research items yet. Click "Refresh Research" to run a discovery sweep.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <ResearchCard
          key={item.id}
          item={item}
          onIdeateNow={onIdeateNow}
          onMarkRead={onMarkRead}
          onToggleArchive={onToggleArchive}
        />
      ))}
    </div>
  );
}
