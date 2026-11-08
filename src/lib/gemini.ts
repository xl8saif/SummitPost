import { PLATFORMS } from './platforms/meta';
import type { CommandPlan, Settings } from './types';
import { fetchJson, safeParseJson, truncate } from './utils';

interface GeminiPart { text?: string }
interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string };
}

export interface RawContent {
  title?: string;
  caption?: string;
  hashtags?: string[];
  keywords?: string[];
  imageQuery?: string;
  altText?: string;
  variants?: Record<string, { caption?: string; hashtags?: string[]; altText?: string; title?: string }>;
}

const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];

const LANGUAGE_HINT: Record<string, string> = {
  english: 'Write in natural, high-quality English.',
  'roman-urdu': 'Write in Roman Urdu mixed with English (how Pakistani social media managers actually write).',
  urdu: 'Write in Urdu script (اردو).',
};

function systemPrompt(settings: Settings): string {
  const brand = settings.brand;
  return [
    'You are SummitPost, a senior social media strategist and copywriter for a travel brand.',
    `Brand: ${brand.name}. Voice: ${brand.voice}. Audience: ${brand.audience}.`,
    brand.website ? `Website: ${brand.website}.` : '',
    'Return only valid JSON. No markdown fences, no commentary.',
  ].filter(Boolean).join(' ');
}

function userPrompt(plan: CommandPlan, settings: Settings, mediaType: string): string {
  const platformRules = plan.platforms
    .map((id) => {
      const meta = PLATFORMS[id];
      return `${meta.name}: max ${meta.limit} characters, ${meta.hashtagIdeal[0]}-${meta.hashtagIdeal[1]} hashtags, media ${meta.media.join('/')}${meta.supportsText ? '' : ', media required'}.`;
    })
    .join(' ');

  return [
    `Command from the operator: "${plan.raw}"`,
    `Topic: ${plan.topic}`,
    `Tone: ${plan.tone}. ${LANGUAGE_HINT[plan.language] ?? LANGUAGE_HINT.english}`,
    `Media type: ${mediaType}.`,
    `Platforms: ${plan.platforms.map((p) => PLATFORMS[p].name).join(', ')}. ${platformRules}`,
    'Rules:',
    '- One strong hook in the first line, no generic filler like "In today\'s world".',
    '- Short paragraphs, concrete local detail, sensory language. No invented facts, prices or dates that were not supplied.',
    '- Include one clear call to action.',
    settings.brand.emojis ? '- Use 1-3 relevant emojis, never a wall of them.' : '- Do not use emojis.',
    '- Hashtags: mix broad, niche and location tags; no duplicates, no spaces.',
    '- imageQuery must be a short English stock-photo search phrase (3-6 words) that would find a fitting real photo.',
    '- altText: one descriptive sentence for screen readers.',
    'Respond with JSON exactly in this shape:',
    '{"title":"short internal title","caption":"full caption with line breaks","hashtags":["tag1"],"keywords":["k1"],"imageQuery":"phrase","altText":"description","variants":{"facebook":{"caption":"...","hashtags":["..."]},"instagram":{"caption":"...","hashtags":["..."]},"x":{"caption":"<=240 chars","hashtags":["..."]},"linkedin":{"caption":"...","hashtags":["..."]},"tiktok":{"caption":"...","hashtags":["..."]},"youtube":{"title":"...","caption":"...","hashtags":["..."]},"pinterest":{"title":"...","caption":"...","hashtags":["..."]}}}',
    `Only include variants for: ${plan.platforms.join(', ')}.`,
  ].join('\n');
}

export async function generateWithGemini(
  plan: CommandPlan,
  settings: Settings,
  apiKey: string,
): Promise<{ content: RawContent | null; note: string }> {
  const preferred = [settings.geminiModel, ...FALLBACK_MODELS].filter(Boolean);
  const models = [...new Set(preferred)];
  let lastError = '';

  for (const model of models.slice(0, 3)) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const body = {
      systemInstruction: { parts: [{ text: systemPrompt(settings) }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt(plan, settings, plan.mediaType) }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 4096, responseMimeType: 'application/json' },
    };
    const result = await fetchJson<GeminiResponse>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    }, 45000);

    if (!result.ok) {
      lastError = result.data?.error?.message ?? result.error ?? `HTTP ${result.status}`;
      continue;
    }
    const text = (result.data?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
    const parsed = safeParseJson<RawContent>(text);
    if (parsed && typeof parsed.caption === 'string' && parsed.caption.trim().length > 20) {
      return { content: parsed, note: `Written by ${model}` };
    }
    lastError = 'Gemini returned an unusable response';
  }

  return { content: null, note: truncate(lastError || 'Gemini unavailable', 160) };
}
