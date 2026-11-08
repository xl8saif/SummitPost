'use client';

import { useState } from 'react';
import { Hash, ImagePlus, Plus, RefreshCw, Sparkles, X } from 'lucide-react';
import { PLATFORMS } from '@/lib/platforms/meta';
import type { AccountConfig, DraftPayload, PlatformId, PostVariant } from '@/lib/types';
import { cn, normalizeHashtag } from '@/lib/utils';
import { DraftActions } from './DraftActions';
import { MediaPicker } from './MediaPicker';
import { PostPreview } from './PostPreview';
import { SeoPanel } from './SeoPanel';
import { Badge, Spinner } from './ui';

export interface DraftEditorProps {
  draft: DraftPayload;
  onChange: (updater: (current: DraftPayload) => DraftPayload) => void;
  onRegenerate: () => void;
  onSave: (status: 'draft' | 'pending_approval' | 'scheduled', scheduleAt: string | null) => void;
  onPublish: () => void;
  saving: boolean;
  publishing: boolean;
  regenerating: boolean;
  accounts: Record<PlatformId, AccountConfig>;
  timezone: string;
}

export function DraftEditor(props: DraftEditorProps) {
  const { draft, onChange, onRegenerate, regenerating, accounts } = props;
  const [active, setActive] = useState<PlatformId>(draft.plan.platforms[0]);
  const [tagDraft, setTagDraft] = useState('');
  const [mediaOpen, setMediaOpen] = useState(false);

  const platform = draft.plan.platforms.includes(active) ? active : draft.plan.platforms[0];
  const variant: PostVariant = draft.variants[platform] ?? { caption: draft.caption, hashtags: draft.hashtags };
  const meta = PLATFORMS[platform];
  const tags = variant.hashtags ?? [];
  const chars = (variant.caption ?? '').length + tags.map((t) => t.length + 2).join(' ').length;

  const patch = (next: Partial<PostVariant>) => {
    onChange((current) => ({ ...current, variants: { ...current.variants, [platform]: { ...variant, ...next } } }));
  };

  const addTags = () => {
    const incoming = tagDraft.split(/[\s,]+/).map(normalizeHashtag).filter(Boolean);
    if (!incoming.length) return;
    patch({ hashtags: [...new Set([...tags, ...incoming])].slice(0, 30) });
    setTagDraft('');
  };

  return (
    <div className="space-y-3">
      <div className="card overflow-hidden">
        <div className="flex items-start gap-3 px-4 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Badge tone={draft.engine === 'gemini' ? 'mint' : 'amber'}>
                <Sparkles size={9} /> {draft.engine === 'gemini' ? 'Gemini' : 'Offline'}
              </Badge>
              <Badge tone="sky">{draft.plan.tone}</Badge>
              <Badge>{draft.plan.mediaType}</Badge>
            </div>
            <input
              value={draft.title}
              onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))}
              className="w-full bg-transparent font-display text-lg font-bold tracking-tight text-white outline-none"
              placeholder="Post title"
            />
          </div>
          <button type="button" onClick={onRegenerate} disabled={regenerating} className="btn btn-ghost">
            {regenerating ? <Spinner size={14} /> : <RefreshCw size={14} />} Rewrite
          </button>
        </div>

        <div className="hide-scrollbar flex gap-1 overflow-x-auto border-y border-white/[0.06] px-3 py-2">
          {draft.plan.platforms.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={cn('shrink-0 rounded-xl border px-2.5 py-1.5 text-[11.5px] font-semibold transition',
                id === platform ? 'border-white/20 bg-white/[0.09] text-white' : 'border-transparent text-slate-500')}
            >
              {PLATFORMS[id].name}
            </button>
          ))}
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label !mb-0">Caption · {meta.name}</span>
                <span className={cn('text-[10.5px] font-semibold tabular-nums', chars > meta.limit ? 'text-rose-400' : 'text-slate-500')}>
                  {chars}/{meta.limit}
                </span>
              </div>
              <textarea
                value={variant.caption}
                onChange={(event) => patch({ caption: event.target.value })}
                rows={8}
                className="input resize-y !text-[13px] leading-relaxed"
              />
            </div>

            <div>
              <span className="label">Hashtags · {tags.length}</span>
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-black/25 p-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-sky2-400/10 px-1.5 py-0.5 text-[11px] text-sky2-200">
                    #{tag}
                    <button type="button" aria-label={`Remove ${tag}`} onClick={() => patch({ hashtags: tags.filter((t) => t !== tag) })}>
                      <X size={10} className="text-sky2-400/60" />
                    </button>
                  </span>
                ))}
                <div className="flex min-w-[110px] flex-1 items-center gap-1">
                  <Hash size={12} className="text-slate-500" />
                  <input
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addTags(); } }}
                    placeholder="add tag"
                    className="w-full bg-transparent text-[11.5px] text-slate-200 outline-none placeholder:text-slate-600"
                  />
                  <button type="button" aria-label="Add hashtag" onClick={addTags}><Plus size={13} className="text-slate-500" /></button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMediaOpen(true)} className="btn btn-ghost !py-2 !text-[12px]">
                <ImagePlus size={14} /> {draft.media.length ? `Media (${draft.media.length})` : 'Add media'}
              </button>
              <input
                value={variant.altText ?? ''}
                onChange={(event) => patch({ altText: event.target.value })}
                className="input !py-2 !text-[12px]"
                placeholder="Alt text for accessibility"
              />
            </div>

            {draft.media.length ? (
              <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
                {draft.media.map((asset) => (
                  <div key={asset.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10">
                    <img src={asset.thumbUrl ?? asset.url} alt={asset.alt ?? ''} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remove media"
                      onClick={() => onChange((current) => ({ ...current, media: current.media.filter((m) => m.id !== asset.id) }))}
                      className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/75 text-white"
                    >
                      <X size={9} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <SeoPanel platform={platform} caption={variant.caption} hashtags={tags} keywords={draft.keywords} media={draft.media} altText={variant.altText} />
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start">
            <PostPreview platform={platform} caption={variant.caption} hashtags={tags} media={draft.media} title={variant.title ?? draft.title} accountName={accounts[platform]?.accountName} />
          </div>
        </div>
      </div>

      <DraftActions {...props} overLimit={chars > meta.limit} />

      <MediaPicker
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        suggestions={draft.mediaSuggestions}
        value={draft.media}
        mediaType={draft.plan.mediaType}
        onApply={(media) => onChange((current) => ({ ...current, media }))}
      />
    </div>
  );
}
