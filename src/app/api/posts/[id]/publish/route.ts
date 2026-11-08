import { NextResponse } from 'next/server';
import { publishPost } from '@/lib/publishers';
import { getPost, getSettings, logActivity, updatePost } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const settings = await getSettings();
  const { results, status } = await publishPost(post, settings);
  const updated = await updatePost(id, {
    status,
    results,
    approvedAt: post.approvedAt ?? new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  });

  await logActivity({
    type: 'publish',
    message: `${results.every((r) => r.status === 'simulated') ? 'Simulated publish' : 'Published'} "${post.title}" → ${results.map((r) => `${r.platform}:${r.status}`).join(', ')}`,
    postId: id,
  });

  return NextResponse.json({ post: updated, results });
}
