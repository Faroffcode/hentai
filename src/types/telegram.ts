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
  botInfo?: { username?: string; firstName?: string; id?: number };
  chatInfo?: { title?: string; username?: string; type?: string; id?: number | string };
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
