const ALL_CATEGORIES = ['AI News', 'AI Tools', 'Trends', 'Tips'];
const ALL_SOURCES: { key: 'google' | 'rss' | 'scrape'; label: string }[] = [
  { key: 'google', label: 'Google Custom Search' },
  { key: 'rss', label: 'RSS feeds' },
  { key: 'scrape', label: 'Web scraping' },
];

interface ResearchSettingsProps {
  sweepTime: string;
  sweepEnabled: boolean;
  dataSourcesEnabled: { google: boolean; rss: boolean; scrape: boolean };
  contentCategories: string[];
  relevanceThreshold: number;
  onChange: (patch: Partial<{
    sweepTime: string;
    sweepEnabled: boolean;
    dataSourcesEnabled: { google: boolean; rss: boolean; scrape: boolean };
    contentCategories: string[];
    relevanceThreshold: number;
  }>) => void;
}

export function ResearchSettings({
  sweepTime,
  sweepEnabled,
  dataSourcesEnabled,
  contentCategories,
  relevanceThreshold,
  onChange,
}: ResearchSettingsProps) {
  const toggleCategory = (cat: string) => {
    onChange({
      contentCategories: contentCategories.includes(cat)
        ? contentCategories.filter((c) => c !== cat)
        : [...contentCategories, cat],
    });
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-900">Research Engine</h3>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={sweepEnabled} onChange={(e) => onChange({ sweepEnabled: e.target.checked })} />
        Daily sweep enabled
      </label>

      <div className="flex items-center gap-2 text-sm text-slate-600">
        <label>Daily sweep time</label>
        <input
          type="time"
          value={sweepTime}
          onChange={(e) => onChange({ sweepTime: e.target.value })}
          className="rounded border border-slate-300 px-2 py-1"
        />
      </div>

      <div>
        <p className="mb-1 text-sm text-slate-600">Data sources</p>
        <div className="flex gap-4">
          {ALL_SOURCES.map((s) => (
            <label key={s.key} className="flex items-center gap-1.5 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={dataSourcesEnabled[s.key]}
                onChange={(e) => onChange({ dataSourcesEnabled: { ...dataSourcesEnabled, [s.key]: e.target.checked } })}
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm text-slate-600">Content categories to track</p>
        <div className="flex gap-4">
          {ALL_CATEGORIES.map((cat) => (
            <label key={cat} className="flex items-center gap-1.5 text-sm text-slate-600">
              <input type="checkbox" checked={contentCategories.includes(cat)} onChange={() => toggleCategory(cat)} />
              {cat}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-slate-600">Relevance threshold: {relevanceThreshold}/10</label>
        <input
          type="range"
          min={1}
          max={10}
          value={relevanceThreshold}
          onChange={(e) => onChange({ relevanceThreshold: Number(e.target.value) })}
          className="w-full"
        />
      </div>
    </section>
  );
}
