'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ImageIcon, Search, Upload, Video } from 'lucide-react';
import { api, uploadMedia } from '@/lib/client';
import type { MediaAsset, MediaType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Sheet, Spinner } from './ui';
import { useToast } from './Toast';

type Tab = 'suggestions' | 'search' | 'upload';

export function MediaPicker({
  open, onClose, suggestions, value, mediaType, onApply,
}: {
  open: boolean;
  onClose: () => void;
  suggestions: MediaAsset[];
  value: MediaAsset[];
  mediaType: MediaType;
  onApply: (assets: MediaAsset[]) => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('suggestions');
  const [type, setType] = useState<MediaType>(mediaType);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaAsset[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<MediaAsset[]>(value);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelected(value);
      setType(mediaType);
      setTab(suggestions.length ? 'suggestions' : 'search');
    }
  }, [open, value, mediaType, suggestions.length]);

  const toggle = (asset: MediaAsset) => {
    setSelected((current) => {
      if (current.some((item) => item.url === asset.url)) return current.filter((item) => item.url !== asset.url);
      return [...current, asset].slice(0, 4);
    });
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await api<{ results: MediaAsset[]; note: string }>(
        `/api/images?q=${encodeURIComponent(query)}&type=${type}`,
      );
      setResults(data.results);
      setNote(data.note);
      setTab('search');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 4)) {
        const data = await uploadMedia(file);
        const asset = data.asset as unknown as MediaAsset;
        setSelected((current) => [...current, asset].slice(0, 4));
      }
      toast.push('Media uploaded', 'success');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const list = tab === 'suggestions' ? suggestions : results;

  return (
    <Sheet open={open} onClose={onClose} title="Choose media" subtitle="Pick up to 4 assets — stock photos and videos or your own uploads.">
      <div className="mb-3 flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {(['suggestions', 'search', 'upload'] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn('flex-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold capitalize transition',
              tab === item ? 'bg-white/10 text-white' : 'text-slate-500')}
          >
            {item}
          </button>
        ))}
      </div>

      {tab !== 'upload' ? (
        <div className="mb-3 flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') runSearch(); }}
              placeholder="hunza valley snow, karakoram winter…"
              className="input !pl-9"
            />
          </div>
          <button type="button" onClick={() => setType(type === 'image' ? 'video' : 'image')} className="btn btn-ghost !px-2.5" title="Toggle media type">
            {type === 'image' ? <ImageIcon size={15} /> : <Video size={15} />}
          </button>
          <button type="button" onClick={runSearch} disabled={loading} className="btn btn-primary !px-3">
            {loading ? <Spinner size={14} /> : 'Go'}
          </button>
        </div>
      ) : null}

      {tab === 'upload' ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="grid w-full place-items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-10 text-center"
          >
            <Upload size={22} className="text-mint-300" />
            <span className="text-[13px] font-semibold text-slate-200">{uploading ? 'Uploading…' : 'Choose photos or videos'}</span>
            <span className="text-[11px] text-slate-500">From your phone gallery or camera · up to 25 MB each</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
        </div>
      ) : null}

      {tab === 'suggestions' && suggestions.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-6 text-center text-[12px] text-slate-500">
          No suggestions yet — generate a post first, or search above.
        </p>
      ) : null}

      {note && tab === 'search' ? <p className="mb-2 text-[11px] leading-snug text-slate-500">{note}</p> : null}

      {list.length ? (
        <div className="grid grid-cols-3 gap-1.5">
          {list.map((asset) => {
            const active = selected.some((item) => item.url === asset.url);
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => toggle(asset)}
                className={cn('group relative aspect-square overflow-hidden rounded-xl border-2 bg-black/40 transition',
                  active ? 'border-mint-400' : 'border-transparent hover:border-white/20')}
              >
                <img src={asset.thumbUrl ?? asset.url} alt={asset.alt ?? ''} className="h-full w-full object-cover" />
                {asset.type === 'video' ? (
                  <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[8px] font-bold text-white">VIDEO</span>
                ) : null}
                {active ? (
                  <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-mint-400 text-ink-950">
                    <Check size={12} strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="sticky bottom-0 mt-4 flex items-center gap-2 border-t border-white/10 bg-ink-900 pt-3">
        <span className="text-[11px] text-slate-500">{selected.length} selected</span>
        <button type="button" onClick={() => setSelected([])} className="btn btn-ghost ml-auto !py-2 !text-[11px]">Clear</button>
        <button type="button" onClick={() => { onApply(selected); onClose(); }} className="btn btn-primary !py-2">
          Use media
        </button>
      </div>
    </Sheet>
  );
}
