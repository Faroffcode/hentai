import type { PostData } from './post';

export interface BatchItem {
  id: string;
  url: string;
  status: 'idle' | 'scraping' | 'ready' | 'sending' | 'sent' | 'failed';
  postData?: PostData;
  error?: string;
  messageId?: number;
  telegramLink?: string;
}
