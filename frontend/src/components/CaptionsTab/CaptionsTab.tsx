import { useState } from 'react';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { DraftEditor } from '../DraftsTab/DraftEditor';
import { useDrafts } from '../../hooks/useDrafts';
import type { ContentDraft } from '../../types';
import { CaptionGenerator } from './CaptionGenerator';
import { CaptionLibrary } from './CaptionLibrary';
import { CaptionSearch } from './CaptionSearch';

export function CaptionsTab() {
  const [query, setQuery] = useState('');
  const [format, setFormat] = useState('');
  const { drafts, loading, error } = useDrafts({ format: format || undefined });
  const [editingDraft, setEditingDraft] = useState<ContentDraft | null>(null);

  const filtered = drafts.filter((d) => {
    if (!query.trim()) return true;
    const haystack = `${d.title} ${d.caption}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <div className="flex flex-col gap-4">
      <CaptionGenerator />
      <CaptionSearch query={query} format={format} onQueryChange={setQuery} onFormatChange={setFormat} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? <LoadingSpinner label="Loading caption library…" /> : <CaptionLibrary drafts={filtered} onEdit={setEditingDraft} />}
      {editingDraft && <DraftEditor draft={editingDraft} onClose={() => setEditingDraft(null)} />}
    </div>
  );
}
