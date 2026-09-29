import type { PostData, BotConfig, TemplateSettings, HistoryItem, BatchItem, EpisodeItem, CatalogPostItem } from '../types';

export type AppTab = 'studio' | 'crawler' | 'flow' | 'batch' | 'history';

export interface AppState {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  crawlerRunning: boolean;
  setCrawlerRunning: (running: boolean) => void;

  post: PostData;
  setPost: (post: Partial<PostData> | ((prev: PostData) => PostData)) => void;
  loadSamplePost: (sampleIndex: number) => void;
  addEpisode: (episode: Omit<EpisodeItem, 'id'>) => void;
  updateEpisode: (id: string, updates: Partial<EpisodeItem>) => void;
  removeEpisode: (id: string) => void;
  reorderEpisodes: (episodes: EpisodeItem[]) => void;
  clearEpisodes: () => void;

  botConfig: BotConfig;
  setBotConfig: (config: Partial<BotConfig>) => void;
  botModalOpen: boolean;
  setBotModalOpen: (open: boolean) => void;
  isVerifyingBot: boolean;
  setIsVerifyingBot: (loading: boolean) => void;

  templateSettings: TemplateSettings;
  setTemplateSettings: (settings: Partial<TemplateSettings>) => void;

  bulkEpisodesModalOpen: boolean;
  setBulkEpisodesModalOpen: (open: boolean) => void;
  dataLibraryModalOpen: boolean;
  setDataLibraryModalOpen: (open: boolean) => void;
  autoSaveToLibrary: boolean;
  setAutoSaveToLibrary: (enabled: boolean) => void;
  lastSavedLocation: {folder:string;filename:string}|null;
  setLastSavedLocation: (loc:{folder:string;filename:string}|null) => void;
  isScraping: boolean;
  setIsScraping: (loading:boolean) => void;
  isSending: boolean;
  setIsSending: (loading:boolean) => void;

  history: HistoryItem[];
  addHistoryItem: (item: Omit<HistoryItem,'id'|'timestamp'>) => void;
  clearHistory: () => void;
  removeHistoryItem: (id:string) => void;

  batchItems: BatchItem[];
  setBatchItems: (items: BatchItem[]|((prev:BatchItem[])=>BatchItem[])) => void;
  addBatchUrl: (url:string) => void;
  clearBatch: () => void;

  activeCatalogIndex:number;
  setActiveCatalogIndex:(index:number)=>void;
  updateCatalogPost:(id:string,updates:Partial<CatalogPostItem>)=>void;
}
