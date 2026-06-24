import { useState } from 'react';
import { useToast } from '../Common/Toast';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useRefreshResearch, useResearch, useUpdateResearchItem } from '../../hooks/useResearch';
import { useAppStore } from '../../store/useAppStore';
import { FilterBar } from './FilterBar';
import { ResearchGrid } from './ResearchGrid';

export function ResearchTab() {
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const { showToast } = useToast();

  const { items, loading, error, refetch } = useResearch({
    category: category || undefined,
    source: source || undefined,
    is_archived: showArchived ? undefined : false,
  });
  const { refresh, loading: refreshing } = useRefreshResearch();
  const { update } = useUpdateResearchItem();

  const selectedItemIds = useAppStore((s) => s.selectedItemIds);
  const toggleSelectedItem = useAppStore((s) => s.toggleSelectedItem);
  const setTab = useAppStore((s) => s.setTab);

  const handleRefresh = async () => {
    try {
      const result = await refresh();
      showToast(`Sweep complete: ${result.items_found} found, ${result.items_added} new`, 'success');
      await refetch();
    } catch {
      showToast('Research refresh failed — check backend logs', 'error');
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await update(id, { is_read: true });
    } catch {
      showToast('Could not mark item as read', 'error');
    }
  };

  const handleToggleArchive = async (id: string) => {
    const item = items.find((i) => i.id === id);
    try {
      await update(id, { is_archived: !item?.isArchived });
      showToast(item?.isArchived ? 'Unarchived' : 'Saved to archive', 'success');
    } catch {
      showToast('Could not update item', 'error');
    }
  };

  const handleIdeateNow = (id: string) => {
    if (!selectedItemIds.includes(id)) toggleSelectedItem(id);
    setTab('ideation');
  };

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        category={category}
        source={source}
        showArchived={showArchived}
        onCategoryChange={setCategory}
        onSourceChange={setSource}
        onShowArchivedChange={setShowArchived}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {selectedItemIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
          <span>{selectedItemIds.length} item(s) selected for ideation (max 5)</span>
          <button onClick={() => setTab('ideation')} className="rounded bg-white px-3 py-1 font-medium text-slate-900">
            Batch Ideate →
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? <LoadingSpinner label="Loading research items…" /> : (
        <ResearchGrid
          items={items}
          onIdeateNow={handleIdeateNow}
          onMarkRead={handleMarkRead}
          onToggleArchive={handleToggleArchive}
        />
      )}
    </div>
  );
}
