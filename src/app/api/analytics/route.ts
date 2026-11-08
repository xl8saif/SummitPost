import { NextResponse } from 'next/server';
import { listPosts } from '@/lib/store';
import type { PlatformId } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const posts = await listPosts();
  const byPlatform: Record<string, number> = {};
  for (const post of posts) for (const p of post.platforms) byPlatform[p] = (byPlatform[p] ?? 0) + 1;

  const published = posts.filter((p) => p.status === 'published' || p.status === 'partial');
  const realPublishes = published.flatMap((p) => p.results).filter((r) => r.status === 'published').length;
  const simulatedPublishes = published.flatMap((p) => p.results).filter((r) => r.status === 'simulated').length;
  const nextScheduled = posts
    .filter((p) => p.status === 'scheduled' && p.scheduleAt)
    .sort((a, b) => (a.scheduleAt ?? '').localeCompare(b.scheduleAt ?? ''))[0] ?? null;

  const avgScore = posts.length ? Math.round(posts.reduce((sum, p) => sum + (p.seo?.score ?? 0), 0) / posts.length) : 0;

  return NextResponse.json({
    totals: {
      all: posts.length,
      drafts: posts.filter((p) => p.status === 'draft').length,
      pending: posts.filter((p) => p.status === 'pending_approval').length,
      scheduled: posts.filter((p) => p.status === 'scheduled').length,
      published: published.length,
      failed: posts.filter((p) => p.status === 'failed').length,
    },
    realPublishes,
    simulatedPublishes,
    avgScore,
    byPlatform: byPlatform as Partial<Record<PlatformId, number>>,
    nextScheduled,
  });
}
