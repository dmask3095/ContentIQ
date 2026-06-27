import { useState } from 'react';
import { HashtagInput } from '../Common/HashtagInput';
import { useToast } from '../Common/Toast';
import { useCreateDraft } from '../../hooks/useDrafts';
import type { ContentIdea } from '../../types';
import { truncate } from '../../utils/formatters';

const FORMAT_LABELS: Record<string, string> = {
  reel_hook: 'Reel Hook',
  carousel: 'Carousel (5 slides)',
  story: 'Story',
  caption: 'Caption',
};

export function ConceptCard({ idea }: { idea: ContentIdea }) {
  const { showToast } = useToast();
  const { create } = useCreateDraft();

  const [caption, setCaption] = useState(idea.aiGeneratedCaption);
  const [script, setScript] = useState(idea.aiScript);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [saving, setSaving] = useState(false);

  const handleCopyScript = async () => {
    await navigator.clipboard.writeText(script);
    showToast('Script copied', 'success');
  };

  const handleSaveAsDraft = async () => {
    setSaving(true);
    try {
      await create({
        idea_id: idea.id,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        caption,
        script: script || undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
      });
      showToast('Saved as draft', 'success');
      setShowSaveForm(false);
    } catch {
      showToast('Failed to save draft', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">
          {FORMAT_LABELS[idea.format] ?? idea.format}
        </span>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{idea.tone}</span>
      </div>

      <p className="text-lg font-bold leading-snug text-slate-900">{idea.aiHook}</p>

      {script && (
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            🎤 Script — read this out loud while filming
          </p>
          {isEditingScript ? (
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={5}
              className="w-full rounded border border-slate-300 p-2 text-sm"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-slate-800">{script}</p>
          )}
          <div className="mt-2 flex gap-3 text-xs font-medium text-blue-600">
            <button onClick={handleCopyScript}>Copy script</button>
            <button onClick={() => setIsEditingScript((v) => !v)}>
              {isEditingScript ? 'Done editing' : 'Edit script'}
            </button>
          </div>
        </div>
      )}

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          📝 Instagram caption — post this
        </p>
        {isEditingCaption ? (
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={6}
            className="w-full rounded border border-slate-300 p-2 text-sm"
          />
        ) : (
          <p className="text-sm text-slate-600">{expanded ? caption : truncate(caption, 180)}</p>
        )}

        <div className="mt-2 flex gap-3 text-xs font-medium text-blue-600">
          {!isEditingCaption && (
            <button onClick={() => setExpanded((v) => !v)}>{expanded ? 'Show less' : 'Show full caption'}</button>
          )}
          <button onClick={() => setIsEditingCaption((v) => !v)}>
            {isEditingCaption ? 'Done editing' : 'Edit Caption'}
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">Hashtags (optional — leave empty to auto-generate)</p>
        <HashtagInput value={hashtags} onChange={setHashtags} />
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-400">
          via {idea.generatedBy === 'gemini' ? 'Gemini' : idea.generatedBy === 'gpt4' ? 'GPT-4' : 'Claude'}
        </span>
        <button
          onClick={() => setShowSaveForm((v) => !v)}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Save as Draft
        </button>
      </div>

      {showSaveForm && (
        <div className="flex items-end gap-2 rounded bg-slate-50 p-3">
          <div>
            <label className="block text-xs text-slate-500">Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Time</label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </div>
          <button
            onClick={handleSaveAsDraft}
            disabled={saving}
            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      )}
    </div>
  );
}
