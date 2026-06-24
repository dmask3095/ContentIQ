import { useAppStore } from '../../store/useAppStore';
import { truncate } from '../../utils/formatters';

interface ConceptGeneratorProps {
  onGenerate: () => void;
  generating: boolean;
  hasIdeas: boolean;
}

export function ConceptGenerator({ onGenerate, generating, hasIdeas }: ConceptGeneratorProps) {
  const researchItems = useAppStore((s) => s.researchItems);
  const selectedItemIds = useAppStore((s) => s.selectedItemIds);
  const toggleSelectedItem = useAppStore((s) => s.toggleSelectedItem);

  const selectedItems = researchItems.filter((i) => selectedItemIds.includes(i.id));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-700">Pick 1-5 research items to ideate (select them in the Research tab)</p>
      {selectedItems.length === 0 ? (
        <p className="text-sm text-slate-400">No items selected yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {selectedItems.map((item) => (
            <span
              key={item.id}
              className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
            >
              {truncate(item.title, 40)}
              <button onClick={() => toggleSelectedItem(item.id)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        onClick={onGenerate}
        disabled={selectedItems.length === 0 || generating}
        className="self-start rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {generating ? 'Generating…' : hasIdeas ? 'Regenerate Concepts' : 'Generate Concepts'}
      </button>
    </div>
  );
}
