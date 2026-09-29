import { create } from 'zustand';
import type { PostData, BotConfig, TemplateSettings, HistoryItem, BatchItem, EpisodeItem, CatalogPostItem } from '../types';
import { SAMPLE_POSTS } from '../services/api';

interface AppState {
  activeTab: 'studio' | 'crawler' | 'flow' | 'batch' | 'history';
  setActiveTab: (tab: 'studio' | 'crawler' | 'flow' | 'batch' | 'history') => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  crawlerRunning: boolean;
  setCrawlerRunning: (running: boolean) => void;

  // Post Data
  post: PostData;
  setPost: (post: Partial<PostData> | ((prev: PostData) => PostData)) => void;
  loadSamplePost: (sampleIndex: number) => void;
  addEpisode: (episode: Omit<EpisodeItem, 'id'>) => void;
  updateEpisode: (id: string, updates: Partial<EpisodeItem>) => void;
  removeEpisode: (id: string) => void;
  reorderEpisodes: (episodes: EpisodeItem[]) => void;
  clearEpisodes: () => void;

  // Telegram Bot Config
  botConfig: BotConfig;
  setBotConfig: (config: Partial<BotConfig>) => void;
  botModalOpen: boolean;
  setBotModalOpen: (open: boolean) => void;
  isVerifyingBot: boolean;
  setIsVerifyingBot: (loading: boolean) => void;

  // Template & Layout Settings
  templateSettings: TemplateSettings;
  setTemplateSettings: (settings: Partial<TemplateSettings>) => void;

  // Modals & Status
  bulkEpisodesModalOpen: boolean;
  setBulkEpisodesModalOpen: (open: boolean) => void;
  dataLibraryModalOpen: boolean;
  setDataLibraryModalOpen: (open: boolean) => void;
  autoSaveToLibrary: boolean;
  setAutoSaveToLibrary: (enabled: boolean) => void;
  lastSavedLocation: { folder: string; filename: string } | null;
  setLastSavedLocation: (loc: { folder: string; filename: string } | null) => void;
  isScraping: boolean;
  setIsScraping: (loading: boolean) => void;
  isSending: boolean;
  setIsSending: (loading: boolean) => void;

  // History & Queue
  history: HistoryItem[];
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  removeHistoryItem: (id: string) => void;

  // Batch Poster
  batchItems: BatchItem[];
  setBatchItems: (items: BatchItem[] | ((prev: BatchItem[]) => BatchItem[])) => void;
  addBatchUrl: (url: string) => void;
  clearBatch: () => void;

  // Active Catalog Navigator
  activeCatalogIndex: number;
  setActiveCatalogIndex: (index: number) => void;
  updateCatalogPost: (id: string, updates: Partial<CatalogPostItem>) => void;
}

const DEFAULT_POST: PostData = {
  websiteUrl: '',
  title: '',
  thumbnail: '',
  description: '',
  synopsis: '',
  galleryImages: [],
  siteName: '',
  episodes: [],
  isCatalog: false,
  catalogPosts: [],
};

const DEFAULT_TEMPLATE: TemplateSettings = {
  captionTemplate: `🍿 <b>{title}</b>\n\n🎬 <b>Episodes:</b>\n{episodes_list}\n\n🔗 <b>Post Link:</b> {post_url}`,
  buttonsLayout: '2-col',
  includeTextLinks: true,
  includeSynopsis: false,
  sendAsPhoto: true,
  sendGalleryAlbum: true,
  maxGalleryImages: 5,
  disableNotification: false,
  protectContent: false,
  pinMessage: false,
  parseMode: 'HTML',
};

const STORAGE_KEY = 'telepost_config_v1';

// Safe storage wrapper for cross-origin iframes
function safeGetStorage(key: string): any {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    // Access denied in restricted iframe or private mode
  }
  return null;
}

function safeSetStorage(key: string, val: any): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(val));
    }
  } catch (e) {
    // Ignore iframe storage quota or security errors
  }
}

const stored = safeGetStorage(STORAGE_KEY) || {};
const isOldDemoPost = stored?.post?.title?.includes('Solo Leveling') || stored?.post?.title?.includes('Queen of Tears');
const initialPost: PostData = (stored?.post && !isOldDemoPost) ? {
  websiteUrl: stored.post.websiteUrl || '',
  title: stored.post.title || '',
  thumbnail: stored.post.thumbnail || '',
  description: stored.post.description || '',
  synopsis: stored.post.synopsis || stored.post.description || '',
  galleryImages: Array.isArray(stored.post.galleryImages) ? stored.post.galleryImages : [],
  siteName: stored.post.siteName || '',
  episodes: Array.isArray(stored.post.episodes) ? stored.post.episodes : [],
  isCatalog: Boolean(stored.post.isCatalog),
  catalogPosts: Array.isArray(stored.post.catalogPosts) ? stored.post.catalogPosts : [],
} : DEFAULT_POST;

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'studio',
  setActiveTab: tab => set({ activeTab: tab }),

  sidebarCollapsed: false,
  setSidebarCollapsed: collapsed => set({ sidebarCollapsed: collapsed }),

  crawlerRunning: false,
  setCrawlerRunning: running => set({ crawlerRunning: running }),

  post: initialPost,
  setPost: updater =>
    set(state => {
      const nextPost = typeof updater === 'function' ? updater(state.post) : { ...state.post, ...updater };
      saveToStorage({ post: nextPost });
      return { post: nextPost };
    }),

  activeCatalogIndex: 0,
  setActiveCatalogIndex: index => set({ activeCatalogIndex: index }),
  updateCatalogPost: (id, updates) =>
    set(state => {
      const posts = (state.post.catalogPosts || []).map(p => (p.id === id ? { ...p, ...updates } : p));
      return { post: { ...state.post, catalogPosts: posts } };
    }),

  loadSamplePost: () => {
    set({ post: { ...DEFAULT_POST } });
  },

  addEpisode: ep =>
    set(state => ({
      post: {
        ...state.post,
        episodes: [
          ...state.post.episodes,
          {
            id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            ...ep,
          },
        ],
      },
    })),

  updateEpisode: (id, updates) =>
    set(state => ({
      post: {
        ...state.post,
        episodes: state.post.episodes.map(ep => (ep.id === id ? { ...ep, ...updates } : ep)),
      },
    })),

  removeEpisode: id =>
    set(state => ({
      post: {
        ...state.post,
        episodes: state.post.episodes.filter(ep => ep.id !== id),
      },
    })),

  reorderEpisodes: episodes =>
    set(state => ({
      post: { ...state.post, episodes },
    })),

  clearEpisodes: () =>
    set(state => ({
      post: { ...state.post, episodes: [] },
    })),

  // Bot Config
  botConfig: {
    botToken: '',
    chatId: '',
    topicId: '',
    verified: false,
    rateLimitDelayMs: 1500,
    autoRetryOn429: true,
    maxRetries: 3,
    ...(stored?.botConfig || {})
  },
  setBotConfig: config =>
    set(state => {
      const nextConfig = { ...state.botConfig, ...config };
      saveToStorage({ botConfig: nextConfig });
      return { botConfig: nextConfig };
    }),

  botModalOpen: false,
  setBotModalOpen: open => set({ botModalOpen: open }),
  isVerifyingBot: false,
  setIsVerifyingBot: loading => set({ isVerifyingBot: loading }),

  // Template Settings
  templateSettings: (() => {
    const t = stored?.templateSettings;
    if (!t) return DEFAULT_TEMPLATE;
    if (t.captionTemplate && (t.captionTemplate.includes('{tags}') || t.captionTemplate.includes('Source:'))) {
      return {
        ...t,
        captionTemplate: t.captionTemplate
          .replace(/🌐\s*<b>Source:<\/b>\s*\{website_url\}/g, '🔗 <b>Post Link:</b> {post_url}')
          .replace(/Source:\s*\{website_url\}/g, 'Post Link: {post_url}')
          .replace(/\s*\{tags\}/g, '')
          .trim(),
      };
    }
    return t;
  })(),
  setTemplateSettings: settings =>
    set(state => {
      const nextSettings = { ...state.templateSettings, ...settings };
      saveToStorage({ templateSettings: nextSettings });
      return { templateSettings: nextSettings };
    }),

  bulkEpisodesModalOpen: false,
  setBulkEpisodesModalOpen: open => set({ bulkEpisodesModalOpen: open }),

  dataLibraryModalOpen: false,
  setDataLibraryModalOpen: open => set({ dataLibraryModalOpen: open }),

  autoSaveToLibrary: stored?.autoSaveToLibrary !== undefined ? Boolean(stored.autoSaveToLibrary) : true,
  setAutoSaveToLibrary: enabled =>
    set(() => {
      saveToStorage({ autoSaveToLibrary: enabled });
      return { autoSaveToLibrary: enabled };
    }),

  lastSavedLocation: null,
  setLastSavedLocation: loc => set({ lastSavedLocation: loc }),

  isScraping: false,
  setIsScraping: loading => set({ isScraping: loading }),

  isSending: false,
  setIsSending: loading => set({ isSending: loading }),

  // History
  history: stored?.history || [],
  addHistoryItem: item =>
    set(state => {
      const newItem: HistoryItem = {
        ...item,
        id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
      };
      const nextHistory = [newItem, ...state.history].slice(0, 50);
      saveToStorage({ history: nextHistory });
      return { history: nextHistory };
    }),

  clearHistory: () =>
    set(() => {
      saveToStorage({ history: [] });
      return { history: [] };
    }),

  removeHistoryItem: id =>
    set(state => {
      const nextHistory = state.history.filter(h => h.id !== id);
      saveToStorage({ history: nextHistory });
      return { history: nextHistory };
    }),

  // Batch
  batchItems: [],
  setBatchItems: updater =>
    set(state => ({
      batchItems: typeof updater === 'function' ? updater(state.batchItems) : updater,
    })),

  addBatchUrl: url =>
    set(state => ({
      batchItems: [
        ...state.batchItems,
        {
          id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          url: url.trim(),
          status: 'idle',
        },
      ],
    })),

  clearBatch: () => set({ batchItems: [] }),
}));

function saveToStorage(partial: any) {
  try {
    const current = safeGetStorage(STORAGE_KEY) || {};
    const merged = { ...current, ...partial };
    safeSetStorage(STORAGE_KEY, merged);
  } catch (e) {
    // Ignore storage errors in restricted contexts
  }
}
