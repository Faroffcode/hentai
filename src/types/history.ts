import type { PostData } from './post';

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
