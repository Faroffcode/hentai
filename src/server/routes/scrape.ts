import type { IncomingMessage, ServerResponse } from 'http';
import { parseJsonBody, sendJson } from '../http/requestUtils';
import { fetchPageHtml } from '../scraper/pageFetcher';
import { extractFromHtml } from '../scraper/postExtractor';
import { savePostToJson } from '../storageManager';

export async function handleScrapeRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: string
): Promise<boolean> {
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
  return false;
}
