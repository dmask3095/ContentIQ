interface CaptionSearchProps {
  query: string;
  format: string;
  onQueryChange: (value: string) => void;
  onFormatChange: (value: string) => void;
}

export function CaptionSearch({ query, format, onQueryChange, onFormatChange }: CaptionSearchProps) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search saved captions…"
        className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
      />
      <select
        value={format}
        onChange={(e) => onFormatChange(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1.5 text-sm"
      >
        <option value="">All formats</option>
        <option value="reel">Reel</option>
        <option value="carousel">Carousel</option>
        <option value="story">Story</option>
        <option value="caption">Caption</option>
      </select>
    </div>
  );
}
