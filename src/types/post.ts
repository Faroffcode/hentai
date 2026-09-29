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
