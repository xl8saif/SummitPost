import { PLATFORMS } from './platforms/meta';
import type { MediaAsset, PlatformId, SeoCheck, SeoReport } from './types';
import { clamp, normalizeHashtag, sentenceCount, wordCount } from './utils';

export interface SeoInput {
  platform: PlatformId;
  caption: string;
  hashtags: string[];
  keywords: string[];
  media: MediaAsset[];
  altText?: string;
  title?: string;
}

const CTA_PATTERN = /\b(save|share|follow|comment|book|dm|message|visit|click|link in bio|tag|subscribe|order|plan|explore|discover|join|call|whatsapp|reserve)\b|(\?)/i;
const HOOK_OPENERS = /^(stop|you|we|imagine|what if|this|here|it|why|how|nobody|everyone|3|5|7|10|northern|winter|snow|karakoram|hunza|skardu)/i;
const EMOJI = /\p{Extended_Pictographic}/gu;

function grade(score: number): SeoReport['grade'] {
  if (score >= 88) return 'excellent';
  if (score >= 72) return 'good';
  if (score >= 55) return 'fair';
  return 'weak';
}

export function analyzeSeo(input: SeoInput): SeoReport {
  const meta = PLATFORMS[input.platform];
  const caption = (input.caption ?? '').trim();
  const hashtags = input.hashtags.map(normalizeHashtag).filter(Boolean);
  const keywords = input.keywords.map((k) => k.toLowerCase());
  const words = wordCount(caption);
  const sentences = sentenceCount(caption);
  const characters = caption.length + (hashtags.length ? 1 + hashtags.map((h) => h.length + 1).join(' ').length : 0);
  const emojis = (caption.match(EMOJI) ?? []).length;
  const checks: SeoCheck[] = [];
  const push = (id: string, label: string, weight: number, factor: number, detail: string) => {
    const status = factor >= 0.99 ? 'pass' : factor >= 0.5 ? 'warn' : 'fail';
    checks.push({ id, label, weight, points: Math.round(weight * factor), status, detail });
  };

  const hook = caption.slice(0, 125).toLowerCase();
  const hookHits = keywords.filter((k) => hook.includes(k)).length;
  const opener = HOOK_OPENERS.test(caption) || /^[^.!?]{0,40}[—:!]/.test(caption);
  push('hook', 'Hook carries the topic', 14, hookHits > 0 && opener ? 1 : hookHits > 0 || opener ? 0.6 : 0.2,
    hookHits > 0 ? 'Primary keyword lands in the first line.' : 'Work the main keyword into the opening line.');

  const coverage = keywords.length ? keywords.filter((k) => caption.toLowerCase().includes(k)).length / keywords.length : 0;
  push('keywords', 'Keyword coverage', 12, coverage >= 0.6 ? 1 : coverage >= 0.35 ? 0.6 : 0.25,
    `${Math.round(coverage * 100)}% of target keywords appear in the caption.`);

  const minLength = Math.min(meta.limit, input.platform === 'x' ? 60 : 120);
  const lengthOk = characters <= meta.limit && characters >= minLength;
  push('length', `Fits ${meta.name} (${meta.limit.toLocaleString()} chars)`, 14,
    characters > meta.limit ? 0 : characters >= minLength ? 1 : 0.5,
    `${characters.toLocaleString()} characters used${characters > meta.limit ? ' — over the limit' : ''}.`);

  const [minTags, maxTags] = meta.hashtagIdeal;
  const tagCount = hashtags.length;
  push('hashtags', `Hashtag count ${minTags}–${maxTags}`, 12,
    tagCount >= minTags && tagCount <= maxTags ? 1 : tagCount === 0 ? 0 : 0.55,
    `${tagCount} hashtags attached.`);

  const relevant = hashtags.filter((tag) => keywords.some((k) => tag.toLowerCase().includes(k) || k.includes(tag.toLowerCase()))).length;
  const relevance = tagCount ? relevant / tagCount : 0;
  push('relevance', 'Hashtags match the topic', 10, relevance >= 0.4 ? 1 : relevance >= 0.2 ? 0.6 : 0.25,
    `${relevant}/${tagCount} hashtags are topic-specific.`);

  push('cta', 'Clear call to action', 10, CTA_PATTERN.test(caption) ? 1 : 0,
    CTA_PATTERN.test(caption) ? 'The post asks the reader to do something.' : 'Add a CTA such as "Save this for your trip".');

  const avgSentence = sentences ? words / sentences : words;
  push('readability', 'Readable rhythm', 8, avgSentence >= 6 && avgSentence <= 24 ? 1 : avgSentence <= 32 ? 0.6 : 0.25,
    `${Math.round(avgSentence)} words per sentence on average.`);

  const mediaOk = input.media.length > 0 && input.media.every((m) => meta.media.includes(m.type));
  push('media', 'Media present and supported', 10, mediaOk ? 1 : input.media.length === 0 ? 0 : 0.4,
    mediaOk ? `${input.media.length} ${meta.media.length > 1 ? 'asset(s)' : 'asset'} ready to attach.` : 'Attach media this network accepts.');

  const altLength = (input.altText ?? input.media[0]?.alt ?? '').trim().length;
  push('alt', 'Descriptive alt text', 5, altLength >= 12 ? 1 : altLength > 0 ? 0.6 : 0,
    altLength >= 12 ? 'Alt text describes the visual for accessibility.' : 'Write 12+ characters of alt text.');

  const emojiOk = emojis === 0 ? (input.platform === 'instagram' || input.platform === 'tiktok' ? 0.6 : 0.85) : emojis <= 6 ? 1 : 0.5;
  push('emoji', 'Emoji balance', 5, emojiOk,
    emojis === 0 ? 'No emojis — add one for warmth on visual networks.' : `${emojis} emoji used.`);

  const score = clamp(checks.reduce((sum, c) => sum + c.points, 0), 0, 100);
  return {
    score,
    grade: grade(score),
    checks,
    keywords: input.keywords,
    platform: input.platform,
    characters,
    limit: meta.limit,
    hashtagCount: tagCount,
  };
}
