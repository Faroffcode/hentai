export interface ScrapeResult {
  title: string;
  thumbnail: string;
  description: string;
  synopsis?: string;
  galleryImages?: string[];
  siteName: string;
  url: string;
  episodes: Array<{
    label: string;
    url: string;
    quality?: string;
    number?: number;
  }>;
  isCatalog?: boolean;
  catalogCount?: number;
  catalogPosts?: Array<{
    id: string;
    title: string;
    thumbnail: string;
    url: string;
    year?: string;
    badge?: string;
    synopsis?: string;
    galleryImages?: string[];
  }>;
}

// Helper to read JSON body from request

export function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).href;
  } catch {
    return relativeOrAbsolute;
  }
}

export function cleanTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\s*[-–—|]\s*(?:Watch\s+Hentai|Watch\s+Online|Stream\s+Online|Free\s+Hentai|English\s+Subbed).*$/i, '')
    .replace(/\s*[-–—|]\s*(?:Watch\s+Free|HD\s+Free|Watch\s+Full).*$/i, '')
    .trim();
}

// Extract posts from catalog / series listing / archive pages

export function extractCatalogPosts(html: string, pageUrl: string): Array<{
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  year?: string;
  badge?: string;
}> {
  // Strip out related widgets / footer suggestions so single posts with related sections are not mistaken for catalogs
  const cleanHtml = html
    .replace(/<div\s+id=["']dt-related["'][\s\S]*?<\/div>\s*<\/div>/gi, '')
    .replace(/<section\s+class=["'][^"']*tv-single-related[^"']*["'][\s\S]*?<\/section>/gi, '');

  const posts: Array<{
    id: string;
    title: string;
    thumbnail: string;
    url: string;
    year?: string;
    badge?: string;
  }> = [];
  const seenUrls = new Set<string>();

  // 1. Scan for <article ...> ... </article>
  const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi;
  let articleMatch;

  while ((articleMatch = articleRegex.exec(cleanHtml)) !== null) {
    const artHtml = articleMatch[1];

    // Find main link
    const linkMatch = artHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*>/i);
    if (!linkMatch) continue;

    const rawUrl = linkMatch[1];
    if (!rawUrl || rawUrl.startsWith('#') || rawUrl.startsWith('javascript:')) continue;
    const fullUrl = resolveUrl(rawUrl, pageUrl);

    if (seenUrls.has(fullUrl)) continue;

    // Find Title: check serie+h3, alt, h3, h2
    let title = '';
    const serieMatch = artHtml.match(/class=["'][^"']*serie[^"']*["'][^>]*>([^<]+)<\/span>/i);
    const h3Match = artHtml.match(/<h[2-4][^>]*>(?:<strong>)?(?:<a[^>]*>)?([\s\S]*?)(?:<\/a>)?(?:<\/strong>)?<\/h[2-4]>/i);
    const altMatch = artHtml.match(/alt=["']([^"']+)["']/i) || artHtml.match(/title=["']([^"']+)["']/i);

    if (serieMatch && h3Match) {
      title = `${cleanTitle(decodeHtmlEntities(stripHtml(serieMatch[1]).trim()))} - ${cleanTitle(decodeHtmlEntities(stripHtml(h3Match[1]).trim()))}`;
    } else if (altMatch && altMatch[1]) {
      title = cleanTitle(decodeHtmlEntities(altMatch[1].trim()));
    } else if (h3Match) {
      title = cleanTitle(decodeHtmlEntities(stripHtml(h3Match[1]).trim()));
    }

    if (!title || title.length < 2 || title.toLowerCase() === 'sponsor' || title.toLowerCase() === 'close') continue;

    // Find Thumbnail Image: check data-src, data-lazy-src, data-original, or src
    let thumbnail = '';
    const dataSrcMatch = artHtml.match(/data-src=["']([^"']+)["']/i) ||
                         artHtml.match(/data-lazy-src=["']([^"']+)["']/i) ||
                         artHtml.match(/data-original=["']([^"']+)["']/i);
    if (dataSrcMatch && !dataSrcMatch[1].startsWith('data:image')) {
      thumbnail = resolveUrl(dataSrcMatch[1], pageUrl);
    } else {
      const srcMatch = artHtml.match(/src=["']([^"']+)["']/i);
      if (srcMatch && !srcMatch[1].startsWith('data:image') && !srcMatch[1].endsWith('.svg')) {
        thumbnail = resolveUrl(srcMatch[1], pageUrl);
      }
    }

    // Find year & badge
    const yearMatch = artHtml.match(/class=["'][^"']*buttonyear[^"']*["'][^>]*>(?:<span[^>]*>)?([^<]+)/i) ||
                      artHtml.match(/\b(19\d\d|20\d\d)\b/);
    const badgeMatch = artHtml.match(/class=["'][^"']*buttoncensured[^"']*["'][^>]*>(?:<span[^>]*>)?([^<]+)/i) ||
                       artHtml.match(/\b(CEN|UNCEN|SUB|DUB|HD|FHD)\b/i);

    seenUrls.add(fullUrl);
    posts.push({
      id: `post-${posts.length + 1}`,
      title,
      thumbnail,
      url: fullUrl,
      year: yearMatch ? yearMatch[1].trim() : undefined,
      badge: badgeMatch ? badgeMatch[1].trim() : undefined,
    });
  }

  // 2. Fallback to <div class="item ..."> or cards if no articles
  if (posts.length === 0) {
    const itemRegex = /<div[^>]*class=["'][^"']*(?:item|card|poster|video-item|film|post-item)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(cleanHtml)) !== null && posts.length < 60) {
      const itHtml = itemMatch[1];
      const lMatch = itHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*>/i);
      if (!lMatch) continue;
      const fUrl = resolveUrl(lMatch[1], pageUrl);
      if (seenUrls.has(fUrl)) continue;

      const tMatch = itHtml.match(/alt=["']([^"']+)["']/i) || itHtml.match(/title=["']([^"']+)["']/i);
      const title = tMatch ? cleanTitle(decodeHtmlEntities(tMatch[1].trim())) : '';
      if (!title || title.length < 3) continue;

      const imgM = itHtml.match(/data-src=["']([^"']+)["']/i) || itHtml.match(/src=["']([^"']+)["']/i);
      const thumb = imgM && !imgM[1].startsWith('data:image') ? resolveUrl(imgM[1], pageUrl) : '';

      seenUrls.add(fUrl);
      posts.push({
        id: `post-${posts.length + 1}`,
        title,
        thumbnail: thumb,
        url: fUrl,
      });
    }
  }

  return posts.slice(0, 100);
}

// Extract clean metadata and episodes from HTML

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

// Rate Limit Manager for Telegram API
let lastTelegramCallTimestamp = 0;
