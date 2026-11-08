'use client';

import { useEffect } from 'react';
import { AlertTriangle, Check, X, XCircle } from 'lucide-react';
import { PLATFORMS, STATUS_META } from '@/lib/platforms/meta';
import type { PlatformId, SeoCheck } from '@/lib/types';
import { cn } from '@/lib/utils';

const TONES: Record<string, string> = {
  neutral: 'border-white/10 bg-white/[0.06] text-slate-300',
  amber: 'border-amber2-400/35 bg-amber2-400/10 text-amber2-300',
  sky: 'border-sky2-400/35 bg-sky2-400/10 text-sky2-300',
  mint: 'border-mint-400/35 bg-mint-400/10 text-mint-300',
  rose: 'border-rose-400/35 bg-rose-400/10 text-rose-300',
};

export function Badge({ children, tone = 'neutral', className }: {
  children: React.ReactNode;
  tone?: 'neutral' | 'amber' | 'sky' | 'mint' | 'rose';
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', TONES[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function PlatformTile({ id, size = 26 }: { id: PlatformId; size?: number }) {
  const meta = PLATFORMS[id];
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-[9px] font-bold text-white"
      style={{ width: size, height: size, background: meta.gradient, fontSize: Math.round(size * 0.36) }}
      title={meta.name}
    >
      {meta.short}
    </span>
  );
}

export function ScoreRing({ score, size = 62 }: { score: number; size?: number }) {
  const stroke = size >= 60 ? 6 : 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = score >= 88 ? '#34d399' : score >= 72 ? '#38bdf8' : score >= 55 ? '#fbbf24' : '#fb7185';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={tone} strokeWidth={stroke}
          strokeDasharray={circumference} strokeLinecap="round"
          strokeDashoffset={circumference - (circumference * Math.max(0, Math.min(100, score))) / 100}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display font-bold tabular-nums" style={{ color: tone, fontSize: Math.round(size * 0.29) }}>
        {Math.round(score)}
      </span>
    </div>
  );
}

export function CheckRow({ check }: { check: SeoCheck }) {
  const icon = check.status === 'pass' ? <Check size={13} className="text-mint-400" />
    : check.status === 'warn' ? <AlertTriangle size={13} className="text-amber2-400" />
    : <XCircle size={13} className="text-rose-400" />;
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-semibold text-slate-200">{check.label}</span>
        <span className="block text-[11px] leading-snug text-slate-500">{check.detail}</span>
      </span>
      <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-600">{check.points}/{check.weight}</span>
    </li>
  );
}

export function Sheet({ open, onClose, title, subtitle, children }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="sheet-backdrop absolute inset-0" />
      <div className="animate-rise relative z-10 flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[26px] border border-white/10 bg-ink-900 shadow-card md:max-h-[80vh] md:max-w-2xl md:rounded-3xl">
        <div className="flex items-start gap-3 border-b border-white/[0.07] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[15px] font-bold tracking-tight text-white">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close sheet" className="btn btn-ghost !rounded-xl !p-2"><X size={15} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: {
  checked: boolean; onChange: (value: boolean) => void; label: string; hint?: string;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-start gap-3 text-left">
      <span className={cn('mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition',
        checked ? 'border-mint-400/50 bg-mint-400/25' : 'border-white/10 bg-white/[0.05]')}>
        <span className={cn('rounded-full bg-white transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} style={{ height: 18, width: 18 }} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-slate-100">{label}</span>
        {hint ? <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-500">{hint}</span> : null}
      </span>
    </button>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <span className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent" style={{ width: size, height: size }} />;
}
