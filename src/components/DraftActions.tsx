'use client';

import { useState } from 'react';
import { CalendarClock, Send, Sparkles } from 'lucide-react';
import { fromLocalInput, toLocalInput } from '@/lib/client';
import type { DraftPayload } from '@/lib/types';
import type { DraftEditorProps } from './DraftEditor';
import { Sheet, Spinner } from './ui';

export function DraftActions(props: DraftEditorProps & { overLimit?: boolean }) {
  const { draft, onSave, onPublish, saving, publishing, timezone, overLimit } = props;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(toLocalInput(draft.suggestedScheduleAt));

  const quick = (kind: 'hour' | 'tonight' | 'tomorrow') => {
    const date = new Date();
    if (kind === 'hour') date.setHours(date.getHours() + 1);
    if (kind === 'tonight') { date.setHours(20, 0, 0, 0); if (date < new Date()) date.setDate(date.getDate() + 1); }
    if (kind === 'tomorrow') { date.setDate(date.getDate() + 1); date.setHours(9, 0, 0, 0); }
    setValue(toLocalInput(date.toISOString()));
  };

  return (
    <>
      <div className="sticky bottom-[72px] z-20 md:bottom-4">
        <div className="card flex flex-wrap items-center gap-2 px-3 py-2.5">
          <p className="hidden min-w-0 flex-1 text-[11px] leading-snug text-slate-500 sm:block">
            {overLimit ? 'Caption is over the character limit — trim before publishing.' : 'Nothing publishes without your approval.'}
          </p>
          <button type="button" onClick={() => onSave('draft', null)} disabled={saving} className="btn btn-ghost">
            {saving ? <Spinner size={13} /> : null} Save draft
          </button>
          <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost">
            <CalendarClock size={14} /> Schedule
          </button>
          <button type="button" onClick={onPublish} disabled={publishing || overLimit} className="btn btn-primary">
            {publishing ? <Spinner size={13} /> : <Send size={14} />} Approve &amp; publish
          </button>
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Schedule this post" subtitle={`Times are in ${timezone}. The scheduler fires within 20 seconds of the slot.`}>
        <div className="space-y-3">
          <input type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} className="input" />
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="chip" onClick={() => quick('hour')}>In 1 hour</button>
            <button type="button" className="chip" onClick={() => quick('tonight')}>Tonight 8pm</button>
            <button type="button" className="chip" onClick={() => quick('tomorrow')}>Tomorrow 9am</button>
          </div>
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
            <Sparkles size={12} className="mt-0.5 shrink-0 text-mint-300" />
            Suggested slot from your best-time table: {draft.suggestedScheduleAt ? new Date(draft.suggestedScheduleAt).toLocaleString() : 'not available'}
          </p>
          <button
            type="button"
            disabled={!value || saving}
            onClick={() => { onSave('scheduled', fromLocalInput(value)); setOpen(false); }}
            className="btn btn-primary w-full"
          >
            {saving ? <Spinner size={13} /> : <CalendarClock size={14} />} Confirm schedule
          </button>
        </div>
      </Sheet>
    </>
  );
}
