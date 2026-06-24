import { useState } from 'react';
import { useToast } from '../Common/Toast';
import { useCreateDraft } from '../../hooks/useDrafts';
import type { ContentDraft } from '../../types';
import { truncate } from '../../utils/formatters';

interface CaptionLibraryProps {
  drafts: ContentDraft[];
  onEdit: (draft: ContentDraft) => void;
}

export function CaptionLibrary({ drafts, onEdit }: CaptionLibraryProps) {
  const { showToast } = useToast();
  const { create } = useCreateDraft();
  const [reusingId, setReusingId] = useState<string | null>(null);

  const handleCopy = (caption: string) => {
    navigator.clipboard.writeText(caption);
    showToast('Copied to clipboard', 'success');
  };

  const handleReuse = async (draft: ContentDraft) => {
    setReusingId(draft.id);
    try {
      await create({
        format: draft.format,
        caption: draft.caption,
        scheduled_date: new Date().toISOString().slice(0, 10),
        scheduled_time: '09:00',
        title: draft.title,
        hashtags: draft.hashtags,
      });
      showToast('New draft created from this caption', 'success');
    } catch {
      showToast('Failed to reuse caption', 'error');
    } finally {
      setReusingId(null);
    }
  };

  const sorted = [...drafts].sort((a, b) => (b.publishedPost?.likes ?? -1) - (a.publishedPost?.likes ?? -1));

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400">
        No saved captions match your search.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((draft) => (
        <div key={draft.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{draft.format}</span>
              {draft.publishedPost && <span>❤ {draft.publishedPost.likes} likes</span>}
            </div>
            <p className="truncate text-sm text-slate-700">{truncate(draft.caption, 120)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleCopy(draft.caption)} className="rounded bg-slate-100 px-2.5 py-1 text-xs hover:bg-slate-200">
              Copy
            </button>
            <button onClick={() => onEdit(draft)} className="rounded bg-slate-100 px-2.5 py-1 text-xs hover:bg-slate-200">
              Edit
            </button>
            <button
              onClick={() => handleReuse(draft)}
              disabled={reusingId === draft.id}
              className="rounded bg-slate-900 px-2.5 py-1 text-xs text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {reusingId === draft.id ? 'Reusing…' : 'Reuse'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
