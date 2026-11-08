'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageIcon, Search, Upload, Video, Wand2 } from 'lucide-react';
import { api, uploadMedia } from '@/lib/client';
import type { MediaAsset, MediaType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from './Toast';
import { Spinner } from './ui';

export function MediaClient() {
  const router = useRouter();
  const toast = useToast();
  const [type, setType] = useState<MediaType>('image');
  const [query, setQuery] = useState('northern pakistan winter mountains');
  const [results, setResults] = useState<MediaAsset[]>([]);
  const [library, setLibrary] = useState<MediaAsset[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadLibrary = () => {
    api<{ media: MediaAsset[] }>('/api/media').then((data) => setLibrary(data.media)).catch(() => setLibrary([]));
  };

  const search = async () => {
    setLoading(true);
    try {
      const data = await api<{ results: MediaAsset[]; note: string }>(`/api/images?q=${encodeURIComponent(query)}&type=${type}`);
      setResults(data.results);
      setNote(data.note);
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 6)) await uploadMedia(file);
      toast.push('Uploaded to your library', 'success');
      loadLibrary();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const useInPost = (asset: MediaAsset) => {
    window.localStorage.setItem('summit.seedMedia', JSON.stringify([asset]));
    router.push('/');
  };

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">Media library</h1>
          <p className="mt-1 text-[12.5px] text-slate-500">Search Pexels and Unsplash, or upload from your phone.</p>
        </div>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn btn-primary">
          {uploading ? <Spinner size={13} /> : <Upload size={14} />} Upload
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(event) => upload(event.target.files)} />
      </header>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[180px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') search(); }}
            className="input !pl-9"
            placeholder="hunza in winter, karakoram highway, attabad lake…"
          />
        </div>
        <button type="button" onClick={() => setType(type === 'image' ? 'video' : 'image')} className="btn btn-ghost">
          {type === 'image' ? <ImageIcon size={14} /> : <Video size={14} />} {type}
        </button>
        <button type="button" onClick={search} disabled={loading} className="btn btn-ghost">
          {loading ? <Spinner size={13} /> : <Search size={14} />} Search
        </button>
      </div>

      {note ? <p className="text-[11px] leading-snug text-slate-500">{note}</p> : null}

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
        {results.map((asset) => (
          <button
            key={asset.id}
            type="button"
            onClick={() => setSelected(selected?.url === asset.url ? null : asset)}
            className={cn('group relative aspect-square overflow-hidden rounded-xl border-2 bg-black/40',
              selected?.url === asset.url ? 'border-mint-400' : 'border-transparent')}
          >
            <img src={asset.thumbUrl ?? asset.url} alt={asset.alt ?? ''} className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
            {asset.type === 'video' ? <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[8px] font-bold text-white">VIDEO</span> : null}
          </button>
        ))}
        {!loading && results.length === 0 ? (
          <p className="col-span-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-8 text-center text-[12px] text-slate-500">No results — try a broader search.</p>
        ) : null}
      </div>

      {selected ? (
        <div className="card flex flex-wrap items-center gap-3 p-3">
          <img src={selected.thumbUrl ?? selected.url} alt="" className="h-14 w-14 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-white">{selected.alt || 'Selected asset'}</p>
            <p className="text-[10.5px] text-slate-500">
              {selected.source} {selected.credit ? `· ${selected.credit}` : ''} {selected.creditUrl ? '· credited on post' : ''}
            </p>
          </div>
          <button type="button" onClick={() => useInPost(selected)} className="btn btn-primary"><Wand2 size={14} /> Use in new post</button>
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Your uploads · {library.length}</h2>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
          {library.map((asset) => (
            <div key={asset.id} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/40">
              <img src={asset.thumbUrl ?? asset.url} alt={asset.alt ?? ''} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/85 to-transparent p-1">
                <button type="button" onClick={() => useInPost(asset)} className="text-[9px] font-bold text-mint-300">USE</button>
                <button type="button" onClick={() => window.confirm('Remove from library?') && api(`/api/media?id=${asset.id}`, { method: 'DELETE' }).then(loadLibrary)} className="text-[9px] font-bold text-rose-300">DEL</button>
              </div>
            </div>
          ))}
          {library.length === 0 ? (
            <p className="col-span-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-8 text-center text-[12px] text-slate-500">
              No uploads yet. Use the Upload button above — photos and videos up to 25 MB.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
