import { PLATFORMS } from './platforms/meta';
import type { CommandPlan, MediaAsset, PlatformId, PostVariant, Settings } from './types';
import { normalizeHashtag, titleCase, uniqueBy } from './utils';

const CURATED: Record<string, string[]> = {
  pakistan: ['Pakistan', 'PakistanTourism', 'DiscoverPakistan', 'BeautifulPakistan'],
  tourism: ['Tourism', 'IncrediblePakistan', 'TravelPakistan'],
  winter: ['WinterInPakistan', 'SnowSeason', 'WinterWonderland', 'WinterTravel'],
  snow: ['SnowLovers', 'FirstSnow', 'SnowyMountains'],
  north: ['NorthernPakistan', 'NorthPakistan', 'Karakoram', 'MountainLife'],
  hunza: ['Hunza', 'HunzaValley', 'HunzaDiaries'],
  skardu: ['Skardu', 'SkarduValley', 'Shangrila'],
  gilgit: ['Gilgit', 'GilgitBaltistan'],
  naran: ['Naran', 'KaghanValley'],
  swat: ['Swat', 'SwatValley'],
  chitral: ['Chitral', 'KalashValley'],
  fairy: ['FairyMeadows', 'NangaParbat'],
  k2: ['K2', 'KarakoramHighway'],
  mountains: ['Mountains', 'MountainLovers', 'ExploreMountains'],
  lake: ['Lakes', 'AttabadLake', 'LakeViews'],
  travel: ['TravelGram', 'Wanderlust', 'TravelDiaries', 'TravelPakistan'],
  culture: ['Culture', 'Heritage', 'LocalLife'],
  food: ['PakistaniFood', 'DesiFood', 'ChaiLovers'],
  camping: ['Camping', 'OutdoorLife', 'CampUnderStars'],
  hiking: ['Hiking', 'Trekking', 'TrailLife'],
  adventure: ['Adventure', 'AdventureTravel', 'OffTheBeatenPath'],
};

export function buildHashtags(topic: string, keywords: string[], cap = 18): string[] {
  const haystack = `${topic} ${keywords.join(' ')}`.toLowerCase();
  const tags: string[] = [];
  for (const [needle, list] of Object.entries(CURATED)) {
    if (haystack.includes(needle)) tags.push(...list);
  }
  const clean = keywords.filter((k) => k.length > 2).slice(0, 8);
  for (const word of clean) tags.push(titleCase(word).replace(/\s+/g, ''));
  if (clean.length >= 2) tags.push(clean.slice(0, 2).map((w) => titleCase(w)).join('').replace(/\s+/g, ''));
  tags.push('Travel', 'Wanderlust', 'TravelGram');
  return uniqueBy(tags.map(normalizeHashtag).filter(Boolean), (t) => t).slice(0, cap);
}

function hook(topic: string, tone: string): string {
  const title = titleCase(topic).replace(/\.$/, '');
  switch (tone) {
    case 'adventurous':
      return `The road ends where the snow begins — ${title}.`;
    case 'premium':
      return `${title}: quiet luxury at 2,500 metres.`;
    case 'serene':
      return `Silence has an address, and it looks like ${title}.`;
    case 'playful':
      return `Plot twist: ${title} is even better when it is freezing.`;
    case 'professional':
      return `A closer look at ${title} — and what it means for travellers this season.`;
    case 'inspirational':
      return `Some places do not just change your view. ${title} changes your pace.`;
    case 'urgent':
      return `${title} will not stay like this for long.`;
    default:
      return `${title} is calling — and winter is the best time to answer.`;
  }
}

function emojiFor(topic: string, enabled: boolean): string {
  if (!enabled) return '';
  const t = topic.toLowerCase();
  if (/snow|winter|baraf/.test(t)) return ' ❄️';
  if (/lake/.test(t)) return ' 🌊';
  if (/mountain|north|valley|hunza|skardu/.test(t)) return ' 🏔️';
  if (/food|chai|cuisine/.test(t)) return ' ☕';
  return ' ✨';
}

export function offlineContent(plan: CommandPlan, settings: Settings) {
  const title = titleCase(plan.topic).slice(0, 70);
  const keywords = plan.keywords.slice(0, 4);
  const place = keywords[0] ?? plan.topic.split(/\s+/)[0] ?? 'the north';
  const highlights = [
    `Snow-dusted valleys along the ${titleCase(place)} route`,
    'Clear mountain air and light you cannot fake in a studio',
    'Small local stops, warm chai, and long views',
  ];
  const caption = [
    `${hook(plan.topic, plan.tone)}${emojiFor(plan.topic, settings.brand.emojis)}`,
    '',
    `${titleCase(place)} in winter moves at a different speed. The crowds thin out, the light gets longer, and every viewpoint earns the drive.`,
    '',
    ...highlights.map((h) => `• ${h}`),
    '',
    `If ${plan.topic.toLowerCase()} has been on your list, this is your sign to stop waiting for summer.`,
    '',
    settings.brand.cta || 'Save this for your next trip and follow for more.',
  ].join('\n');

  return {
    title,
    caption,
    hashtags: buildHashtags(plan.topic, plan.keywords, settings.hashtagCount),
    keywords: plan.keywords,
    imageQuery: plan.topic.split(/\s+/).slice(0, 5).join(' '),
    altText: `${titleCase(plan.topic)} — scenic view used for the social post.`,
  };
}

export function variantFor(platform: PlatformId, caption: string, hashtags: string[], title?: string, altText?: string): PostVariant {
  const meta = PLATFORMS[platform];
  const tags = hashtags.slice(0, meta.hashtagIdeal[1]);
  const tagBlock = tags.map((t) => `#${t}`).join(' ');
  const budget = Math.max(40, meta.limit - (tagBlock ? tagBlock.length + 2 : 0));
  let body = caption.trim();
  if (platform === 'x') {
    body = body.split('\n').filter(Boolean).slice(0, 3).join(' ');
    if (body.length > budget) body = `${body.slice(0, budget - 1).trimEnd()}…`;
  } else if (platform === 'pinterest') {
    body = body.split('\n').filter(Boolean).slice(0, 2).join(' ');
    if (body.length > meta.limit) body = `${body.slice(0, meta.limit - 1).trimEnd()}…`;
  } else if (body.length > budget) {
    body = `${body.slice(0, budget - 1).trimEnd()}…`;
  }
  return {
    caption: body,
    hashtags: tags,
    title: title ? title.slice(0, platform === 'pinterest' || platform === 'youtube' ? 100 : 90) : undefined,
    altText: altText,
  };
}

export function primaryPlatform(plan: CommandPlan): PlatformId {
  return plan.platforms[0] ?? 'facebook';
}

export function mediaForTypes(media: MediaAsset[], plan: CommandPlan): MediaAsset[] {
  return media.filter((m) => m.type === plan.mediaType).slice(0, 4);
}
