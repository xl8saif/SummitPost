import { NextResponse } from 'next/server';
import { searchMedia } from '@/lib/images';
import { getSettings, resolveKeys } from '@/lib/store';
import type { MediaType } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').trim();
  const type: MediaType = searchParams.get('type') === 'video' ? 'video' : 'image';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const settings = await getSettings();
  const keys = resolveKeys(settings);
  const found = await searchMedia(query, type, keys, page);
  return NextResponse.json(found);
}
