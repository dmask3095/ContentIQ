import { create } from 'zustand';
import type { ContentDraft, ContentIdea, ResearchItem, UserSettings } from '../types';

export type TabId =
  | 'research'
  | 'ideation'
  | 'drafts'
  | 'calendar'
  | 'captions'
  | 'hashtags'
  | 'formats'
  | 'settings';

export type FormatSubTab = 'reel' | 'carousel' | 'story';

const MAX_SELECTED_ITEMS = 5;

interface AppState {
  activeTab: TabId;
  activeFormatSubTab: FormatSubTab;
  researchItems: ResearchItem[];
  contentIdeas: ContentIdea[];
  contentDrafts: ContentDraft[];
  selectedItemIds: string[];
  userSettings: UserSettings | null;
  lastRefreshedAt: string | null;

  setTab: (tab: TabId) => void;
  setLastRefreshedAt: (iso: string) => void;
  setFormatSubTab: (tab: FormatSubTab) => void;
  setResearchItems: (items: ResearchItem[]) => void;
  updateResearchItem: (id: string, patch: Partial<ResearchItem>) => void;
  toggleSelectedItem: (id: string) => void;
  clearSelectedItems: () => void;
  setContentIdeas: (ideas: ContentIdea[]) => void;
  setContentDrafts: (drafts: ContentDraft[]) => void;
  addContentDraft: (draft: ContentDraft) => void;
  updateContentDraft: (id: string, patch: Partial<ContentDraft>) => void;
  removeContentDraft: (id: string) => void;
  setUserSettings: (settings: UserSettings) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'research',
  activeFormatSubTab: 'reel',
  researchItems: [],
  contentIdeas: [],
  contentDrafts: [],
  selectedItemIds: [],
  userSettings: null,
  lastRefreshedAt: null,

  setTab: (tab) => set({ activeTab: tab }),
  setLastRefreshedAt: (iso) => set({ lastRefreshedAt: iso }),
  setFormatSubTab: (tab) => set({ activeFormatSubTab: tab }),
  setResearchItems: (items) => set({ researchItems: items }),
  updateResearchItem: (id, patch) =>
    set((s) => ({ researchItems: s.researchItems.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
  toggleSelectedItem: (id) =>
    set((s) => ({
      selectedItemIds: s.selectedItemIds.includes(id)
        ? s.selectedItemIds.filter((x) => x !== id)
        : s.selectedItemIds.length < MAX_SELECTED_ITEMS
          ? [...s.selectedItemIds, id]
          : s.selectedItemIds,
    })),
  clearSelectedItems: () => set({ selectedItemIds: [] }),
  setContentIdeas: (ideas) => set({ contentIdeas: ideas }),
  setContentDrafts: (drafts) => set({ contentDrafts: drafts }),
  addContentDraft: (draft) => set((s) => ({ contentDrafts: [draft, ...s.contentDrafts] })),
  updateContentDraft: (id, patch) =>
    set((s) => ({ contentDrafts: s.contentDrafts.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
  removeContentDraft: (id) => set((s) => ({ contentDrafts: s.contentDrafts.filter((d) => d.id !== id) })),
  setUserSettings: (settings) => set({ userSettings: settings }),
}));
