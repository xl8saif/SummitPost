import { NextResponse } from 'next/server';
import { addMedia, deleteMedia, listMedia, logActivity } from '@/lib/store';
import type { MediaAsset } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const media = await listMedia();
  return NextResponse.json({ media });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { asset?: MediaAsset };
  if (!body.asset?.url) return NextResponse.json({ error: 'Asset URL is required' }, { status: 400 });
  const asset = await addMedia(body.asset);
  await logActivity({ type: 'upload', message: `Saved ${asset.type} to the library` });
  return NextResponse.json({ asset });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const removed = await deleteMedia(id);
  return NextResponse.json({ ok: removed });
}
