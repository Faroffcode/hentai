export async function fetchPageHtml(targetUrl: string, timeoutMs = 12000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const fetchResp = await fetch(targetUrl, {
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TelePost/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  clearTimeout(timeout);

  if (!fetchResp.ok) {
    throw new Error(`HTTP ${fetchResp.status}: ${fetchResp.statusText}`);
  }

  return await fetchResp.text();
}

// Main API Handler router
