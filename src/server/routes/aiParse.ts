import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';
import { parseJsonBody, sendJson } from '../http/requestUtils';

export async function handleAiParseRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: string
): Promise<boolean> {
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
  return false;
}
