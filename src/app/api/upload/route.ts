import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { addMedia, logActivity } from '@/lib/store';
import type { MediaAsset } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file received' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Max file size is 25 MB' }, { status: 413 });

    const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : null;
    if (!type) return NextResponse.json({ error: 'Only images and videos are supported' }, { status: 415 });

    const ext = (path.extname(file.name) || (type === 'video' ? '.mp4' : '.jpg')).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.bin';
    const name = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
    const dir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

    const asset: MediaAsset = {
      id: `up_${Date.now()}`,
      type,
      url: `/uploads/${name}`,
      thumbUrl: type === 'image' ? `/uploads/${name}` : undefined,
      source: 'upload',
      alt: file.name,
      credit: 'Your upload',
      addedAt: new Date().toISOString(),
    };
    await addMedia(asset);
    await logActivity({ type: 'upload', message: `Uploaded ${file.name}` });
    return NextResponse.json({ asset });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 });
  }
}
