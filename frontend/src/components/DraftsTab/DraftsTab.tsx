import { useState } from 'react';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useToast } from '../Common/Toast';
import { useDeleteDraft, useDrafts } from '../../hooks/useDrafts';
import type { ContentDraft } from '../../types';
import { DraftCard } from './DraftCard';
import { DraftEditor } from './DraftEditor';

export function DraftsTab() {
  const [status, setStatus] = useState('');
  const [format, setFormat] = useState('');
  const { drafts, loading, error } = useDrafts({ status: status || undefined, format: format || undefined });
  const { remove } = useDeleteDraft();
  const { showToast } = useToast();
  const [editingDraft, setEditingDraft] = useState<ContentDraft | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this draft?')) return;
    try {
      await remove(id);
      showToast('Draft deleted', 'success');
    } catch {
      showToast('Failed to delete draft', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="">All formats</option>
          <option value="reel">Reel</option>
          <option value="carousel">Carousel</option>
          <option value="story">Story</option>
          <option value="caption">Caption</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <LoadingSpinner label="Loading drafts…" />
      ) : drafts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400">
          No drafts yet — save a concept from the Ideation tab to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} onEdit={setEditingDraft} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {editingDraft && <DraftEditor draft={editingDraft} onClose={() => setEditingDraft(null)} />}
    </div>
  );
}
