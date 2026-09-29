import type { IncomingMessage, ServerResponse } from 'http';

export async function handleImageProxyRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: string
): Promise<boolean> {
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
  return false;
}
