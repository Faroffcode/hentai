import type { IncomingMessage, ServerResponse } from 'http';
import { parseJsonBody, sendJson } from '../http/requestUtils';
import {
  savePostToJson, batchSavePosts, getDataLibraryManifest, getPostFile, deletePostFile,
  deleteFolder, clearAllLibraryData, createDataZipBuffer, getMainIndexJson, generateMainIndexJson
} from '../storageManager';
import { sendTelegramDocument } from '../telegram/telegramTransport';

export async function handleStorageRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: string
): Promise<boolean> {
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
  return false;
}
