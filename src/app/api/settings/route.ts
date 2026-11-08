import { NextResponse } from 'next/server';
import { getSettings, resolveKeys, updateSettings } from '@/lib/store';
import type { Settings } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SafeSettings = Omit<Settings, 'geminiApiKey' | 'pexelsApiKey' | 'unsplashAccessKey'> & {
  keyStatus: { gemini: boolean; pexels: boolean; unsplash: boolean };
};

function sanitize(settings: Settings): SafeSettings {
  const { geminiApiKey, pexelsApiKey, unsplashAccessKey, ...rest } = settings;
  const keys = resolveKeys(settings);
  return { ...rest, keyStatus: { gemini: Boolean(keys.gemini), pexels: Boolean(keys.pexels), unsplash: Boolean(keys.unsplash) } };
}

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings: sanitize(settings), envKeys: {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    pexels: Boolean(process.env.PEXELS_API_KEY),
    unsplash: Boolean(process.env.UNSPLASH_ACCESS_KEY),
  } });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Partial<Settings> & {
    geminiApiKey?: string | null; pexelsApiKey?: string | null; unsplashAccessKey?: string | null;
  };
  const patch: Partial<Settings> = { ...body };

  for (const key of ['geminiApiKey', 'pexelsApiKey', 'unsplashAccessKey'] as const) {
    if (body[key] === null) patch[key] = '';
    else if (typeof body[key] === 'string' && body[key]?.trim()) patch[key] = body[key]!.trim();
    else delete patch[key];
  }
  if (body.accounts) {
    const current = await getSettings();
    patch.accounts = { ...current.accounts, ...body.accounts };
  }

  const settings = await updateSettings(patch);
  return NextResponse.json({ settings: sanitize(settings) });
}
