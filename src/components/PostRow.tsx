'use client';

import { useState } from 'react';
import { Clock, Send, Trash2 } from 'lucide-react';
import { api, fromLocalInput, toLocalInput } from '@/lib/client';
import { PLATFORMS } from '@/lib/platforms/meta';
import { formatDateTime, relativeLabel } from '@/lib/time';
import type { Post } from '@/lib/types';
import { useToast } from './Toast';
import { Badge, PlatformTile, ScoreRing, Spinner, StatusBadge } from './ui';

export function PostRow({ post, timezone, onChanged }: { post: Post; timezone: string; onChanged: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [value, setValue] = useState(toLocalInput(post.scheduleAt));
  const asset = post.media[0];

  const act = async (work: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await work();
      toast.push(message, 'success');
      onChanged();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Action failed', 'error');
    } finally {
      setBusy(false);
      setPicking(false);
    }
  };

  const when = post.status === 'scheduled' && post.scheduleAt
    ? `Scheduled ${formatDateTime(post.scheduleAt, timezone)} · ${relativeLabel(post.scheduleAt)}`
    : post.status === 'published'
      ? `Posted ${post.publishedAt ? relativeLabel(post.publishedAt) : 'recently'}`
      : `Created ${relativeLabel(post.createdAt)}`;

  return (
    <article className="card overflow-hidden">
      <div className="flex gap-3 p-3.5">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
          {asset
            ? <img src={asset.thumbUrl ?? asset.url} alt={asset.alt ?? ''} className="h-full w-full object-cover" />
            : <span className="grid h-full w-full place-items-center text-[9px] text-slate-600">no media</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={post.status} />
            {post.platforms.map((id) => <PlatformTile key={id} id={id} size={18} />)}
          </div>
          <h3 className="mt-1.5 truncate text-[13.5px] font-bold text-white">{post.title}</h3>
          <p className="line-clamp-2 text-[11.5px] leading-snug text-slate-500">{post.caption}</p>
          <p className="mt-1 text-[10.5px] text-slate-600">{when}</p>
        </div>
        {post.seo ? <ScoreRing score={post.seo.score} size={44} /> : null}
      </div>

      {post.results.length ? (
        <div className="flex flex-wrap gap-1.5 border-t border-white/[0.06] px-3.5 py-2">
          {post.results.map((result) => (
            <Badge key={result.platform} tone={result.status === 'error' ? 'rose' : result.status === 'simulated' ? 'amber' : 'mint'}>
              {PLATFORMS[result.platform]?.short ?? result.platform} · {result.status}
            </Badge>
          ))}
        </div>
      ) : null}

      {picking ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-3.5 py-2.5">
          <input type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} className="input !w-auto !py-1.5 !text-[12px]" />
          <button type="button" className="btn btn-primary !py-1.5"
            onClick={() => act(() => api(`/api/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'scheduled', scheduleAt: fromLocalInput(value) }) }), 'Rescheduled')}>
            Confirm
          </button>
          <button type="button" className="btn btn-ghost !py-1.5" onClick={() => setPicking(false)}>Cancel</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] px-3.5 py-2.5">
          <button type="button" disabled={busy} className="btn btn-primary !py-1.5 !text-[12px]"
            onClick={() => act(() => api(`/api/posts/${post.id}/publish`, { method: 'POST' }), 'Sent.')}>
            {busy ? <Spinner size={12} /> : <Send size={13} />}
            {post.status === 'published' ? 'Publish again' : 'Approve & publish'}
          </button>
          <button type="button" className="btn btn-ghost !py-1.5 !text-[12px]" onClick={() => setPicking(true)}>
            <Clock size={13} /> {post.scheduleAt ? 'Reschedule' : 'Schedule'}
          </button>
          {post.status === 'scheduled' ? (
            <button type="button" className="btn btn-ghost !py-1.5 !text-[12px]"
              onClick={() => act(() => api(`/api/posts/${post.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'draft', scheduleAt: null }) }), 'Schedule cancelled')}>
              Unschedule
            </button>
          ) : null}
          <button type="button" className="btn btn-danger ml-auto !py-1.5 !text-[12px]"
            onClick={() => { if (window.confirm(`Delete "${post.title}"?`)) act(() => api(`/api/posts/${post.id}`, { method: 'DELETE' }), 'Deleted'); }}>
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </article>
  );
}
