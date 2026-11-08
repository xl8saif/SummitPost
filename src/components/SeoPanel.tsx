'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { PLATFORMS } from '@/lib/platforms/meta';
import { analyzeSeo } from '@/lib/seo';
import type { MediaAsset, PlatformId } from '@/lib/types';
import { CheckRow, ScoreRing } from './ui';

export function SeoPanel({
  platform, caption, hashtags, keywords, media, altText, compact = false,
}: {
  platform: PlatformId; caption: string; hashtags: string[]; keywords: string[];
  media: MediaAsset[]; altText?: string; compact?: boolean;
}) {
  const [open, setOpen] = useState(!compact);
  const report = useMemo(
    () => analyzeSeo({ platform, caption, hashtags, keywords, media, altText }),
    [platform, caption, hashtags, keywords, media, altText],
  );
  const meta = PLATFORMS[platform];
  const passes = report.checks.filter((c) => c.status === 'pass').length;
  const issues = report.checks.filter((c) => c.status !== 'pass');
  const gradeTone: Record<string, string> = {
    excellent: 'bg-mint-400/15 text-mint-300',
    good: 'bg-sky2-400/15 text-sky2-300',
    fair: 'bg-amber2-400/15 text-amber2-300',
    weak: 'bg-rose-400/15 text-rose-300',
  };

  return (
    <div className="card-tight overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <ScoreRing score={report.score} size={compact ? 48 : 56} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-white">
            <Sparkles size={12} className="text-mint-300" /> SEO &amp; reach check
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">
            {passes}/{report.checks.length} pass · {meta.name} · {report.characters}/{report.limit} chars
          </span>
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${gradeTone[report.grade]}`}>
          {report.grade}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="border-t border-white/[0.06] px-4 py-2">
          <ul className="divide-y divide-white/[0.04]">
            {issues.length === 0 ? (
              <li className="py-2 text-[12px] font-semibold text-mint-300">Everything checks out. Ready to ship.</li>
            ) : null}
            {(issues.length ? issues : report.checks).map((check) => <CheckRow key={check.id} check={check} />)}
          </ul>
          {report.keywords.length ? (
            <div className="pb-3 pt-2">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">Target keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {report.keywords.map((keyword) => (
                  <span key={keyword} className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10.5px] text-slate-400">{keyword}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
