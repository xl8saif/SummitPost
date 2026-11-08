import { PLATFORMS, PLATFORM_IDS } from './platforms/meta';
import type { CommandPlan, Language, MediaType, PlatformId, Settings } from './types';
import { bestNextSlot, DEFAULT_TZ, parseSchedule } from './time';
import { extractKeywords } from './utils';

const ALIASES: Record<PlatformId, string[]> = {
  facebook: ['facebook', 'fb', 'facebook page'],
  instagram: ['instagram', 'insta', 'ig', 'reels'],
  linkedin: ['linkedin', 'linked in'],
  x: ['twitter', 'tweet', 'x.com'],
  tiktok: ['tiktok', 'tik tok', 'tiktok video'],
  youtube: ['youtube', 'youtube shorts', 'yt'],
  pinterest: ['pinterest', 'pinterest pin'],
};

const ALL_WORDS = /\b(all platforms|every platform|everywhere|all socials|all networks|all channels|social media)\b/i;

const WORD_CHAR = /[a-z0-9]/;

/** Whole-word-ish match: the alias must not be glued to other letters or digits. */
function mentions(text: string, phrase: string): boolean {
  let from = 0;
  while (from <= text.length - phrase.length) {
    const at = text.indexOf(phrase, from);
    if (at < 0) return false;
    const before = at === 0 ? ' ' : text[at - 1];
    const after = at + phrase.length >= text.length ? ' ' : text[at + phrase.length];
    if (!WORD_CHAR.test(before) && !WORD_CHAR.test(after)) return true;
    from = at + 1;
  }
  return false;
}

function detectPlatforms(text: string): { platforms: PlatformId[]; explicit: boolean } {
  const lower = text.toLowerCase();
  if (ALL_WORDS.test(lower)) return { platforms: [...PLATFORM_IDS], explicit: true };
  const found: PlatformId[] = [];
  for (const id of PLATFORM_IDS) {
    for (const alias of ALIASES[id]) {
      if (mentions(lower, alias)) {
        if (!found.includes(id)) found.push(id);
        break;
      }
    }
  }
  if (/\bon x\b/.test(lower) && !found.includes('x')) found.push('x');
  return { platforms: found, explicit: found.length > 0 };
}

function stripSchedule(text: string): string {
  return text
    .replace(/\bin\s+\d{1,2}\s*(minutes?|hours?|days?)\b/gi, ' ')
    .replace(/\b(today|tomorrow|tonight)\b/gi, ' ')
    .replace(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, ' ')
    .replace(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, ' ')
    .replace(/\b(at|by|around)\s+\d{1,2}(:\d{2})?\s*(am|pm|a\.m\.|p\.m\.|baje|bajay)?\b/gi, ' ')
    .replace(/\b\d{1,2}(:\d{2})?\s*(am|pm|baje|bajay)\b/gi, ' ')
    .replace(/\b(morning|afternoon|evening|night|subah|dopahar|shaam|sham|raat)\b/gi, ' ')
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, ' ')
    .replace(/\b(schedule|scheduled|reschedule|queue|later|next time)\b/gi, ' ');
}

function stripIntents(text: string): string {
  return text
    .replace(/\b(please|kindly|can you|could you|would you|i want to|i would like to|i'd like to|help me)\b/gi, ' ')
    .replace(/\b(post|publish|share|create|make|write|draft|prepare|generate|upload|send)\b/gi, ' ')
    .replace(/\b(a|an|new|some)\s+(post|update|photo post|video post)\b/gi, ' ')
    .replace(/\b(with|including|plus)\s+(caption|hashtags?|seo|alt text)\b/gi, ' ')
    .replace(/\b(hashtags?|caption|seo|alt text|engagement|viral)\b/gi, ' ')
    .replace(/\b(on|to|across|via|for)\s+(all\s+)?(facebook|instagram|insta|ig|linkedin|twitter|x|tiktok|youtube|pinterest|social media|socials|everywhere)\b/gi, ' ')
    .replace(/\b(facebook|instagram|insta|linkedin|twitter|twitter|x\.com|tiktok|youtube|pinterest|social media|socials)\b/gi, ' ');
}

function tidy(text: string): string {
  const cleaned = text
    .replace(/[#*_`]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.;:\-–—]+|[\s,.;:\-–—]+$/g, '')
    .trim();
  return cleaned.replace(/^(about|regarding|for|on|re|topic)\s+/i, '').trim();
}

function detectTopic(raw: string): string {
  const marker = raw.match(/\b(?:about|regarding|on the topic of|topic:|re:|caption about)\s+(.+)$/i);
  if (marker) {
    const topic = tidy(stripSchedule(stripIntents(marker[1])));
    if (topic) return topic;
  }
  const fallback = tidy(stripSchedule(stripIntents(raw)));
  if (fallback) return fallback;
  return tidy(stripSchedule(raw)) || raw.trim();
}

function detectLanguage(text: string, fallback: Language): Language {
  if (/[\u0600-\u06FF]/.test(text)) return 'urdu';
  if (/\b(karo|karein|hai|hain|mein|ka|ki|ke|aaj|kal|bahut|zabardast|khubsurat|pahad|baraf)\b/i.test(text)) return 'roman-urdu';
  return fallback;
}

function detectTone(text: string): string {
  const lower = text.toLowerCase();
  const map: Array<[RegExp, string]> = [
    [/luxury|premium|exclusive|high-end/, 'premium'],
    [/adventure|adventurous|trek|hike|thrill|expedition/, 'adventurous'],
    [/fun|funny|playful|witty|meme/, 'playful'],
    [/professional|corporate|b2b|business/, 'professional'],
    [/inspiring|inspirational|motivat|emotional|heartfelt/, 'inspirational'],
    [/hype|launch|exciting|big news|announcement/, 'energetic'],
    [/calm|peaceful|serene|quiet|slow/, 'serene'],
    [/urgent|last chance|limited|deadline/, 'urgent'],
  ];
  for (const [pattern, tone] of map) if (pattern.test(lower)) return tone;
  return 'inviting';
}

function detectMediaType(text: string, platforms: PlatformId[]): MediaType {
  const lower = text.toLowerCase();
  if (/\b(video|reel|reels|clip|shorts?|vlog|footage|drone)\b/.test(lower)) return 'video';
  if (/\b(photo|photos|image|images|picture|graphic|poster|carousel|album)\b/.test(lower)) return 'image';
  if (platforms.length > 0 && platforms.every((p) => p === 'youtube')) return 'video';
  return 'image';
}

export function parseCommand(raw: string, settings: Settings, override?: Partial<CommandPlan>): CommandPlan {
  const text = raw.trim();
  const tz = settings.timezone || DEFAULT_TZ;
  const detected = detectPlatforms(text);
  const platforms = override?.platforms?.length ? override.platforms : detected.explicit ? detected.platforms : settings.defaultPlatforms;
  const mediaType = override?.mediaType ?? detectMediaType(text, platforms);
  const hours = [...new Set(platforms.flatMap((p) => PLATFORMS[p].bestHours))].sort((a, b) => a - b);
  const schedule = parseSchedule(text, tz, hours.length ? hours : [9, 13, 19]);
  const keywords = extractKeywords(detectTopic(text), 12);
  return {
    raw: text,
    topic: detectTopic(text),
    platforms: platforms.length ? platforms : ['facebook'],
    mediaType,
    tone: override?.tone ?? detectTone(text),
    language: override?.language ?? detectLanguage(text, settings.language),
    scheduleAt: override?.scheduleAt ?? schedule?.iso ?? (/schedule|queue|next time|later/i.test(text) ? bestNextSlot(tz, hours) : null),
    scheduleLabel: override?.scheduleLabel ?? schedule?.label ?? null,
    keywords: keywords.length ? keywords : extractKeywords(text, 12),
    explicitPlatforms: detected.explicit,
  };
}

export function hashtagsFor(platform: PlatformId, tags: string[]): string[] {
  const meta = PLATFORMS[platform];
  const [, max] = meta.hashtagIdeal;
  return tags.slice(0, max);
}
