import type { ComponentType } from 'react';
import { ErrorBoundary } from '../components/Common/ErrorBoundary';
import { Header } from '../components/Common/Header';
import { Sidebar } from '../components/Common/Sidebar';
import { CalendarTab } from '../components/CalendarTab/CalendarTab';
import { CaptionsTab } from '../components/CaptionsTab/CaptionsTab';
import { DraftsTab } from '../components/DraftsTab/DraftsTab';
import { FormatsTab } from '../components/FormatTabs/FormatsTab';
import { HashtagsTab } from '../components/HashtagsTab/HashtagsTab';
import { IdeationTab } from '../components/IdeationTab/IdeationTab';
import { ResearchTab } from '../components/ResearchTab/ResearchTab';
import { SettingsTab } from '../components/SettingsTab/SettingsTab';
import { useAppStore, type TabId } from '../store/useAppStore';

const TAB_COMPONENTS: Record<TabId, ComponentType> = {
  research: ResearchTab,
  ideation: IdeationTab,
  drafts: DraftsTab,
  calendar: CalendarTab,
  captions: CaptionsTab,
  hashtags: HashtagsTab,
  formats: FormatsTab,
  settings: SettingsTab,
};

export function Dashboard() {
  const activeTab = useAppStore((s) => s.activeTab);
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {/* key={activeTab} remounts the boundary on tab switch, so a crash
              in one tab doesn't keep showing the error screen on others. */}
          <ErrorBoundary key={activeTab}>
            <ActiveComponent />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
