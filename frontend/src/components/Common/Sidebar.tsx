import { useAppStore, type TabId } from '../../store/useAppStore';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'research', label: 'Research', icon: '🔍' },
  { id: 'ideation', label: 'Ideation', icon: '💡' },
  { id: 'drafts', label: 'Drafts', icon: '📝' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'captions', label: 'Captions', icon: '✏️' },
  { id: 'hashtags', label: 'Trending Hashtags', icon: '#️⃣' },
  { id: 'formats', label: 'Reels / Posts / Stories', icon: '🎬' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setTab = useAppStore((s) => s.setTab);

  return (
    <nav className="flex w-56 flex-shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-3">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setTab(tab.id)}
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
            activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span aria-hidden>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
