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
