import { NextResponse } from 'next/server';
import { runDuePosts } from '@/lib/scheduler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle() {
  const result = await runDuePosts();
  return NextResponse.json({ ok: true, ...result, checkedAt: new Date().toISOString() });
}

export async function GET() {
  return handle();
}

export async function POST() {
  return handle();
}
