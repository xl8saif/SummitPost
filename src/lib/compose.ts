import { generateWithGemini } from './gemini';
import { searchMedia } from './images';
import { PLATFORMS } from './platforms/meta';
import { analyzeSeo } from './seo';
import { resolveKeys } from './store';
import { bestNextSlot } from './time';
import type { CommandPlan, DraftPayload, MediaAsset, PlatformId, PostVariant, Settings } from './types';
import { normalizeHashtag, titleCase, uniqueBy } from './utils';
import { buildHashtags, offlineContent, variantFor } from './writer';

function tags(input: string[] | undefined, fallback: string[], cap: number): string[] {
  const clean = (input ?? []).map(normalizeHashtag).filter(Boolean);
  const merged = clean.length ? clean : fallback;
  return uniqueBy(merged, (t) => t).slice(0, cap);
}

export async function composeDraft(
  plan: CommandPlan,
  settings: Settings,
  options: { media?: MediaAsset[]; skipMedia?: boolean } = {},
): Promise<DraftPayload> {
  const keys = resolveKeys(settings);
  let content = null as Awaited<ReturnType<typeof generateWithGemini>>['content'];
  let engineNote = 'Offline copy engine — add a Gemini key in Settings for AI-written posts.';
  let engine: 'gemini' | 'offline' = 'offline';

  if (keys.gemini) {
    const result = await generateWithGemini(plan, settings, keys.gemini);
    content = result.content;
    if (content) {
      engine = 'gemini';
      engineNote = result.note;
    } else {
      engineNote = `Gemini failed (${result.note}). Wrote this with the offline engine instead.`;
    }
  }

  const base = content
    ? {
        title: content.title ?? titleCase(plan.topic),
        caption: content.caption ?? '',
        hashtags: content.hashtags ?? [],
        keywords: content.keywords?.length ? content.keywords : plan.keywords,
        imageQuery: content.imageQuery ?? plan.topic,
        altText: content.altText ?? '',
      }
    : offlineContent(plan, settings);

  const hashtags = tags(base.hashtags, buildHashtags(plan.topic, base.keywords, settings.hashtagCount), 24);
  const variants: Partial<Record<PlatformId, PostVariant>> = {};
  for (const platform of plan.platforms) {
    const provided = content?.variants?.[platform];
    const built = variantFor(platform, base.caption, hashtags, base.title, base.altText);
    variants[platform] = {
      caption: provided?.caption?.trim() || built.caption,
      hashtags: tags(provided?.hashtags, built.hashtags, PLATFORMS[platform].hashtagIdeal[1] + 2),
      title: provided?.title?.trim() || built.title,
      altText: provided?.altText?.trim() || base.altText,
    };
  }

  let media = options.media ?? [];
  let mediaSuggestions: MediaAsset[] = [];
  if (!options.skipMedia) {
    const found = await searchMedia(base.imageQuery, plan.mediaType, keys);
    mediaSuggestions = found.results.slice(0, 12);
    if (media.length === 0) media = mediaSuggestions.slice(0, 1);
  }

  const primary = plan.platforms[0] ?? 'facebook';
  const primaryVariant = variants[primary] ?? variants[Object.keys(variants)[0] as PlatformId];
  const seo = analyzeSeo({
    platform: primary,
    caption: primaryVariant?.caption ?? base.caption,
    hashtags: primaryVariant?.hashtags ?? hashtags,
    keywords: base.keywords,
    media,
    altText: base.altText,
  });

  const hours = [...new Set(plan.platforms.flatMap((p) => PLATFORMS[p].bestHours))].sort((a, b) => a - b);
  const suggestedScheduleAt = plan.scheduleAt ?? bestNextSlot(settings.timezone, hours);

  return {
    command: plan.raw,
    plan,
    title: base.title,
    caption: base.caption,
    hashtags,
    keywords: base.keywords,
    imageQuery: base.imageQuery,
    altText: base.altText,
    variants,
    media,
    mediaSuggestions,
    engine,
    engineNote,
    suggestedScheduleAt,
    seo,
  };
}
