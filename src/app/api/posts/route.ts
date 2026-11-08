import { NextResponse } from 'next/server';
import { analyzeSeo } from '@/lib/seo';
import { addMedia, createPost, getSettings, listPosts, logActivity } from '@/lib/store';
import type { CommandPlan, DraftPayload, PlatformId, PostStatus } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED: PostStatus[] = ['draft', 'pending_approval', 'scheduled'];

export async function GET() {
  const posts = await listPosts();
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { draft?: DraftPayload; status?: PostStatus; scheduleAt?: string | null };
    const draft = body.draft;
    if (!draft || !draft.caption?.trim()) {
      return NextResponse.json({ error: 'A draft with a caption is required.' }, { status: 400 });
    }
    const settings = await getSettings();
    const platforms = (draft.plan?.platforms ?? []) as PlatformId[];
    if (!platforms.length) return NextResponse.json({ error: 'Pick at least one network.' }, { status: 400 });

    const status: PostStatus = body.status && ALLOWED.includes(body.status) ? body.status : 'pending_approval';
    const scheduleAt = body.scheduleAt ?? draft.suggestedScheduleAt ?? null;
    const primary = platforms[0];
    const variant = draft.variants?.[primary] ?? { caption: draft.caption, hashtags: draft.hashtags };
    const media = draft.media ?? [];

    const seo = analyzeSeo({
      platform: primary,
      caption: variant.caption,
      hashtags: variant.hashtags,
      keywords: draft.keywords,
      media,
      altText: draft.altText,
    });

    for (const asset of media) {
      if (asset.source !== 'placeholder') await addMedia(asset);
    }

    const post = await createPost({
      command: draft.command,
      topic: draft.plan.topic,
      tone: draft.plan.tone,
      language: draft.plan.language,
      mediaType: draft.plan.mediaType,
      title: draft.title,
      caption: draft.caption,
      hashtags: draft.hashtags,
      media,
      platforms,
      status,
      scheduleAt: status === 'scheduled' ? scheduleAt : null,
      timezone: settings.timezone,
      variants: draft.variants,
      seo,
      keywords: draft.keywords,
      imageQuery: draft.imageQuery,
      engine: draft.engine,
      results: [],
      approvedAt: null,
      publishedAt: null,
    });

    await logActivity({
      type: status === 'scheduled' ? 'schedule' : 'generate',
      message: `${status === 'scheduled' ? 'Scheduled' : 'Saved'} "${post.title}" for ${platforms.join(', ')}`,
      postId: post.id,
    });

    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save the post' }, { status: 500 });
  }
}
