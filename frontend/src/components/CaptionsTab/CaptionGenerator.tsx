import { useState } from 'react';
import { useToast } from '../Common/Toast';
import { useCreateDraft } from '../../hooks/useDrafts';
import { useGenerateCaptions } from '../../hooks/useCaptions';
import type { ContentTone } from '../../types';

const TONES: ContentTone[] = ['Educational', 'Breaking', 'Opinion', 'Hype'];

export function CaptionGenerator() {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<ContentTone>('Educational');
  const [results, setResults] = useState<string[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const { generate, loading, error } = useGenerateCaptions();
  const { create } = useCreateDraft();
  const { showToast } = useToast();

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    try {
      const captions = await generate(topic, tone);
      setResults(captions);
      if (captions.length === 0) {
        showToast('No captions generated — check Gemini API key in Settings, or try again (free tier can be busy)', 'error');
      }
    } catch {
      showToast('Caption generation failed', 'error');
    }
  };

  const handleSaveToLibrary = async (caption: string, index: number) => {
    setSavingIndex(index);
    try {
      await create({
        format: 'caption',
        caption,
        scheduled_date: new Date().toISOString().slice(0, 10),
        scheduled_time: '09:00',
        title: topic.slice(0, 80),
      });
      showToast('Saved to library as a draft', 'success');
    } catch {
      showToast('Failed to save caption', 'error');
    } finally {
      setSavingIndex(null);
    }
  };

  const handleCopy = (caption: string) => {
    navigator.clipboard.writeText(caption);
    showToast('Copied to clipboard', 'success');
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-700">Quick caption generator</p>
      <div className="flex flex-wrap gap-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic, e.g. 'Claude 3.5 launch'"
          className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as ContentTone)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          {TONES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate 3 Variations'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {results.map((caption, i) => (
            <div key={i} className="flex flex-col gap-2 rounded border border-slate-200 p-3 text-sm">
              <p className="flex-1 whitespace-pre-wrap text-slate-700">{caption}</p>
              <div className="flex gap-2">
                <button onClick={() => handleCopy(caption)} className="rounded bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200">
                  Copy
                </button>
                <button
                  onClick={() => handleSaveToLibrary(caption, i)}
                  disabled={savingIndex === i}
                  className="rounded bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {savingIndex === i ? 'Saving…' : 'Save to Library'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
