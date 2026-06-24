import { useAppStore, type FormatSubTab } from '../../store/useAppStore';
import { PostsTab } from './PostsTab';
import { ReelsTab } from './ReelsTab';
import { StoriesTab } from './StoriesTab';

const SUB_TABS: { id: FormatSubTab; label: string }[] = [
  { id: 'reel', label: 'Reels' },
  { id: 'carousel', label: 'Posts' },
  { id: 'story', label: 'Stories' },
];

export function FormatsTab() {
  const activeFormatSubTab = useAppStore((s) => s.activeFormatSubTab);
  const setFormatSubTab = useAppStore((s) => s.setFormatSubTab);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 self-start rounded bg-slate-100 p-1">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFormatSubTab(tab.id)}
            className={`rounded px-4 py-1.5 text-sm font-medium ${
              activeFormatSubTab === tab.id ? 'bg-white shadow' : 'text-slate-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeFormatSubTab === 'reel' && <ReelsTab />}
      {activeFormatSubTab === 'carousel' && <PostsTab />}
      {activeFormatSubTab === 'story' && <StoriesTab />}
    </div>
  );
}
