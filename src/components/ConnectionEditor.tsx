'use client';

import { useState } from 'react';
import { ChevronDown, ExternalLink, Link2 } from 'lucide-react';
import type { PlatformMeta } from '@/lib/platforms/meta';
import type { AccountConfig } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Spinner } from './ui';

export function ConnectionEditor({
  platform,
  account,
  saving,
  onSave,
}: {
  platform: PlatformMeta;
  account: AccountConfig;
  saving: boolean;
  onSave: (patch: Partial<AccountConfig>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const field of platform.credentialFields) seed[field.key] = (account[field.key] as string | undefined) ?? '';
    return seed;
  });

  const ready = platform.credentialFields
    .filter((field) => field.key !== 'accountName')
    .every((field) => draft[field.key]?.trim());

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[10px] font-black text-white" style={{ background: platform.gradient }}>
          {platform.short}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-bold text-white">{platform.name}</span>
          <span className="block truncate text-[10.5px] text-slate-500">{account.accountName || platform.setup}</span>
        </span>
        <span className={cn('rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider',
          account.connected ? 'bg-mint-400/15 text-mint-300' : 'bg-white/[0.06] text-slate-400')}>
          {account.connected ? 'Connected' : 'Not connected'}
        </span>
        <ChevronDown size={14} className={cn('text-slate-500 transition', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="space-y-2 border-t border-white/[0.06] px-3 py-3">
          {platform.credentialFields.map((field) => (
            <label key={field.key} className="block">
              <span className="label">{field.label}</span>
              <input
                type={field.secret ? 'password' : 'text'}
                value={draft[field.key] ?? ''}
                onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
                placeholder={field.hint}
                autoComplete="off"
                className="input !py-2 !text-[12px]"
              />
            </label>
          ))}

          <ul className="space-y-1 rounded-lg bg-amber2-300/[0.06] px-2.5 py-2">
            {platform.notes.map((note) => (
              <li key={note} className="text-[10.5px] leading-snug text-amber2-200/80">· {note}</li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={saving || !ready}
              className="btn btn-primary !py-1.5 !text-[12px]"
              onClick={() => onSave({ ...draft, connected: true, lastCheckedAt: new Date().toISOString() })}
            >
              {saving ? <Spinner size={12} /> : <Link2 size={13} />} Save connection
            </button>
            {account.connected ? (
              <button type="button" className="btn btn-ghost !py-1.5 !text-[12px]" onClick={() => onSave({ connected: false })}>
                Disconnect
              </button>
            ) : null}
            <a href={platform.docs} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-semibold text-sky2-300">
              Docs <ExternalLink size={10} />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
