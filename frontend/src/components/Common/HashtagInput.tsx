import { useState, type KeyboardEvent } from 'react';

interface HashtagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function HashtagInput({ value, onChange, placeholder }: HashtagInputProps) {
  const [draft, setDraft] = useState('');

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#?/, '#');
    if (tag.length <= 1 || value.includes(tag)) return;
    onChange([...value, tag]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
      setDraft('');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded border border-slate-300 p-2">
      {value.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          {tag}
          <button onClick={() => onChange(value.filter((t) => t !== tag))} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim()) {
            addTag(draft);
            setDraft('');
          }
        }}
        placeholder={placeholder ?? 'Add hashtag, press Enter'}
        className="min-w-[140px] flex-1 border-none text-sm outline-none"
      />
    </div>
  );
}
