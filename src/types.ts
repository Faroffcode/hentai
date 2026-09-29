export interface EpisodeItem {
  id: string;
  label: string;
  url: string;
  quality?: string;
  number?: number;
}

export interface CatalogPostItem {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  year?: string;
  badge?: string;
  description?: string;
  synopsis?: string;
  galleryImages?: string[];
  episodes?: EpisodeItem[];
  status?: 'idle' | 'scraping' | 'ready' | 'sending' | 'sent' | 'failed';
  error?: string;
  telegramLink?: string;
  messageId?: number;
}

export interface PostData {
  websiteUrl: string;
  title: string;
  thumbnail: string;
  description: string;
  synopsis?: string;
  galleryImages?: string[];
  siteName: string;
  episodes: EpisodeItem[];
  isCatalog?: boolean;
  catalogCount?: number;
  catalogPosts?: CatalogPostItem[];
}

export type ScrapedPost = PostData;

export interface BotConfig {
  botToken: string;
  chatId: string;
  topicId: string;
  messageThreadId?: string;
  verified: boolean;
  isVerified?: boolean;
  rateLimitDelayMs?: number;
  autoRetryOn429?: boolean;
  maxRetries?: number;
  botInfo?: {
    username?: string;
    firstName?: string;
    id?: number;
  };
  chatInfo?: {
    title?: string;
    username?: string;
    type?: string;
    id?: number | string;
  };
  warning?: string;
}

export interface TemplateSettings {
  captionTemplate: string;
  buttonsLayout: '1-col' | '2-col' | '3-col' | '4-col' | 'none';
  includeTextLinks: boolean;
  includeSynopsis?: boolean;
  sendAsPhoto: boolean;
  sendGalleryAlbum?: boolean;
  maxGalleryImages?: number;
  disableNotification: boolean;
  protectContent: boolean;
  pinMessage: boolean;
  parseMode: 'HTML' | 'MarkdownV2';
  rateLimitDelayMs?: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  title: string;
  thumbnail: string;
  chatId: string;
  chatTitle?: string;
  episodesCount: number;
  status: 'sent' | 'failed' | 'queued';
  messageId?: number;
  telegramLink?: string;
  errorMessage?: string;
  postData: PostData;
}

export interface BatchItem {
  id: string;
  url: string;
  status: 'idle' | 'scraping' | 'ready' | 'sending' | 'sent' | 'failed';
  postData?: PostData;
  error?: string;
  messageId?: number;
  telegramLink?: string;
}

export interface SavedPostFileMeta {
  filename: string;
  slug: string;
  title: string;
  thumbnail: string;
  synopsis?: string;
  description?: string;
  websiteUrl?: string;
  episodeCount: number;
  galleryCount: number;
  savedAt: string;
  sizeBytes: number;
}

export interface FolderMeta {
  name: string;
  number: number;
  count: number;
  max: number;
  isFull: boolean;
  files: SavedPostFileMeta[];
}

export interface LibraryManifest {
  folders: FolderMeta[];
  totalPosts: number;
  totalFolders: number;
}

export interface CrawlerLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'scraping' | 'saved' | 'duplicate' | 'warn' | 'error' | 'success' | 'page';
  message: string;
  details?: any;
}

export interface CrawlerConfig {
  baseUrl: string;
  startPage: number;
  endPage: number;
  delayMs: number;
  filterDuplicates: boolean;
  autoSave: boolean;
}

export interface CrawlerStatus {
  state: 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'error';
  currentPage: number;
  startPage: number;
  endPage: number;
  totalPagesProcessed: number;
  totalPostsFound: number;
  totalSaved: number;
  totalSkipped: number;
  totalErrors: number;
  currentPostTitle?: string;
  currentPostUrl?: string;
  startTime?: number;
  elapsedSeconds: number;
  logs: CrawlerLogEntry[];
  config: CrawlerConfig;
}


