import type { MediaAsset, MediaType } from './types';
import { fetchJson, uid, uniqueBy } from './utils';

interface PexelsPhoto {
  id: number; width: number; height: number; url: string; photographer: string;
  photographer_url: string; alt?: string;
  src: { original: string; large2x: string; large: string; medium: string; tiny: string };
}
interface PexelsVideo {
  id: number; width: number; height: number; image: string; duration: number; url: string;
  user: { name: string; url: string };
  video_files: Array<{ link: string; width: number; height: number; quality: string; file_type: string }>;
}
interface PexelsList<T> { photos?: T[]; videos?: T[]; total_results?: number }
interface UnsplashPhoto {
  id: string; width: number; height: number; alt_description?: string; description?: string;
  urls: { raw: string; full: string; regular: string; small: string };
  user: { name: string; links: { html: string } };
}
interface UnsplashSearch { results?: UnsplashPhoto[]; total?: number }

export interface MediaSearchResult {
  results: MediaAsset[];
  providers: { pexels: boolean; unsplash: boolean };
  note: string;
}

function placeholders(query: string, type: MediaType, count = 6): MediaAsset[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: uid('ph'),
    type,
    url: `/api/placeholder?text=${encodeURIComponent(query || 'Northern Pakistan')}&seed=${i + 1}&type=${type}`,
    thumbUrl: `/api/placeholder?text=${encodeURIComponent(query || 'Northern Pakistan')}&seed=${i + 1}&type=${type}`,
    source: 'placeholder' as const,
    alt: `${query || 'Northern Pakistan'} illustrative ${type}`,
    credit: 'SummitPost placeholder',
    addedAt: new Date().toISOString(),
  }));
}

async function searchPexels(query: string, type: MediaType, key: string, page: number): Promise<MediaAsset[]> {
  const endpoint = type === 'video'
    ? `https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(query)}&per_page=12&page=${page}&orientation=landscape`
    : `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12&page=${page}&orientation=landscape`;
  const res = await fetchJson<PexelsList<PexelsPhoto & PexelsVideo>>(endpoint, { headers: { Authorization: key } }, 20000);
  if (!res.ok || !res.data) return [];
  const now = new Date().toISOString();
  if (type === 'video') {
    return (res.data.videos ?? []).map((v) => {
      const file = [...v.video_files].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
      return {
        id: `pexels_${v.id}`, type: 'video' as const, url: file?.link ?? '', thumbUrl: v.image,
        width: v.width, height: v.height, duration: v.duration, source: 'pexels' as const,
        credit: v.user?.name, creditUrl: v.user?.url, addedAt: now,
        alt: `Stock video by ${v.user?.name ?? 'Pexels'}`,
      };
    }).filter((m) => Boolean(m.url));
  }
  return (res.data.photos ?? []).map((p) => ({
    id: `pexels_${p.id}`, type: 'image' as const, url: p.src.large2x, thumbUrl: p.src.medium,
    width: p.width, height: p.height, source: 'pexels' as const, credit: p.photographer,
    creditUrl: p.photographer_url, alt: p.alt || query, addedAt: now,
  }));
}

async function searchUnsplash(query: string, key: string, page: number): Promise<MediaAsset[]> {
  const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&page=${page}&orientation=landscape&content_filter=high`;
  const res = await fetchJson<UnsplashSearch>(endpoint, {
    headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' },
  }, 20000);
  if (!res.ok || !res.data) return [];
  const now = new Date().toISOString();
  return (res.data.results ?? []).map((p) => ({
    id: `unsplash_${p.id}`, type: 'image' as const, url: p.urls.regular, thumbUrl: p.urls.small,
    width: p.width, height: p.height, source: 'unsplash' as const, credit: p.user?.name,
    creditUrl: `${p.user?.links?.html}?utm_source=summitpost&utm_medium=referral`,
    alt: p.alt_description || p.description || query, addedAt: now,
  }));
}

export async function searchMedia(
  query: string,
  type: MediaType,
  keys: { pexels: string; unsplash: string },
  page = 1,
): Promise<MediaSearchResult> {
  const clean = query.trim() || 'northern pakistan mountains';
  const jobs: Array<Promise<MediaAsset[]>> = [];
  const providers = { pexels: Boolean(keys.pexels), unsplash: Boolean(keys.unsplash) && type === 'image' };
  if (keys.pexels) jobs.push(searchPexels(clean, type, keys.pexels, page).catch(() => []));
  if (providers.unsplash) jobs.push(searchUnsplash(clean, keys.unsplash, page).catch(() => []));

  const settled = jobs.length ? (await Promise.all(jobs)).flat() : [];
  const results = uniqueBy(settled, (m) => m.url).slice(0, 18);

  if (results.length > 0) {
    return {
      results,
      providers,
      note: `Live results from ${[providers.pexels ? 'Pexels' : '', providers.unsplash ? 'Unsplash' : ''].filter(Boolean).join(' + ')}.`,
    };
  }

  return {
    results: placeholders(clean, type),
    providers,
    note: keys.pexels || keys.unsplash
      ? 'Providers returned nothing for that phrase — try a broader search.'
      : 'Add a Pexels or Unsplash key in Settings for real stock photos. Showing generated placeholders.',
  };
}
