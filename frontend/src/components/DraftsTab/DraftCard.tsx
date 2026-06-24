import { useState } from 'react';
import { Modal } from '../Common/Modal';
import type { ContentDraft } from '../../types';
import { timeAgo, truncate } from '../../utils/formatters';

const FORMAT_ICONS: Record<string, string> = { reel: '🎬', carousel: '🖼️', story: '⚡', caption: '📝' };
const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-emerald-100 text-emerald-700',
};

interface DraftCardProps {
  draft: ContentDraft;
  onEdit: (draft: ContentDraft) => void;
  onDelete: (id: string) => void;
}

export function DraftCard({ draft, onEdit, onDelete }: DraftCardProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-lg">{FORMAT_ICONS[draft.format] ?? '📝'}</span>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[draft.status]}`}>{draft.status}</span>
      </div>
      <p className="font-semibold text-slate-900">{truncate(draft.title, 80)}</p>
      <p className="text-sm text-slate-500">{truncate(draft.caption, 100)}</p>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {new Date(draft.scheduledDate).toLocaleDateString()} at {draft.scheduledTime}
        </span>
        <span>Updated {timeAgo(draft.updatedAt)}</span>
      </div>
      <div className="mt-1 flex gap-2">
        <button
          onClick={() => onEdit(draft)}
          className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          Edit
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          Preview
        </button>
        <button
          onClick={() => onDelete(draft.id)}
          className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
        >
          Delete
        </button>
      </div>

      {showPreview && (
        <Modal title="Instagram Preview" onClose={() => setShowPreview(false)} widthClassName="max-w-sm">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              <span className="text-sm font-semibold">contentiq.app</span>
            </div>
            <div className="mb-2 flex h-48 items-center justify-center rounded bg-slate-100 text-4xl">
              {FORMAT_ICONS[draft.format] ?? '📝'}
            </div>
            <p className="whitespace-pre-wrap text-sm">{draft.caption}</p>
            <p className="mt-2 text-sm text-blue-600">{draft.hashtags.join(' ')}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
