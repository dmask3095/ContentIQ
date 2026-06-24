import { useState } from 'react';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useToast } from '../Common/Toast';
import { DraftCard } from '../DraftsTab/DraftCard';
import { DraftEditor } from '../DraftsTab/DraftEditor';
import { useDeleteDraft, useDrafts } from '../../hooks/useDrafts';
import type { ContentDraft, DraftFormat } from '../../types';
import { truncate } from '../../utils/formatters';

const FORMAT_LABELS: Record<DraftFormat, string> = {
  reel: 'Reels',
  carousel: 'Posts (Carousels)',
  story: 'Stories',
  caption: 'Captions',
};

export function FormatContentView({ format }: { format: DraftFormat }) {
  const [view, setView] = useState<'drafts' | 'published'>('drafts');
  const { drafts, loading, error } = useDrafts({ format });
  const { remove } = useDeleteDraft();
  const { showToast } = useToast();
  const [editingDraft, setEditingDraft] = useState<ContentDraft | null>(null);

  const visible = drafts.filter((d) => (view === 'published' ? d.status === 'published' : d.status !== 'published'));

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await remove(id);
      showToast('Deleted', 'success');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{FORMAT_LABELS[format]}</h2>
        <div className="flex gap-1 rounded bg-slate-100 p-1">
          {(['drafts', 'published'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded px-3 py-1 text-xs font-medium ${view === v ? 'bg-white shadow' : 'text-slate-500'}`}
            >
              {v === 'drafts' ? 'Drafts & Scheduled' : 'Published'}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <LoadingSpinner />
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400">
          No {view === 'published' ? 'published' : 'draft'} {FORMAT_LABELS[format].toLowerCase()} yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((draft) =>
            view === 'published' && draft.publishedPost ? (
              <div key={draft.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-900">{truncate(draft.title, 80)}</p>
                <p className="text-sm text-slate-500">{truncate(draft.caption, 100)}</p>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <span>❤ {draft.publishedPost.likes}</span>
                  <span>💬 {draft.publishedPost.comments}</span>
                  <span>🔁 {draft.publishedPost.shares}</span>
                  <span>🔖 {draft.publishedPost.saves}</span>
                  <span>📈 {draft.publishedPost.reach} reach</span>
                  <span>👁 {draft.publishedPost.impressions} views</span>
                </div>
              </div>
            ) : (
              <DraftCard key={draft.id} draft={draft} onEdit={setEditingDraft} onDelete={handleDelete} />
            )
          )}
        </div>
      )}

      {editingDraft && <DraftEditor draft={editingDraft} onClose={() => setEditingDraft(null)} />}
    </div>
  );
}
