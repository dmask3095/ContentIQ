import { useState } from 'react';
import { DraftPreviewModal } from '../Common/DraftPreviewModal';
import { useToast } from '../Common/Toast';
import type { ContentDraft } from '../../types';
import { api } from '../../utils/api';
import { timeAgo, truncate } from '../../utils/formatters';

export const FORMAT_ICONS: Record<string, string> = { reel: '🎬', carousel: '🖼️', story: '⚡', caption: '📝' };
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

async function downloadBlob(url: string, filename: string) {
  const res = await api.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

export function DraftCard({ draft, onEdit, onDelete }: DraftCardProps) {
  const { showToast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const isCarousel = draft.format === 'carousel' && !!draft.script;

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      await downloadBlob(`/api/drafts/${draft.id}/carousel.zip`, `${truncate(draft.title, 40)}-carousel.zip`);
    } catch {
      showToast('Failed to download carousel images', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handlePublishInstagram = async () => {
    setPublishing(true);
    try {
      await api.post(`/api/drafts/${draft.id}/publish/instagram`);
      showToast('Posted to Instagram!', 'success');
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string; error?: string } } }).response?.data?.detail ??
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Instagram publish failed';
      showToast(detail, 'error');
    } finally {
      setPublishing(false);
    }
  };

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
      <div className="mt-1 flex flex-wrap gap-2">
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
        {isCarousel && (
          <button
            onClick={handleDownloadZip}
            disabled={downloading}
            className="rounded bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            {downloading ? 'Zipping…' : 'Download images'}
          </button>
        )}
        {draft.status !== 'published' && (
          <button
            onClick={handlePublishInstagram}
            disabled={publishing}
            className="rounded bg-gradient-to-r from-violet-500 to-pink-500 px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {publishing ? 'Posting…' : 'Post to Instagram'}
          </button>
        )}
        {draft.status === 'published' && (
          <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
            Published
          </span>
        )}
        <button
          onClick={() => onDelete(draft.id)}
          className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
        >
          Delete
        </button>
      </div>

      {showPreview && <DraftPreviewModal draft={draft} onClose={() => setShowPreview(false)} />}
    </div>
  );
}
