import { useEffect, useRef } from 'react';
import type { ResearchItem } from '../../types';

interface HotTopicActionsProps {
  item: ResearchItem;
  loading: 'carousel' | 'reel' | null;
  onGenerate: (format: 'carousel' | 'reel') => void;
  onClose: () => void;
}

export function HotTopicActions({ item, loading, onGenerate, onClose }: HotTopicActionsProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleOpenLink = () => {
    window.open(item.fullUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute right-2 top-10 z-20 flex w-48 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
    >
      <button
        onClick={() => onGenerate('carousel')}
        disabled={loading !== null}
        className="px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {loading === 'carousel' ? 'Generating…' : '🖼️ Generate Carousel'}
      </button>
      <button
        onClick={() => onGenerate('reel')}
        disabled={loading !== null}
        className="border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {loading === 'reel' ? 'Generating…' : '🎬 Generate Reel'}
      </button>
      <button
        onClick={handleOpenLink}
        disabled={loading !== null}
        className="border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        🔗 Open Link
      </button>
    </div>
  );
}
