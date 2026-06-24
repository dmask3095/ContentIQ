import { useToast } from '../Common/Toast';
import { useGenerateIdeas } from '../../hooks/useIdeation';
import { useAppStore } from '../../store/useAppStore';
import { ConceptCard } from './ConceptCard';
import { ConceptGenerator } from './ConceptGenerator';

export function IdeationTab() {
  const { generate, loading, error } = useGenerateIdeas();
  const { showToast } = useToast();
  const selectedItemIds = useAppStore((s) => s.selectedItemIds);
  const contentIdeas = useAppStore((s) => s.contentIdeas);
  const setContentIdeas = useAppStore((s) => s.setContentIdeas);

  const handleGenerate = async () => {
    try {
      const ideas = await generate(selectedItemIds);
      setContentIdeas(ideas);
      if (ideas.length === 0) {
        showToast('No ideas generated — check Gemini API key in Settings, or try again (free tier can be busy)', 'error');
      } else {
        showToast(`Generated ${ideas.length} concept(s)`, 'success');
      }
    } catch {
      showToast('Failed to generate ideas', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ConceptGenerator onGenerate={handleGenerate} generating={loading} hasIdeas={contentIdeas.length > 0} />
      {error && <p className="text-sm text-red-600">{error}</p>}

      {contentIdeas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400">
          Select research items and click "Generate Concepts" to see Gemini-generated ideas here.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {contentIdeas.map((idea) => (
            <ConceptCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  );
}
