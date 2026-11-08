'use client';

import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send, ThumbsUp } from 'lucide-react';
import { PLATFORMS } from '@/lib/platforms/meta';
import type { MediaAsset, PlatformId } from '@/lib/types';

export function PostPreview({
  platform, caption, hashtags, media, accountName, title,
}: {
  platform: PlatformId;
  caption: string;
  hashtags: string[];
  media: MediaAsset[];
  accountName?: string;
  title?: string;
}) {
  const meta = PLATFORMS[platform];
  const asset = media[0];
  const handle = accountName?.trim() || 'your.account';
  const tagLine = hashtags.map((tag) => `#${tag}`).join(' ');
  const overflow = caption.length + tagLine.length > meta.limit;

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-ink-950/80 shadow-card">
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
          style={{ background: meta.gradient }}
        >
          {meta.short}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-white">{handle}</p>
          <p className="truncate text-[10px] text-slate-500">
            {meta.name} · sponsored-ready preview
          </p>
        </div>
        <MoreHorizontal size={16} className="text-slate-500" />
      </div>

      {platform === 'pinterest' && title ? (
        <p className="px-3.5 pb-2 text-[13px] font-semibold text-white">{title}</p>
      ) : null}

      {asset ? (
        <div className="relative bg-black/50">
          {asset.type === 'video' ? (
            <video
              src={asset.url}
              poster={asset.thumbUrl}
              controls
              playsInline
              className="max-h-[340px] w-full object-cover"
            />
          ) : (
            <img src={asset.url} alt={asset.alt ?? 'Post media'} className="max-h-[340px] w-full object-cover" />
          )}
          {asset.source !== 'upload' && asset.credit ? (
            <span className="absolute bottom-1.5 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] text-white/70">
              {asset.credit}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="grid h-32 place-items-center border-y border-white/[0.06] bg-white/[0.02] text-[11px] text-slate-600">
          No media attached
        </div>
      )}

      <div className="px-3.5 py-2.5">
        <div className="mb-2 flex items-center gap-4 text-slate-300">
          <Heart size={17} />
          <MessageCircle size={17} />
          <Send size={17} />
          {platform === 'facebook' ? <ThumbsUp size={17} /> : null}
          <Bookmark size={17} className="ml-auto" />
        </div>
        <p className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-slate-200">
          {caption}
          {tagLine ? <span className="text-sky2-300"> {tagLine}</span> : null}
        </p>
        <p className="mt-2 text-[10px] text-slate-500">View all comments</p>
        {overflow ? (
          <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-[10px] font-semibold text-rose-300">
            Over the {meta.limit.toLocaleString()} character limit for {meta.name}
          </p>
        ) : null}
      </div>
    </div>
  );
}
