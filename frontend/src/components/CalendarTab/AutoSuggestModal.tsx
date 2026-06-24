import { useEffect, useState } from 'react';
import { Modal } from '../Common/Modal';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useAutoSuggestSchedule, type ScheduleSuggestion } from '../../hooks/useCalendar';

export function AutoSuggestModal({ onClose }: { onClose: () => void }) {
  const { suggest, loading, error } = useAutoSuggestSchedule();
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    suggest()
      .then(setSuggestions)
      .finally(() => setFetched(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal title="Suggested Schedule" onClose={onClose} widthClassName="max-w-lg">
      {loading || !fetched ? (
        <LoadingSpinner label="Analyzing post performance…" />
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-500">
            Based on historical engagement (falls back to sensible defaults if there's no published history yet).
          </p>
          {suggestions.map((s, i) => (
            <div key={i} className="rounded border border-slate-200 p-3 text-sm">
              <div className="flex items-center justify-between font-medium text-slate-900">
                <span>
                  {s.date} at {s.time}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{s.format}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{s.reason}</p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
