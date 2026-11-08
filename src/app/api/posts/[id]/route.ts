import { NextResponse } from 'next/server';
import { analyzeSeo } from '@/lib/seo';
import { deletePost, getPost, logActivity, updatePost } from '@/lib/store';
import type { PlatformId, Post, PostStatus } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES: PostStatus[] = ['draft', 'pending_approval', 'scheduled', 'published', 'partial', 'failed'];

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const existing = await getPost(id);
  if (!existing) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const body = (await request.json()) as Partial<Post> & { scheduleAt?: string | null };
  const patch: Partial<Post> = {};

  if (typeof body.caption === 'string') patch.caption = body.caption;
  if (typeof body.title === 'string') patch.title = body.title;
  if (Array.isArray(body.hashtags)) patch.hashtags = body.hashtags;
  if (Array.isArray(body.media)) patch.media = body.media;
  if (typeof body.notes === 'string') patch.notes = body.notes;
  if (Array.isArray(body.platforms) && body.platforms.length) patch.platforms = body.platforms;
  if (body.variants && typeof body.variants === 'object') patch.variants = body.variants;
  if (body.scheduleAt !== undefined) patch.scheduleAt = body.scheduleAt;
  if (body.status && STATUSES.includes(body.status)) {
    patch.status = body.status;
    if (body.status === 'pending_approval') patch.approvedAt = null;
    if (body.status === 'scheduled' && !patch.scheduleAt) patch.scheduleAt = existing.scheduleAt;
  }

  const merged: Post = { ...existing, ...patch };
  const primary = (merged.platforms[0] ?? 'facebook') as PlatformId;
  const variant = merged.variants?.[primary] ?? { caption: merged.caption, hashtags: merged.hashtags };
  patch.seo = analyzeSeo({
    platform: primary,
    caption: variant.caption,
    hashtags: variant.hashtags ?? [],
    keywords: merged.keywords,
    media: merged.media,
    altText: variant.altText,
  });

  const updated = await updatePost(id, patch);
  await logActivity({ type: 'update', message: `Updated "${merged.title}"`, postId: id });
  return NextResponse.json({ post: updated });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const post = await getPost(id);
  const removed = await deletePost(id);
  if (removed) await logActivity({ type: 'delete', message: `Deleted "${post?.title ?? id}"` });
  return NextResponse.json({ ok: removed });
}
