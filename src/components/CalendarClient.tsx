'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/client';
import { PLATFORMS } from '@/lib/platforms/meta';
import { dateKeyInTz, formatClock, zonedParts } from '@/lib/time';
import type { Post } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Sheet, StatusBadge } from './ui';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function CalendarClient() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tz, setTz] = useState('Asia/Karachi');
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [dayKey, setDayKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ posts: Post[] }>('/api/posts'),
      api<{ settings: { timezone: string } }>('/api/settings'),
    ])
      .then(([postsData, settingsData]) => {
        setPosts(postsData.posts);
        setTz(settingsData.settings.timezone);
      })
      .catch(() => setPosts([]));
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      const stamp = post.scheduleAt ?? post.publishedAt ?? post.createdAt;
      const key = dateKeyInTz(new Date(stamp), tz);
      map.set(key, [...(map.get(key) ?? []), post]);
    }
    return map;
  }, [posts, tz]);

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(cursor.year, cursor.month, 1));
    const startPad = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
    const out: Array<{ day: number | null; key: string | null }> = [];
    for (let i = 0; i < startPad; i += 1) out.push({ day: null, key: null });
    for (let day = 1; day <= daysInMonth; day += 1) {
      out.push({ day, key: `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` });
    }
    while (out.length % 7 !== 0) out.push({ day: null, key: null });
    return out;
  }, [cursor]);

  const today = useMemo(() => {
    const parts = zonedParts(new Date(), tz);
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  }, [tz]);

  const move = (delta: number) => {
    setCursor((current) => {
      const month = current.month + delta;
      if (month < 0) return { year: current.year - 1, month: 11 };
      if (month > 11) return { year: current.year + 1, month: 0 };
      return { ...current, month };
    });
  };

  const selected = dayKey ? byDay.get(dayKey) ?? [] : [];

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">Calendar</h1>
          <p className="mt-1 text-[12.5px] text-slate-500">Scheduled and published posts by day · {tz}</p>
        </div>
        <button type="button" onClick={() => router.push('/')} className="btn btn-primary"><CalendarPlus size={14} /> New post</button>
      </header>

      <div className="card p-3.5">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => move(-1)} className="btn btn-ghost !p-2" aria-label="Previous month"><ChevronLeft size={16} /></button>
          <p className="font-display text-[15px] font-bold text-white">{MONTHS[cursor.month]} {cursor.year}</p>
          <button type="button" onClick={() => move(1)} className="btn btn-ghost !p-2" aria-label="Next month"><ChevronRight size={16} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEK.map((label, index) => (
            <span key={`${label}-${index}`} className="pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">{label}</span>
          ))}
          {cells.map((cell, index) => {
            const dayPosts = cell.key ? byDay.get(cell.key) ?? [] : [];
            return (
              <button
                key={`${cell.key ?? 'pad'}-${index}`}
                type="button"
                disabled={!cell.day}
                onClick={() => cell.key && setDayKey(cell.key)}
                className={cn('relative flex aspect-square flex-col items-center justify-start rounded-xl border p-1 text-[11px] transition',
                  cell.day ? 'border-white/[0.06] bg-white/[0.02] hover:border-white/20' : 'border-transparent',
                  cell.key === today && 'border-mint-400/40 bg-mint-400/[0.07]')}
              >
                <span className={cn('font-semibold', cell.key === today ? 'text-mint-300' : cell.day ? 'text-slate-300' : 'text-transparent')}>{cell.day ?? '·'}</span>
                <span className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                  {dayPosts.slice(0, 3).map((post) => (
                    <span key={post.id} className="h-1.5 w-1.5 rounded-full" style={{ background: PLATFORMS[post.platforms[0]]?.accent ?? '#64748b' }} />
                  ))}
                  {dayPosts.length > 3 ? <span className="text-[8px] text-slate-500">+{dayPosts.length - 3}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Upcoming</h2>
        {posts.filter((post) => post.status === 'scheduled' && post.scheduleAt).sort((a, b) => (a.scheduleAt ?? '').localeCompare(b.scheduleAt ?? '')).slice(0, 5).map((post) => (
          <button key={post.id} type="button" onClick={() => setDayKey(dateKeyInTz(new Date(post.scheduleAt!), tz))} className="card-tight flex w-full items-center gap-2.5 px-3 py-2.5 text-left">
            <span className="h-8 w-1 rounded-full" style={{ background: PLATFORMS[post.platforms[0]]?.gradient }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-slate-100">{post.title}</span>
              <span className="block text-[10.5px] text-slate-500">{formatClock(post.scheduleAt, tz)} · {post.platforms.map((p) => PLATFORMS[p].short).join(' ')}</span>
            </span>
            <StatusBadge status={post.status} />
          </button>
        ))}
        {posts.filter((post) => post.status === 'scheduled').length === 0 ? (
          <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-6 text-center text-[12px] text-slate-500">
            Nothing scheduled. Approve a post with a time to fill this calendar.
          </p>
        ) : null}
      </div>

      <Sheet open={Boolean(dayKey)} onClose={() => setDayKey(null)} title={dayKey ?? ''} subtitle={`${selected.length} post(s) on this day`}>
        <div className="space-y-2">
          {selected.length === 0 ? <p className="py-6 text-center text-[12px] text-slate-500">No posts on this day.</p> : null}
          {selected.map((post) => (
            <div key={post.id} className="card-tight p-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={post.status} />
                <span className="text-[10px] text-slate-500">{post.scheduleAt ? formatClock(post.scheduleAt, tz) : ''}</span>
                <span className="ml-auto text-[10px] text-slate-500">{post.seo?.score ?? 0} SEO</span>
              </div>
              <p className="mt-1.5 text-[12.5px] font-semibold text-white">{post.title}</p>
              <p className="line-clamp-2 text-[11px] text-slate-500">{post.caption}</p>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
