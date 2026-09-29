import type { IncomingMessage, ServerResponse } from 'http';
import { handleImageProxyRoute } from './routes/imageProxy';
import { handleScrapeRoute } from './routes/scrape';
import { handleTelegramVerifyRoute } from './routes/telegramVerify';
import { handleTelegramSendRoute } from './routes/telegramSend';
import { handleAiParseRoute } from './routes/aiParse';
import { handleStorageRoute } from './routes/storage';
import { handleCrawlerRoute } from './routes/crawler';

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

  const routes = [
    handleImageProxyRoute,
    handleScrapeRoute,
    handleTelegramVerifyRoute,
    handleTelegramSendRoute,
    handleAiParseRoute,
    handleStorageRoute,
    handleCrawlerRoute,
  ];

  for (const route of routes) {
    if (await route(req, res, url)) return true;
  }

  return false;
}
