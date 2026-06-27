import { useState } from 'react';
import { HashtagInput } from '../Common/HashtagInput';
import { Modal } from '../Common/Modal';
import { useToast } from '../Common/Toast';
import { useUpdateDraft } from '../../hooks/useDrafts';
import type { ContentDraft, DraftStatus } from '../../types';
import { formatDateInput } from '../../utils/formatters';

interface DraftEditorProps {
  draft: ContentDraft;
  onClose: () => void;
}

export function DraftEditor({ draft, onClose }: DraftEditorProps) {
  const { update } = useUpdateDraft();
  const { showToast } = useToast();
  const [caption, setCaption] = useState(draft.caption);
  const [script, setScript] = useState(draft.script ?? '');
  const [hashtags, setHashtags] = useState<string[]>(draft.hashtags);
  const [scheduledDate, setScheduledDate] = useState(formatDateInput(draft.scheduledDate));
  const [scheduledTime, setScheduledTime] = useState(draft.scheduledTime);
  const [status, setStatus] = useState<DraftStatus>(draft.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(draft.id, {
        caption,
        script,
        hashtags,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        status,
      });
      showToast('Draft updated', 'success');
      onClose();
    } catch {
      showToast('Failed to update draft', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Edit Draft" onClose={onClose} widthClassName="max-w-xl">
      <div className="flex flex-col gap-3">
        {script && (
          <div>
            <label className="block text-xs font-medium text-slate-500">
              🎤 Script — read this out loud while filming
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-500">📝 Instagram caption — post this</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={8}
            className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
          />
          <p className="mt-1 text-right text-xs text-slate-400">{caption.length} characters</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Hashtags</label>
          <div className="mt-1">
            <HashtagInput value={hashtags} onChange={setHashtags} />
          </div>
        </div>

        <div className="flex gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500">Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Time</label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DraftStatus)}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-slate-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & Schedule'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
