const CATEGORIES = ['AI News', 'AI Tools', 'Trends', 'Tips', 'Other'];
const SOURCES = ['hn', 'reddit', 'google', 'techcrunch', 'blog', 'rss'];

interface FilterBarProps {
  category: string;
  source: string;
  showArchived: boolean;
  onCategoryChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onShowArchivedChange: (value: boolean) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function FilterBar({
  category,
  source,
  showArchived,
  onCategoryChange,
  onSourceChange,
  onShowArchivedChange,
  onRefresh,
  refreshing,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1 text-sm"
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={source}
        onChange={(e) => onSourceChange(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1 text-sm"
      >
        <option value="">All sources</option>
        {SOURCES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        <input type="checkbox" checked={showArchived} onChange={(e) => onShowArchivedChange(e.target.checked)} />
        Show archived
      </label>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="ml-auto rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {refreshing ? 'Refreshing…' : 'Refresh Research'}
      </button>
    </div>
  );
}
