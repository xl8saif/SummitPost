import { NextResponse } from 'next/server';
import { composeDraft } from '@/lib/compose';
import { parseCommand } from '@/lib/parser';
import { getSettings } from '@/lib/store';
import type { CommandPlan, MediaAsset } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      command?: string;
      platforms?: CommandPlan['platforms'];
      tone?: string;
      language?: CommandPlan['language'];
      mediaType?: CommandPlan['mediaType'];
      media?: MediaAsset[];
      scheduleAt?: string | null;
    };
    const command = (body.command ?? '').trim();
    if (command.length < 4) {
      return NextResponse.json({ error: 'Write a command with a topic, e.g. "post on Facebook about winter tourism in northern Pakistan".' }, { status: 400 });
    }
    const settings = await getSettings();
    const plan = parseCommand(command, settings, {
      platforms: body.platforms?.length ? body.platforms : undefined,
      tone: body.tone,
      language: body.language,
      mediaType: body.mediaType,
      scheduleAt: body.scheduleAt ?? undefined,
    });
    const draft = await composeDraft(plan, settings, { media: body.media ?? [] });
    return NextResponse.json({ draft, timezone: settings.timezone, engine: draft.engine });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Generation failed' }, { status: 500 });
  }
}
