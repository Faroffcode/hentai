import type { PostData, EpisodeItem } from '../types';

export async function scrapeWebsite(url: string): Promise<PostData> {
  const res = await fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || `HTTP error ${res.status}`);
  const data = json.data;
  const episodes: EpisodeItem[] = (data.episodes || []).map((ep: any, index: number) => ({
    id: `ep-${Date.now()}-${index}`,
    label: ep.label || `Episode ${index + 1}`,
    url: ep.url,
    quality: ep.quality,
    number: ep.number ?? index + 1,
  }));
  return {
    websiteUrl: data.url || url,
    title: data.title || 'Untitled Post',
    thumbnail: data.thumbnail || '',
    description: data.description || '',
    synopsis: data.synopsis || data.description || '',
    galleryImages: Array.isArray(data.galleryImages) ? data.galleryImages : [],
    siteName: data.siteName || '',
    episodes,
    isCatalog: Boolean(data.isCatalog),
    catalogPosts: Array.isArray(data.catalogPosts)
      ? data.catalogPosts.map((cp: any) => ({
          ...cp,
          galleryImages: cp.galleryImages || (cp.thumbnail ? [cp.thumbnail] : []),
          synopsis: cp.synopsis || cp.description || '',
        }))
      : [],
  };
}
