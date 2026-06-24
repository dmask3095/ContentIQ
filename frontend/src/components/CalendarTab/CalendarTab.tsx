import { useState } from 'react';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useWeekSchedule } from '../../hooks/useCalendar';
import { mondayOf } from '../../utils/formatters';
import { AutoSuggestModal } from './AutoSuggestModal';
import { WeeklyCalendar } from './WeeklyCalendar';

export function CalendarTab() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [showSuggest, setShowSuggest] = useState(false);
  const { postsByDay, loading, error, refetch } = useWeekSchedule(weekStart.toISOString().slice(0, 10));

  const shiftWeek = (days: number) => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + days);
    setWeekStart(next);
  };

  const allPosts = Object.values(postsByDay).flat();
  const formatCounts = allPosts.reduce<Record<string, number>>((acc, p) => {
    acc[p.format] = (acc[p.format] ?? 0) + 1;
    return acc;
  }, {});
  const balanceLabel = Object.entries(formatCounts)
    .map(([format, count]) => `${count} ${format}${count > 1 ? 's' : ''}`)
    .join(', ');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftWeek(-7)} className="rounded bg-slate-100 px-2 py-1 text-sm hover:bg-slate-200">
            ← Prev
          </button>
          <span className="text-sm font-medium text-slate-700">
            Week of {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button onClick={() => shiftWeek(7)} className="rounded bg-slate-100 px-2 py-1 text-sm hover:bg-slate-200">
            Next →
          </button>
        </div>
        <button
          onClick={() => setShowSuggest(true)}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Suggest Schedule
        </button>
      </div>

      {allPosts.length > 0 && (
        <p className="text-sm text-slate-500">
          This week: <span className="font-medium text-slate-700">{balanceLabel}</span>
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <LoadingSpinner label="Loading week…" />
      ) : (
        <WeeklyCalendar weekStart={weekStart} postsByDay={postsByDay} onChanged={refetch} />
      )}

      {showSuggest && <AutoSuggestModal onClose={() => setShowSuggest(false)} />}
    </div>
  );
}
