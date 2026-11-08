'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command, ImageIcon, Send, Sparkles, Video, Wand2 } from 'lucide-react';
import { api } from '@/lib/client';
import { PLATFORMS, PLATFORM_IDS } from '@/lib/platforms/meta';
import type { AccountConfig, DraftPayload, MediaAsset, MediaType, PlatformId, Settings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DraftEditor } from './DraftEditor';
import { useToast } from './Toast';
import { Spinner } from './ui';

type SafeSettings = Omit<Settings, 'geminiApiKey' | 'pexelsApiKey' | 'unsplashAccessKey'> & {
  keyStatus: { gemini: boolean; pexels: boolean; unsplash: boolean };
};

const EXAMPLES = [
  'Post on Facebook and Instagram about winter tourism in the north of Pakistan, schedule tomorrow 9am',
  'LinkedIn post about sustainable trekking in Hunza Valley, professional tone',
  'TikTok video: snow leopard tracking in Skardu, post tonight',
  'Pinterest pin about Attabad Lake colours in winter',
];

export function Studio() {
  const router = useRouter();
  const toast = useToast();
  const [settings, setSettings] = useState<SafeSettings | null>(null);
  const [command, setCommand] = useState('');
  const [platforms, setPlatforms] = useState<PlatformId[]>(['facebook', 'instagram']);
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [seed, setSeed] = useState<MediaAsset[]>([]);
  const [draft, setDraft] = useState<DraftPayload | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    api<{ settings: SafeSettings }>('/api/settings')
      .then((data) => {
        setSettings(data.settings);
        if (data.settings.defaultPlatforms?.length) setPlatforms(data.settings.defaultPlatforms);
      })
      .catch(() => toast.push('Could not load settings', 'error'));
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('summit.seedMedia') : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as MediaAsset[];
        if (Array.isArray(parsed) && parsed.length) setSeed(parsed);
        window.localStorage.removeItem('summit.seedMedia');
      } catch { /* ignore */ }
    }
  }, [toast]);

  const generate = async () => {
    if (command.trim().length < 6) return toast.push('Describe the post, e.g. "post on Facebook about winter in Hunza".', 'error');
    if (!platforms.length) return toast.push('Pick at least one network.', 'error');
    setGenerating(true);
    try {
      const data = await api<{ draft: DraftPayload }>('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ command, platforms, mediaType, media: seed }),
      });
      setDraft(data.draft);
      setSeed([]);
      toast.push(`Draft ready · SEO ${data.draft.seo.score}/100`, 'success');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const create = async (status: 'draft' | 'pending_approval' | 'scheduled', scheduleAt: string | null) => {
    if (!draft) return null;
    const data = await api<{ post: { id: string } }>('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ draft, status, scheduleAt }),
    });
    return data.post;
  };

  const save = async (status: 'draft' | 'pending_approval' | 'scheduled', scheduleAt: string | null) => {
    if (!draft) return;
    setSaving(true);
    try {
      const post = await create(status, scheduleAt);
      toast.push(status === 'scheduled' ? 'Scheduled — it will publish automatically.' : 'Saved to the queue.', 'success');
      router.push(`/queue?highlight=${post?.id ?? ''}`);
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Could not save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!draft) return;
    setPublishing(true);
    try {
      const post = await create('pending_approval', null);
      if (!post) throw new Error('Could not create the post');
      await api(`/api/posts/${post.id}/publish`, { method: 'POST' });
      toast.push('Approved and sent.', 'success');
      router.push('/queue');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Publishing failed', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const accounts = (settings?.accounts ?? {}) as Record<PlatformId, AccountConfig>;

  return (
    <div className="space-y-5">
      <section>
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-mint-400/25 bg-mint-400/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-mint-300">
          <Sparkles size={11} /> One command · seven networks
        </p>
        <h1 className="text-balance font-display text-[26px] font-extrabold leading-[1.1] tracking-tight text-white sm:text-4xl">
          Describe the post. <span className="bg-gradient-to-r from-mint-300 to-sky2-300 bg-clip-text text-transparent">SummitPost does the rest.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-400">
          Drafts the copy, attaches suitable media, writes hashtags, scores the SEO and waits for approval — or schedules the best slot.
        </p>
      </section>

      <section className="card p-3.5 sm:p-4">
        <div className="relative">
          <Command size={16} className="absolute left-3.5 top-3.5 text-mint-300" />
          <textarea
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') generate(); }}
            rows={3}
            placeholder="e.g. post on facebook about winter tourism in the north of pakistan, schedule tomorrow 9am"
            className="input !rounded-2xl !py-3 !pl-10 !text-[13.5px] leading-relaxed"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {PLATFORM_IDS.map((id) => (
            <button key={id} type="button" onClick={() => setPlatforms((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
              className={cn('chip', platforms.includes(id) && 'chip-on')} aria-pressed={platforms.includes(id)}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: PLATFORMS[id].accent }} />
              {PLATFORMS[id].short}
            </button>
          ))}
          <button type="button" onClick={() => setMediaType(mediaType === 'image' ? 'video' : 'image')} className="chip">
            {mediaType === 'image' ? <ImageIcon size={12} /> : <Video size={12} />} {mediaType}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={generate} disabled={generating} className="btn btn-primary flex-1 sm:flex-none">
            {generating ? <Spinner size={14} /> : <Wand2 size={15} />}
            {generating ? 'Writing & searching media…' : 'Generate post'}
          </button>
          <button type="button" onClick={() => router.push('/media')} className="btn btn-ghost"><ImageIcon size={14} /> Library</button>
          <span className="ml-auto hidden text-[10.5px] text-slate-600 sm:block">
            {settings?.keyStatus.gemini ? 'Gemini connected' : 'Offline engine'} · Ctrl/⌘+Enter
          </span>
        </div>

        <div className="hide-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {EXAMPLES.map((example) => (
            <button key={example} type="button" onClick={() => setCommand(example)}
              className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-left text-[10.5px] leading-snug text-slate-400">
              {example.length > 54 ? `${example.slice(0, 54)}…` : example}
            </button>
          ))}
        </div>
      </section>

      {draft ? (
        <DraftEditor
          key={`${draft.command}-${draft.engine}`}
          draft={draft}
          onChange={(updater) => setDraft((current) => (current ? updater(current) : current))}
          onRegenerate={generate}
          onSave={save}
          onPublish={publish}
          saving={saving}
          publishing={publishing}
          regenerating={generating}
          accounts={accounts}
          timezone={settings?.timezone ?? 'Asia/Karachi'}
        />
      ) : (
        <section className="grid gap-2.5 sm:grid-cols-3">
          {[
            { icon: Sparkles, title: 'Writes the post', body: 'Hook, body, CTA and per-network trims in your brand voice.' },
            { icon: ImageIcon, title: 'Finds the visual', body: 'Pexels and Unsplash photos or videos, or your own uploads.' },
            { icon: Send, title: 'Waits for you', body: 'Approve to publish now, or schedule and let the scheduler fire.' },
          ].map((item) => (
            <div key={item.title} className="card p-4">
              <item.icon size={17} className="text-mint-300" />
              <h3 className="mt-2 text-[13px] font-bold text-white">{item.title}</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">{item.body}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
