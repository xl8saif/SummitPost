'use client';

import { useCallback, useEffect, useState } from 'react';
import { Images } from 'lucide-react';
import { api } from '@/lib/client';
import type { Post } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PostRow } from './PostRow';
import { useToast } from './Toast';

const FILTERS = [
  { id: 'pending_approval', label: 'Needs approval' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'failed', label: 'Failed' },
  { id: 'all', label: 'All' },
];

export function QueueClient() {
  const toast = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [timezone, setTimezone] = useState('Asia/Karachi');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [postsData, settingsData] = await Promise.all([
        api<{ posts: Post[] }>('/api/posts'),
        api<{ settings: { timezone: string } }>('/api/settings'),
      ]);
      setPosts(postsData.posts);
      setTimezone(settingsData.settings.timezone);
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not load the queue', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const visible = posts.filter((post) =>
    filter === 'all' ? true : filter === 'published' ? post.status === 'published' || post.status === 'partial' : post.status === filter,
  );
  const stat = (predicate: (post: Post) => boolean) => posts.filter(predicate).length;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">Approval queue</h1>
        <p className="mt-1 text-[12.5px] text-slate-500">Everything waits here until you approve it. Scheduled posts fire automatically.</p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Waiting', value: stat((p) => p.status === 'pending_approval'), tone: 'text-amber2-300' },
          { label: 'Scheduled', value: stat((p) => p.status === 'scheduled'), tone: 'text-sky2-300' },
          { label: 'Published', value: stat((p) => p.status === 'published' || p.status === 'partial'), tone: 'text-mint-300' },
        ].map((item) => (
          <div key={item.label} className="card-tight px-3 py-2.5">
            <p className={cn('font-display text-xl font-bold tabular-nums', item.tone)}>{item.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="hide-scrollbar flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={cn('chip shrink-0', filter === item.id && 'chip-on')}>
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <div className="card h-40 skeleton" /> : null}

      {!loading && visible.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <Images size={22} className="mx-auto text-slate-600" />
          <h3 className="mt-2 font-display text-base font-bold text-white">Nothing here yet</h3>
          <p className="mt-1 text-[12px] text-slate-500">Generate a post in the Studio and it will land in this queue.</p>
        </div>
      ) : null}

      <div className="space-y-2.5">
        {visible.map((post) => <PostRow key={post.id} post={post} timezone={timezone} onChanged={load} />)}
      </div>
    </div>
  );
}
