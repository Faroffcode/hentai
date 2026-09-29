import type { IncomingMessage, ServerResponse } from 'http';
import { parseJsonBody, sendJson } from '../http/requestUtils';
import { crawlerService } from '../crawlerService';

export async function handleCrawlerRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: string
): Promise<boolean> {
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
