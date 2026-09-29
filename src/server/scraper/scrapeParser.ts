interface ScrapeResult {
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

export function extractFromHtml(html: string, pageUrl: string): ScrapeResult {
  const result: ScrapeResult = {
    title: '',
    thumbnail: '',
    description: '',
    siteName: '',
    url: pageUrl,
    episodes: [],
  };

  try {
    const parsedBase = new URL(pageUrl);
    result.siteName = parsedBase.hostname.replace(/^www\./, '');
  } catch {
    result.siteName = '';
  }

  // 1. Detect if this is a Single Series/Post page OR a Multi-Post Catalog/Archive
  const isSinglePage = html.includes('single-tvshows') ||
                       html.includes('id="single"') ||
                       html.includes("id='single'") ||
                       html.includes('class="sbox" id="episodes"') ||
                       html.includes("class='sbox' id='episodes'");

  // If this is a Catalog, Archive, or Category page with multiple posts:
  if (!isSinglePage) {
    const catalogPosts = extractCatalogPosts(html, pageUrl);
    if (catalogPosts.length > 1) {
      result.isCatalog = true;
      result.catalogCount = catalogPosts.length;
      result.catalogPosts = catalogPosts;
      result.title = `${catalogPosts.length} Posts from ${result.siteName}`;
      result.thumbnail = catalogPosts[0]?.thumbnail || '';
      result.description = `Multi-post archive with ${catalogPosts.length} posts`;
      result.episodes = [];
      return result;
    }
  }

  // 2. Title Extraction
  const ogTitleMatch = html.match(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  const twitterTitleMatch = html.match(/<meta\s+[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
  const htmlTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

  if (ogTitleMatch && ogTitleMatch[1]) {
    result.title = cleanTitle(decodeHtmlEntities(ogTitleMatch[1].trim()));
  } else if (twitterTitleMatch && twitterTitleMatch[1]) {
    result.title = cleanTitle(decodeHtmlEntities(twitterTitleMatch[1].trim()));
  } else if (h1Match && h1Match[1]) {
    result.title = cleanTitle(decodeHtmlEntities(stripHtml(h1Match[1]).trim()));
  } else if (htmlTitleMatch && htmlTitleMatch[1]) {
    result.title = cleanTitle(decodeHtmlEntities(htmlTitleMatch[1].trim()));
  }

  // 3. Image & Gallery Extraction (og:image, twitter, backdrops, screenshots)
  const galleryImages: string[] = [];
  const seenGalleryUrls = new Set<string>();

  function cleanImageUrl(raw: string): string {
    if (!raw) return '';
    return decodeHtmlEntities(raw).replace(/[\r\n\t\s]/g, '').trim();
  }

  function addGalleryImage(candidateUrl: string | undefined | null) {
    if (!candidateUrl) return;
    const cleaned = cleanImageUrl(candidateUrl);
    if (!cleaned || !cleaned.startsWith('http')) return;
    
    // Ignore icons, avatars, social share badges
    if (
      cleaned.includes('avatar') ||
      cleaned.includes('logo') ||
      cleaned.includes('.svg') ||
      cleaned.includes('sidebar.php') ||
      cleaned.includes('fb.') ||
      cleaned.includes('x.') ||
      cleaned.includes('pin.svg') ||
      cleaned.includes('whatsapp') ||
      cleaned.includes('telegram.svg')
    ) {
      return;
    }

    // Normalize thumbnail suffixes (_thumb.jpg, -150x150.jpg) to full resolution
    const highResUrl = cleaned
      .replace(/_thumb(\.(?:jpe?g|png|webp|avif))/i, '$1')
      .replace(/-\d+x\d+(\.(?:jpe?g|png|webp|avif))/i, '$1');

    const resolved = resolveUrl(highResUrl, pageUrl);
    if (!seenGalleryUrls.has(resolved)) {
      seenGalleryUrls.add(resolved);
      galleryImages.push(resolved);
    }
  }

  // 3a. Scan ALL og:image & twitter:image meta tags in the document (watchhentai lists all backdrops as og:image)
  const allOgMatches = [
    ...html.matchAll(/<meta\s+[^>]*(?:property|name)=["'](?:og:image|twitter:image|image)["'][^>]*content=["']([^"']+)["']/gi),
    ...html.matchAll(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image|image)["']/gi),
    ...html.matchAll(/<meta\s+[^>]*itemprop=["']image["'][^>]*content=["']([^"']+)["']/gi),
  ];

  for (const m of allOgMatches) {
    if (m[1]) {
      addGalleryImage(m[1]);
    }
  }

  // 3b. Determine primary series upload folder prefix if available (e.g. /uploads/2023/7/mahou-shoujo-noble-rose-the-animation/)
  let primaryUploadFolder = '';
  for (const g of galleryImages) {
    const folderMatch = g.match(/(https?:\/\/[^\/]+\/uploads\/(?:\d+\/(?:\d+\/)?)?[^\/]+\/)/i);
    if (folderMatch) {
      primaryUploadFolder = folderMatch[1];
      break;
    }
  }

  // 3c. Scan main content area before sidebars / footers for backdrop / gallery items
  const mainContent = html.split(/id=["']sidebar["']|class=["'][^"']*sidebar|<footer/i)[0] || html;

  // Scan .g-item, .gallery-item, or .galeria
  const gItemRegex = /<(?:div|li|figure|a)[^>]*class=["'][^"']*(?:g-item|gallery-item|screenshot-item|galeria-item)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|li|figure|a)>/gi;
  let gMatch;
  while ((gMatch = gItemRegex.exec(mainContent)) !== null) {
    const itemHtml = gMatch[1];
    const linkM = itemHtml.match(/<a[^>]*href=["']([^"']+\.(?:jpe?g|png|webp|avif)(?:\?[^"']*)?)["']/i);
    const imgM = itemHtml.match(/data-src=["']([^"']+)["']/i) || itemHtml.match(/src=["']([^"']+)["']/i);
    const candidate = linkM ? linkM[1] : (imgM ? imgM[1] : null);
    if (candidate) addGalleryImage(candidate);
  }

  // Scan all image and anchor links in main content
  const allImgLinks = [...mainContent.matchAll(/(?:href|src|data-src|data-lazy-src|data-original)=["'](https?:\/\/[^"'\s>]+\.(?:jpe?g|png|webp|avif)(?:\?[^"'\s>]*)?)["']/gi)];
  for (const m of allImgLinks) {
    const raw = m[1];
    if (primaryUploadFolder && raw.startsWith(primaryUploadFolder)) {
      addGalleryImage(raw);
    } else if (raw.includes('backdrop') || raw.includes('screenshot') || raw.includes('/uploads/')) {
      addGalleryImage(raw);
    }
  }

  // Also check data-backdrops attribute if present
  const backdropsMatch = html.match(/data-backdrops=["'](\[[^"']+\])["']/i);
  if (backdropsMatch) {
    try {
      const parsed = JSON.parse(decodeHtmlEntities(backdropsMatch[1]));
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string') addGalleryImage(item);
        }
      }
    } catch {}
  }

  // Select best cover thumbnail: prefer poster.jpg if found, otherwise first backdrop
  let finalGallery = galleryImages;
  if (primaryUploadFolder) {
    const postSpecific = galleryImages.filter(u => u.startsWith(primaryUploadFolder) || u.includes('backdrop') || u.includes('screenshot'));
    if (postSpecific.length > 0) {
      finalGallery = postSpecific;
    }
  }

  const posterCandidate = finalGallery.find(u => u.toLowerCase().includes('poster.jpg') || u.toLowerCase().includes('cover.jpg'));
  result.thumbnail = posterCandidate || finalGallery[0] || '';
  result.galleryImages = finalGallery.slice(0, 30);

  // 4. Rich Synopsis & Description extraction
  let extractedSynopsis = '';

  // Priority 1: DooPlay / ToroPlay single synopsis body
  const dooplaySynMatch = html.match(/<div[^>]*class=["'][^"']*(?:tv-single-synopsis__body|tv-single-synopsis)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (dooplaySynMatch && dooplaySynMatch[1]) {
    extractedSynopsis = stripHtml(dooplaySynMatch[1]);
  }

  // Priority 2: Generic synopsis / description / entry-content containers
  if (!extractedSynopsis || extractedSynopsis.length < 15) {
    const genericSynMatch = html.match(/<(?:div|section|article)[^>]*(?:id|class)=["'][^"']*(?:synopsis|entry-synopsis|post-content|anime-description|storyline|movie-description)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|article)>/i);
    if (genericSynMatch && genericSynMatch[1]) {
      extractedSynopsis = stripHtml(genericSynMatch[1]);
    }
  }

  // Priority 3: Heading "Synopsis" or "Storyline" followed by text
  if (!extractedSynopsis || extractedSynopsis.length < 15) {
    const headingSynMatch = html.match(/<h[2-5][^>]*>(?:Synopsis|Storyline|About|Plot|Story)<\/h[2-5]>([\s\S]*?)(?:<h[2-5]|<div class=["']sbox|<footer|$)/i);
    if (headingSynMatch && headingSynMatch[1]) {
      extractedSynopsis = stripHtml(headingSynMatch[1]);
    }
  }

  // Priority 4: Fallback to Meta og:description or description
  const ogDescMatch = html.match(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const metaDesc = (ogDescMatch && ogDescMatch[1]) ? decodeHtmlEntities(ogDescMatch[1].trim()) : '';

  // Clean and format synopsis
  if (extractedSynopsis) {
    extractedSynopsis = decodeHtmlEntities(extractedSynopsis)
      .replace(/^Synopsis\s*[:\-\.]?\s*/i, '')
      .replace(/^Storyline\s*[:\-\.]?\s*/i, '')
      .replace(/^Plot\s*[:\-\.]?\s*/i, '')
      .trim();
  }

  if (extractedSynopsis && extractedSynopsis.length > 20) {
    result.synopsis = extractedSynopsis;
    result.description = extractedSynopsis;
  } else if (metaDesc) {
    result.description = metaDesc;
    result.synopsis = metaDesc;
  }

  // 6. Episode Links Extraction
  // Pattern A: DooPlay / ToroPlay themes (.tv-ep-card-link, .episodios)
  const dooplayRegex = /<a[^>]*class=["'][^"']*(?:tv-ep-card-link|episodios)[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const rawEpisodes: Array<{ label: string; url: string; quality?: string; number?: number }> = [];
  const seenUrls = new Set<string>();

  let dpMatch;
  while ((dpMatch = dooplayRegex.exec(html)) !== null) {
    const epHref = dpMatch[1]?.trim();
    const epContent = dpMatch[2] || '';
    if (!epHref || epHref.startsWith('#')) continue;

    const fullHref = resolveUrl(epHref, pageUrl);
    if (seenUrls.has(fullHref)) continue;

    const epTitleMatch = epContent.match(/class=["'][^"']*(?:eptitle|episodiotitle)[^"']*["'][^>]*>([^<]+)<\/span>/i) ||
                         epContent.match(/alt=["']([^"']+)["']/i) ||
                         dpMatch[0].match(/title=["']([^"']+)["']/i);
    let label = epTitleMatch ? decodeHtmlEntities(stripHtml(epTitleMatch[1]).trim()) : '';

    const numMatch = label.match(/\b(?:ep|episode|eps|e)[\s._-]*([0-9]{1,4})\b/i) || fullHref.match(/episode-?([0-9]{1,4})/i);
    const epNumber = numMatch ? parseInt(numMatch[1], 10) : undefined;
    if (!label) {
      label = epNumber ? `Episode ${epNumber}` : `Episode ${rawEpisodes.length + 1}`;
    }

    seenUrls.add(fullHref);
    rawEpisodes.push({
      label,
      url: fullHref,
      number: epNumber,
    });
  }

  // Pattern B: General Link Scan for Episode patterns
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1]?.trim();
    const rawText = stripHtml(match[2] || '').trim();

    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) {
      continue;
    }

    const fullHref = resolveUrl(rawHref, pageUrl);
    if (seenUrls.has(fullHref)) {
      continue;
    }

    const combinedStr = `${rawText} ${rawHref}`;

    const epPattern = /\b(ep|episode|eps|e)[\s._-]*([0-9]{1,4})\b/i;
    const downloadPattern = /\b(download|watch|stream|server\s*\d+|fast|mega|gdrive|drive|torrent|mirror)\b/i;
    const qualityPattern = /\b(360p|480p|720p|1080p|2160p|4k|fhd|hd)\b/i;

    const epMatch = combinedStr.match(epPattern);
    const hasEp = Boolean(epMatch);
    const hasDownload = downloadPattern.test(combinedStr);
    const qualityMatch = combinedStr.match(qualityPattern);

    if (hasEp || (hasDownload && /\b\d+\b/.test(rawText))) {
      let label = rawText || 'Episode Link';
      let epNumber: number | undefined;

      if (epMatch) {
        epNumber = parseInt(epMatch[2], 10);
        if (!rawText || rawText.length < 3 || rawText.length > 50) {
          label = `Episode ${epNumber}`;
        }
      }

      if (label.length > 40) {
        if (epNumber !== undefined) {
          label = `Episode ${epNumber}`;
        } else {
          label = label.slice(0, 37) + '...';
        }
      }

      if (qualityMatch && !label.toLowerCase().includes(qualityMatch[1].toLowerCase())) {
        label = `${label} [${qualityMatch[1].toUpperCase()}]`;
      }

      seenUrls.add(fullHref);
      rawEpisodes.push({
        label,
        url: fullHref,
        quality: qualityMatch ? qualityMatch[1].toUpperCase() : undefined,
        number: epNumber,
      });
    }
  }

  // Sort episodes by episode number if available
  if (rawEpisodes.some(e => e.number !== undefined)) {
    rawEpisodes.sort((a, b) => {
      if (a.number !== undefined && b.number !== undefined) {
        return a.number - b.number;
      }
      return 0;
    });
  }

  result.episodes = rawEpisodes.slice(0, 100);
  return result;
}

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
