import type { PostData, BotConfig, TemplateSettings } from '../types';

export interface SendTelegramParams {
  botConfig: BotConfig;
  templateSettings: TemplateSettings;
  postData: PostData;
}

export function formatCaption(post: PostData, template: string, includeTextLinks: boolean, includeSynopsis = false): string {
  const episodesText = post.episodes?.length
    ? post.episodes.map(ep => includeTextLinks
        ? `• <a href="${ep.url}">${escapeHtml(ep.label)}</a>`
        : `• ${escapeHtml(ep.label)}`).join('\n')
    : 'No episode links found.';
  const actualPostLink = post.websiteUrl
    ? `<a href="${post.websiteUrl}">${escapeHtml(post.websiteUrl)}</a>`
    : '';
  const synopsisVal = includeSynopsis ? (post.synopsis || post.description || '') : '';
  return template
    .replace(/📝\s*\{description\}/g, escapeHtml(synopsisVal ? `📝 ${synopsisVal}` : ''))
    .replace(/📝\s*\{synopsis\}/g, escapeHtml(synopsisVal ? `📝 ${synopsisVal}` : ''))
    .replace(/\{title\}/g, escapeHtml(post.title || 'Untitled'))
    .replace(/\{description\}/g, escapeHtml(synopsisVal))
    .replace(/\{synopsis\}/g, escapeHtml(synopsisVal))
    .replace(/\{post_url\}/g, actualPostLink)
    .replace(/\{website_url\}/g, actualPostLink)
    .replace(/\{episodes_list\}/g, episodesText)
    .replace(/\{tags\}/g, '')
    .replace(/\{episodes_count\}/g, String(post.episodes?.length || 0))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || `Request failed: HTTP ${res.status}`);
  return json;
}

export async function verifyTelegramBot(botToken: string, chatId?: string): Promise<{bot:any; chat?:any; warning?:string}> {
  const json = await postJson<any>('/api/telegram/verify', { botToken, chatId });
  return { bot: json.bot, chat: json.chat, warning: json.chatWarning };
}

export async function sendPostToTelegram(params: SendTelegramParams): Promise<{ok:boolean; messageId:number; postLink?:string; chat?:any}> {
  const { botConfig, templateSettings, postData } = params;
  if (!botConfig.botToken) throw new Error('Please configure your Telegram Bot Token');
  if (!botConfig.chatId) throw new Error('Please specify your Target Channel or Group ID (e.g., @mychannel or -100...)');
  const caption = formatCaption(postData, templateSettings.captionTemplate, templateSettings.includeTextLinks, templateSettings.includeSynopsis ?? false);
  const json = await postJson<any>('/api/telegram/send', {
    botToken: botConfig.botToken,
    chatId: botConfig.chatId,
    messageThreadId: botConfig.topicId ? Number(botConfig.topicId) : undefined,
    thumbnailUrl: templateSettings.sendAsPhoto && postData.thumbnail ? postData.thumbnail : undefined,
    galleryImages: templateSettings.sendGalleryAlbum ? (postData.galleryImages || []) : [],
    sendGalleryAlbum: templateSettings.sendGalleryAlbum,
    maxGalleryImages: templateSettings.maxGalleryImages || 5,
    caption,
    parseMode: templateSettings.parseMode,
    episodes: postData.episodes,
    buttonsLayout: templateSettings.buttonsLayout,
    disableNotification: templateSettings.disableNotification,
    protectContent: templateSettings.protectContent,
    pinMessage: templateSettings.pinMessage,
  });
  return { ok: true, messageId: json.messageId, postLink: json.postLink, chat: json.chat };
}

export async function uploadDataZipToTelegram(payload: {botToken:string; chatId:string; messageThreadId?:string; caption?:string; rateLimitDelayMs?:number; autoRetryOn429?:boolean; maxRetries?:number}): Promise<any> {
  const json = await postJson<any>('/api/telegram/upload-data-zip', payload);
  return json.data;
}
