import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';
import {
  savePostToJson,
  batchSavePosts,
  getDataLibraryManifest,
  getPostFile,
  deletePostFile,
  deleteFolder,
  clearAllLibraryData,
  createDataZipBuffer,
  getMainIndexJson,
  generateMainIndexJson
} from './storageManager';
import { crawlerService } from './crawlerService';
import {
  parseJsonBody,
  sendJson,
  extractFromHtml,
  fetchPageHtml,
  callTelegramApi,
  sendTelegramDocument,
} from './parsers/htmlParser';

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end();
    return true;
  }

  // 0. Image Proxy Endpoint (Bypasses hotlinking protection and CORS issues)
  if (url.startsWith('/api/proxy-image') && req.method === 'GET') {
    try {
      const parsedUrl = new URL(url, 'http://localhost:3000');
      const targetImgUrl = parsedUrl.searchParams.get('url');

      if (!targetImgUrl || !targetImgUrl.startsWith('http')) {
        res.statusCode = 400;
        res.end('Valid image URL is required');
        return true;
      }

      let refererUrl = '';
      try {
        const u = new URL(targetImgUrl);
        refererUrl = `${u.protocol}//${u.host}/`;
      } catch {}

      const imgResp = await fetch(targetImgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': refererUrl || targetImgUrl,
        },
      });

      if (!imgResp.ok) {
        res.statusCode = imgResp.status;
        res.end(`Image fetch failed: ${imgResp.statusText}`);
        return true;
      }

      const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
      const arrayBuf = await imgResp.arrayBuffer();

      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(Buffer.from(arrayBuf));
      return true;
    } catch (err: any) {
      res.statusCode = 500;
      res.end(`Proxy error: ${err.message}`);
      return true;
    }
  }

  // 1. Scrape Website Post or Catalog Endpoint
  if (url.startsWith('/api/scrape') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const targetUrl = body.url?.trim();

      if (!targetUrl) {
        sendJson(res, 400, { ok: false, error: 'URL is required' });
        return true;
      }

      // Validate URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('Only HTTP/HTTPS URLs are supported');
        }
      } catch (err: any) {
        sendJson(res, 400, { ok: false, error: `Invalid URL format: ${err.message}` });
        return true;
      }

      const html = await fetchPageHtml(targetUrl, 14000);
      const extracted = extractFromHtml(html, targetUrl);

      // If page is a catalog with multiple series and 0 direct episode links on the archive page itself:
      // Auto-crawl the first series so the user immediately gets a full post draft with cover, synopsis and episode links!
      if (extracted.isCatalog && extracted.catalogPosts && extracted.catalogPosts.length > 0 && extracted.episodes.length === 0) {
        try {
          const firstSeries = extracted.catalogPosts[0];
          const firstHtml = await fetchPageHtml(firstSeries.url, 8000);
          const firstExtracted = extractFromHtml(firstHtml, firstSeries.url);

          extracted.title = firstExtracted.title || firstSeries.title;
          extracted.thumbnail = firstExtracted.thumbnail || firstSeries.thumbnail;
          extracted.description = firstExtracted.description || `Episodes from ${firstSeries.title}`;
          extracted.synopsis = firstExtracted.synopsis || firstExtracted.description;
          extracted.galleryImages = firstExtracted.galleryImages || [];
          extracted.episodes = firstExtracted.episodes;
        } catch {
          // If first series fetch fails, use catalog metadata
          const firstSeries = extracted.catalogPosts[0];
          extracted.title = firstSeries.title;
          extracted.thumbnail = firstSeries.thumbnail;
        }
      }

      // If user provided a title or custom fallback
      if (!extracted.title) {
        extracted.title = parsedUrl.pathname.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ') || 'Untitled Post';
      }

      // Auto-save scraped post into codebase data/hntX/ structure if autoSave enabled
      let storageLocation: any = null;
      if (body.autoSave !== false && extracted.title && (extracted.episodes.length > 0 || extracted.description || extracted.thumbnail)) {
        try {
          storageLocation = await savePostToJson(extracted);
        } catch (err: any) {
          console.warn('[Storage] Auto-save warning:', err.message);
        }
      }

      sendJson(res, 200, {
        ok: true,
        data: extracted,
        storageLocation,
      });
      return true;
    } catch (err: any) {
      sendJson(res, 500, {
        ok: false,
        error: err.name === 'AbortError' ? 'Website request timed out' : (err.message || 'Scrape failed'),
      });
      return true;
    }
  }

  // 2. Telegram Bot & Chat Verification Endpoint
  if (url.startsWith('/api/telegram/verify') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { botToken, chatId } = body;

      if (!botToken || !botToken.trim()) {
        sendJson(res, 400, { ok: false, error: 'Telegram Bot Token is required' });
        return true;
      }

      const meData = await callTelegramApi(botToken.trim(), 'getMe', {});
      if (!meData.ok) {
        sendJson(res, 400, {
          ok: false,
          error: `Bot verification failed: ${meData.description || 'Invalid token'}`,
        });
        return true;
      }

      let chatInfo: any = null;
      if (chatId && chatId.trim()) {
        const chatData = await callTelegramApi(botToken.trim(), 'getChat', { chat_id: chatId.trim() });
        if (chatData.ok) {
          chatInfo = {
            id: chatData.result.id,
            title: chatData.result.title || chatData.result.username || 'Direct Chat',
            type: chatData.result.type,
            username: chatData.result.username ? `@${chatData.result.username}` : undefined,
          };
        } else {
          sendJson(res, 200, {
            ok: true,
            bot: meData.result,
            chatWarning: `Bot is valid, but could not access chat: ${chatData.description}. Ensure the bot is added as an administrator to the channel/group.`,
          });
          return true;
        }
      }

      sendJson(res, 200, {
        ok: true,
        bot: meData.result,
        chat: chatInfo,
      });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Telegram verification failed' });
      return true;
    }
  }

  // 3. Telegram Post Sender Endpoint
  if (url.startsWith('/api/telegram/send') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const {
        botToken,
        chatId,
        messageThreadId,
        thumbnailUrl,
        galleryImages = [],
        sendGalleryAlbum = false,
        maxGalleryImages = 5,
        caption,
        parseMode = 'HTML',
        episodes = [],
        buttonsLayout = '2-col',
        disableNotification = false,
        protectContent = false,
        pinMessage = false,
      } = body;

      if (!botToken || !chatId) {
        sendJson(res, 400, { ok: false, error: 'Both botToken and chatId are required' });
        return true;
      }

      let replyMarkup: any = undefined;
      const validEpisodes = episodes.filter((ep: any) => ep && ep.label && ep.url && (ep.url.startsWith('http://') || ep.url.startsWith('https://') || ep.url.startsWith('tg://')));

      if (buttonsLayout !== 'none' && validEpisodes.length > 0) {
        let cols = 2;
        if (buttonsLayout === '1-col') cols = 1;
        if (buttonsLayout === '3-col') cols = 3;
        if (buttonsLayout === '4-col') cols = 4;

        const keyboard: Array<Array<{ text: string; url: string }>> = [];
        for (let i = 0; i < validEpisodes.length; i += cols) {
          const row = validEpisodes.slice(i, i + cols).map((ep: any) => ({
            text: ep.label.trim(),
            url: ep.url.trim(),
          }));
          keyboard.push(row);
        }
        replyMarkup = { inline_keyboard: keyboard };
      }

      let sendResult: any;

      // Check if user wants to upload as a Photo Gallery Album (Telegram sendMediaGroup)
      const validGallery = Array.isArray(galleryImages) ? galleryImages.filter((u: string) => u && u.startsWith('http')) : [];
      const shouldSendAlbum = sendGalleryAlbum && (validGallery.length > 0 || (thumbnailUrl && validGallery.length > 0));

      if (shouldSendAlbum) {
        // Build album photos: cover first, then screenshots
        const allAlbumUrls: string[] = [];
        if (thumbnailUrl && thumbnailUrl.startsWith('http')) {
          allAlbumUrls.push(thumbnailUrl);
        }
        for (const gUrl of validGallery) {
          if (!allAlbumUrls.includes(gUrl)) {
            allAlbumUrls.push(gUrl);
          }
        }

        const selectedPhotos = allAlbumUrls.slice(0, Math.min(10, Math.max(2, maxGalleryImages || 5)));

        if (selectedPhotos.length >= 2) {
          const mediaGroupPayload: any = {
            chat_id: chatId.trim(),
            media: selectedPhotos.map((photoUrl, idx) => ({
              type: 'photo',
              media: photoUrl,
              caption: idx === 0 ? (caption || '') : undefined,
              parse_mode: idx === 0 ? parseMode : undefined,
            })),
            disable_notification: Boolean(disableNotification),
            protect_content: Boolean(protectContent),
          };
          if (messageThreadId) {
            mediaGroupPayload.message_thread_id = Number(messageThreadId);
          }

          sendResult = await callTelegramApi(botToken.trim(), 'sendMediaGroup', mediaGroupPayload);

          // If MediaGroup succeeded and we have inline episode buttons, send buttons in follow-up message
          if (sendResult.ok && replyMarkup) {
            const btnPayload: any = {
              chat_id: chatId.trim(),
              text: `🎬 <b>Stream / Download Episodes:</b>`,
              parse_mode: 'HTML',
              reply_markup: replyMarkup,
              disable_notification: Boolean(disableNotification),
              protect_content: Boolean(protectContent),
            };
            if (messageThreadId) btnPayload.message_thread_id = Number(messageThreadId);
            await callTelegramApi(botToken.trim(), 'sendMessage', btnPayload);
          }
        }
      }

      // If not sent as album or album failed, send as single photo cover with buttons
      if (!sendResult || !sendResult.ok) {
        if (thumbnailUrl && thumbnailUrl.trim() && (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://'))) {
          const photoPayload: any = {
            chat_id: chatId.trim(),
            photo: thumbnailUrl.trim(),
            caption: caption || '',
            parse_mode: parseMode,
            disable_notification: Boolean(disableNotification),
            protect_content: Boolean(protectContent),
          };
          if (messageThreadId) {
            photoPayload.message_thread_id = Number(messageThreadId);
          }
          if (replyMarkup) {
            photoPayload.reply_markup = replyMarkup;
          }

          sendResult = await callTelegramApi(botToken.trim(), 'sendPhoto', photoPayload);

          // Fallback: If sendPhoto failed due to URL download restriction, send as text message
          if (!sendResult.ok && sendResult.description && (sendResult.description.includes('wrong file identifier') || sendResult.description.includes('failed to get HTTP URL content') || sendResult.description.includes('PHOTO_INVALID_DIMENSIONS'))) {
            const textPayload: any = {
              chat_id: chatId.trim(),
              text: `${caption}\n\n🖼 <b>Thumbnail:</b> <a href="${thumbnailUrl.trim()}">View Cover Image</a>`,
              parse_mode: parseMode,
              disable_notification: Boolean(disableNotification),
              protect_content: Boolean(protectContent),
            };
            if (messageThreadId) textPayload.message_thread_id = Number(messageThreadId);
            if (replyMarkup) textPayload.reply_markup = replyMarkup;

            sendResult = await callTelegramApi(botToken.trim(), 'sendMessage', textPayload);
          }
        } else {
          const textPayload: any = {
            chat_id: chatId.trim(),
            text: caption || 'Empty Post',
            parse_mode: parseMode,
            disable_notification: Boolean(disableNotification),
            protect_content: Boolean(protectContent),
          };
          if (messageThreadId) textPayload.message_thread_id = Number(messageThreadId);
          if (replyMarkup) textPayload.reply_markup = replyMarkup;

          sendResult = await callTelegramApi(botToken.trim(), 'sendMessage', textPayload);
        }
      }

      if (!sendResult.ok) {
        sendJson(res, 400, {
          ok: false,
          error: sendResult.description || 'Telegram API rejected the request',
          details: sendResult,
        });
        return true;
      }

      const messageId = sendResult.result?.message_id;

      if (pinMessage && messageId) {
        try {
          await callTelegramApi(botToken.trim(), 'pinChatMessage', {
            chat_id: chatId.trim(),
            message_id: messageId,
            disable_notification: Boolean(disableNotification),
          });
        } catch {}
      }

      let postLink: string | undefined;
      const chatUsername = sendResult.result?.chat?.username;
      if (chatUsername && messageId) {
        postLink = `https://t.me/${chatUsername}/${messageId}`;
      } else if (chatId.startsWith('@') && messageId) {
        postLink = `https://t.me/${chatId.replace('@', '')}/${messageId}`;
      }

      sendJson(res, 200, {
        ok: true,
        messageId,
        postLink,
        date: sendResult.result?.date,
        chat: sendResult.result?.chat,
      });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to dispatch Telegram message' });
      return true;
    }
  }

  // 4. AI-Powered Smart Extractor
  if (url.startsWith('/api/ai/parse') && req.method === 'POST') {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        sendJson(res, 400, { ok: false, error: 'GEMINI_API_KEY is not configured in server environment' });
        return true;
      }

      const body = await parseJsonBody(req);
      const { rawHtml, rawText, url: siteUrl } = body;

      if (!rawHtml && !rawText) {
        sendJson(res, 400, { ok: false, error: 'Content is required for AI parsing' });
        return true;
      }

      const ai = new GoogleGenAI();
      const prompt = `You are an expert web scraper for media, anime, dramas, and movie series websites.
Extract the post's core information from this content:
Page URL: ${siteUrl || 'unknown'}

Content snippet:
${(rawHtml || rawText).slice(0, 15000)}

Return ONLY valid JSON matching this schema:
{
  "title": "Clean series / movie / episode post title",
  "thumbnail": "Direct image URL if found, or empty string",
  "description": "Short synopsis or summary (1-2 sentences)",
  "episodes": [
    {
      "label": "Episode 1" or "Ep 01 [720p]",
      "url": "https://full-download-or-stream-url",
      "quality": "720p" or "1080p" (optional)
    }
  ]
}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = aiResponse.text || '{}';
      const parsed = JSON.parse(text);
      sendJson(res, 200, { ok: true, data: parsed });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'AI parsing failed' });
      return true;
    }
  }

  // 5. Storage & Codebase Data Library Endpoints
  // Save single post to /data/hntX/
  if (url.startsWith('/api/storage/save') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const post = body.post || body;
      if (!post || (!post.title && !post.url && !post.websiteUrl)) {
        sendJson(res, 400, { ok: false, error: 'Valid post data is required to save' });
        return true;
      }
      const savedInfo = await savePostToJson(post);
      sendJson(res, 200, { ok: true, data: savedInfo });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to save post to storage' });
      return true;
    }
  }

  // Batch save multiple posts to /data/hntX/
  if (url.startsWith('/api/storage/batch-save') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const posts = body.posts || [];
      if (!Array.isArray(posts) || posts.length === 0) {
        sendJson(res, 400, { ok: false, error: 'Array of posts required' });
        return true;
      }
      const savedList = await batchSavePosts(posts);
      sendJson(res, 200, { ok: true, data: savedList });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to batch save posts' });
      return true;
    }
  }

  // Fetch library manifest (all hnt folders, file counts, and post summaries)
  if (url.startsWith('/api/storage/library') && req.method === 'GET') {
    try {
      const manifest = getDataLibraryManifest();
      sendJson(res, 200, { ok: true, data: manifest });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to fetch library manifest' });
      return true;
    }
  }

  // Fetch Main Index JSON (data/index.json listing all post locations)
  if ((url === '/data/index.json' || url.startsWith('/api/storage/index')) && req.method === 'GET') {
    try {
      const indexData = getMainIndexJson();
      sendJson(res, 200, { ok: true, data: indexData });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to fetch main index' });
      return true;
    }
  }

  // Force Re-Index All Files in Database
  if (url.startsWith('/api/storage/reindex') && req.method === 'POST') {
    try {
      const indexData = generateMainIndexJson();
      sendJson(res, 200, { ok: true, data: indexData });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to re-index database files' });
      return true;
    }
  }

  // Get single post file content
  if (url.startsWith('/api/storage/file') && req.method === 'GET') {
    try {
      const parsedUrl = new URL(url, 'http://localhost');
      const folder = parsedUrl.searchParams.get('folder');
      const filename = parsedUrl.searchParams.get('filename');

      if (!folder || !filename) {
        sendJson(res, 400, { ok: false, error: 'Folder and filename are required' });
        return true;
      }

      const postData = getPostFile(folder, filename);
      if (!postData) {
        sendJson(res, 404, { ok: false, error: 'File not found in storage' });
        return true;
      }

      sendJson(res, 200, { ok: true, data: postData });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to load post file' });
      return true;
    }
  }

  // Delete post file from storage
  if (url.startsWith('/api/storage/file') && req.method === 'DELETE') {
    try {
      const body = await parseJsonBody(req);
      const { folder, filename } = body;
      if (!folder || !filename) {
        sendJson(res, 400, { ok: false, error: 'Folder and filename required' });
        return true;
      }
      const success = deletePostFile(folder, filename);
      sendJson(res, 200, { ok: true, success });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to delete file' });
      return true;
    }
  }

  // Delete folder from storage
  if (url.startsWith('/api/storage/folder') && req.method === 'DELETE') {
    try {
      const body = await parseJsonBody(req);
      const { folder } = body;
      if (!folder) {
        sendJson(res, 400, { ok: false, error: 'Folder name required' });
        return true;
      }
      const success = deleteFolder(folder);
      sendJson(res, 200, { ok: true, success });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to delete folder' });
      return true;
    }
  }

  // Clear all data/hnt* folders
  if (url.startsWith('/api/storage/clear-all') && (req.method === 'POST' || req.method === 'DELETE')) {
    try {
      const result = clearAllLibraryData();
      sendJson(res, 200, { ok: true, data: result });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to clear database' });
      return true;
    }
  }

  // Download entire /data directory as ZIP
  if (url.startsWith('/api/storage/export-zip') && req.method === 'GET') {
    try {
      const zipBuffer = createDataZipBuffer();
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `codebase-data-backup-${dateStr}.zip`;

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', zipBuffer.length);
      res.end(zipBuffer);
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to generate ZIP export' });
      return true;
    }
  }

  // Upload entire /data directory ZIP to Telegram as a document
  if (url.startsWith('/api/telegram/upload-data-zip') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { botToken, chatId, messageThreadId, caption: customCaption, rateLimitDelayMs, autoRetryOn429, maxRetries } = body;

      if (!botToken || !chatId) {
        sendJson(res, 400, { ok: false, error: 'Both botToken and chatId are required' });
        return true;
      }

      const zipBuffer = createDataZipBuffer();
      const manifest = getDataLibraryManifest();
      const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const filename = `data-backup-${new Date().toISOString().split('T')[0]}.zip`;

      const caption = customCaption ||
        `📦 <b>Data Library Backup Archive</b>\n\n📁 <b>Path:</b> <code>/data</code>\n📊 <b>Total Posts:</b> ${manifest.totalPosts}\n📂 <b>Folders:</b> ${manifest.totalFolders} hnt folders\n📅 <b>Exported:</b> <code>${dateStr}</code>`;

      const result = await sendTelegramDocument(
        botToken,
        chatId,
        zipBuffer,
        filename,
        caption,
        messageThreadId,
        {
          rateLimitDelayMs: Number(rateLimitDelayMs) || 1500,
          autoRetryOn429: autoRetryOn429 !== false,
          maxRetries: Number(maxRetries) || 3
        }
      );

      if (!result.ok) {
        sendJson(res, 400, { ok: false, error: result.description || 'Failed to send ZIP to Telegram' });
        return true;
      }

      sendJson(res, 200, { ok: true, data: result.result });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to upload ZIP to Telegram' });
      return true;
    }
  }

  // 6. Auto-Scraper / Crawler Endpoints
  // Start Crawler
  if (url.startsWith('/api/crawler/start') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const status = await crawlerService.start(body);
      sendJson(res, 200, { ok: true, data: status });
      return true;
    } catch (err: any) {
      sendJson(res, 400, { ok: false, error: err.message || 'Failed to start crawler' });
      return true;
    }
  }

  // Stop Crawler
  if (url.startsWith('/api/crawler/stop') && req.method === 'POST') {
    try {
      const status = crawlerService.stop();
      sendJson(res, 200, { ok: true, data: status });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to stop crawler' });
      return true;
    }
  }

  // Pause Crawler
  if (url.startsWith('/api/crawler/pause') && req.method === 'POST') {
    try {
      const status = crawlerService.pause();
      sendJson(res, 200, { ok: true, data: status });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to pause crawler' });
      return true;
    }
  }

  // Resume Crawler
  if (url.startsWith('/api/crawler/resume') && req.method === 'POST') {
    try {
      const status = crawlerService.resume();
      sendJson(res, 200, { ok: true, data: status });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to resume crawler' });
      return true;
    }
  }

  // Get Crawler Status & Logs
  if (url.startsWith('/api/crawler/status') && req.method === 'GET') {
    try {
      const status = crawlerService.getStatus();
      sendJson(res, 200, { ok: true, data: status });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to fetch crawler status' });
      return true;
    }
  }

  // Clear Crawler Logs
  if (url.startsWith('/api/crawler/clear-logs') && req.method === 'POST') {
    try {
      crawlerService.clearLogs();
      sendJson(res, 200, { ok: true });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { ok: false, error: err.message || 'Failed to clear logs' });
      return true;
    }
  }

  // SSE Stream for Live Terminal Console
  if (url.startsWith('/api/crawler/events') && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial status
    const initialStatus = crawlerService.getStatus();
    res.write(`data: ${JSON.stringify({ type: 'init', status: initialStatus })}\n\n`);

    const logListener = (entry: any) => {
      res.write(`data: ${JSON.stringify({ type: 'log', entry })}\n\n`);
    };

    const statusListener = (status: any) => {
      res.write(`data: ${JSON.stringify({ type: 'status', status })}\n\n`);
    };

    crawlerService.on('log', logListener);
    crawlerService.on('status', statusListener);

    // Keep connection alive with heartbeat comment every 15s
    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
      crawlerService.off('log', logListener);
      crawlerService.off('status', statusListener);
    });

    return true;
  }

  return false;
}
