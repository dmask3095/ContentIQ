import { useState } from 'react';
import { Modal } from '../Common/Modal';
import { useToast } from '../Common/Toast';
import type { ContentDraft } from '../../types';
import { api } from '../../utils/api';
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

// Mirrors the backend's parseCarouselSlides line-splitting just to get a
// slide count for the prev/next indicator -- the actual rendered text and
// prefix-stripping happen server-side when the image is fetched.
function countSlides(script: string | null): number {
  if (!script) return 0;
  return script.split('\n').filter((line) => line.trim().length > 0).length;
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
  const [slideIndex, setSlideIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const isCarousel = draft.format === 'carousel' && !!draft.script;
  const slideCount = isCarousel ? countSlides(draft.script) : 0;

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
          onClick={() => {
            setSlideIndex(0);
            setShowPreview(true);
          }}
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

      {showPreview && (
        <Modal title="Instagram Preview" onClose={() => setShowPreview(false)} widthClassName="max-w-sm">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              <span className="text-sm font-semibold">contentiq.app</span>
            </div>

            {isCarousel ? (
              <div className="mb-2">
                <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded bg-slate-100">
                  <img
                    src={`${api.defaults.baseURL}/api/drafts/${draft.id}/carousel/${slideIndex}`}
                    alt={`Slide ${slideIndex + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {slideIndex > 0 && (
                    <button
                      onClick={() => setSlideIndex((i) => i - 1)}
                      className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-2 py-1 text-sm text-white"
                    >
                      ‹
                    </button>
                  )}
                  {slideIndex < slideCount - 1 && (
                    <button
                      onClick={() => setSlideIndex((i) => i + 1)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-2 py-1 text-sm text-white"
                    >
                      ›
                    </button>
                  )}
                </div>
                <p className="mt-1 text-center text-xs text-slate-400">
                  Slide {slideIndex + 1} / {slideCount}
                </p>
              </div>
            ) : (
              <div className="mb-2 flex h-48 items-center justify-center rounded bg-slate-100 text-4xl">
                {FORMAT_ICONS[draft.format] ?? '📝'}
              </div>
            )}

            <p className="whitespace-pre-wrap text-sm">{draft.caption}</p>
            <p className="mt-2 text-sm text-blue-600">{draft.hashtags.join(' ')}</p>

            {isCarousel && (
              <div className="mt-3 flex flex-col gap-2">
                <button
                  onClick={handleDownloadZip}
                  disabled={downloading}
                  className="w-full rounded bg-slate-900 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {downloading ? 'Zipping…' : 'Download all slides (ZIP)'}
                </button>
                {draft.status !== 'published' && (
                  <button
                    onClick={handlePublishInstagram}
                    disabled={publishing}
                    className="w-full rounded bg-gradient-to-r from-violet-500 to-pink-500 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {publishing ? 'Posting to Instagram…' : 'Post to Instagram'}
                  </button>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
