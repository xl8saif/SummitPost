export const DEFAULT_TZ = process.env.APP_TIMEZONE || 'Asia/Karachi';

export interface ZonedParts {
  year: number; month: number; day: number; hour: number; minute: number; second: number;
}

function formatter(tz: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function zonedParts(date: Date, tz: string): ZonedParts {
  const parts = formatter(tz).formatToParts(date);
  const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return {
    year: pick('year'), month: pick('month'), day: pick('day'),
    hour: pick('hour'), minute: pick('minute'), second: pick('second'),
  };
}

export function tzOffsetMs(date: Date, tz: string): number {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function zonedToUtc(parts: ZonedParts, tz: string): Date {
  const base = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let guess = base;
  for (let i = 0; i < 2; i += 1) guess = base - tzOffsetMs(new Date(guess), tz);
  return new Date(guess);
}

export function formatDateTime(iso: string | null, tz: string): string {
  if (!iso) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(iso));
}

export function formatClock(iso: string | null, tz: string): string {
  if (!iso) return '--:--';
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));
}

export function dateKeyInTz(date: Date, tz: string): string {
  const p = zonedParts(date, tz);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function relativeLabel(iso: string, now: Date = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime();
  const minutes = Math.round(Math.abs(diff) / 60000);
  if (minutes < 1) return 'just now';
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const text = minutes < 60 ? `${minutes}m` : hours < 24 ? `${hours}h` : `${days}d`;
  return diff > 0 ? `in ${text}` : `${text} ago`;
}

export function bestNextSlot(tz: string, bestHours: number[], leadMinutes = 25): string {
  const now = new Date();
  const start = zonedParts(now, tz);
  const hours = bestHours.length ? bestHours : [9, 13, 19];
  const startDay = new Date(Date.UTC(start.year, start.month - 1, start.day));
  for (let offset = 0; offset < 8; offset += 1) {
    const day = new Date(startDay);
    day.setUTCDate(day.getUTCDate() + offset);
    for (const hour of hours) {
      const candidate = zonedToUtc(
        { year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate(), hour, minute: 0, second: 0 },
        tz,
      );
      if (candidate.getTime() > now.getTime() + leadMinutes * 60000) return candidate.toISOString();
    }
  }
  return new Date(now.getTime() + 3600000).toISOString();
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function parseClock(text: string): { hour: number; minute: number } | null {
  const meridiem = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i);
  if (meridiem) {
    let hour = Number(meridiem[1]);
    const minute = Number(meridiem[2] ?? '0');
    const half = meridiem[3].toLowerCase();
    if (half.startsWith('p') && hour < 12) hour += 12;
    if (half.startsWith('a') && hour === 12) hour = 0;
    if (hour <= 23 && minute <= 59) return { hour, minute };
  }
  const baje = text.match(/(\d{1,2})(?::(\d{2}))?\s*(baje|bajay|o'clock)/i);
  if (baje) {
    let hour = Number(baje[1]);
    const minute = Number(baje[2] ?? '0');
    if (/(shaam|sham|raat)/.test(text) && hour < 12) hour += 12;
    if (text.includes('subah') && hour === 12) hour = 0;
    if (hour <= 23 && minute <= 59) return { hour, minute };
  }
  const at = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i);
  if (at) {
    const hour = Number(at[1]);
    const minute = Number(at[2] ?? '0');
    if (hour <= 23 && minute <= 59) return { hour, minute };
  }
  return null;
}

export interface ScheduleParse { iso: string; label: string }

export function parseSchedule(text: string, tz: string, bestHours: number[]): ScheduleParse | null {
  const lower = text.toLowerCase();
  const now = new Date();
  const today = zonedParts(now, tz);
  const clock = parseClock(lower);

  const inMatch = lower.match(/\bin\s+(\d{1,2})\s*(minute|minutes|hour|hours|day|days)\b/);
  if (inMatch) {
    const amount = Number(inMatch[1]);
    const unit = inMatch[2];
    const ms = unit.startsWith('minute') ? amount * 60000 : unit.startsWith('hour') ? amount * 3600000 : amount * 86400000;
    const iso = new Date(now.getTime() + ms).toISOString();
    return { iso, label: `In ${amount} ${unit}` };
  }

  const dayMatch = lower.match(/\b(today|tomorrow|tonight)\b/);
  const weekdayMatch = lower.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  const dateMatch = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  const scheduleWord = /\b(schedule|scheduled|later|next time|queue|queue it)\b/.test(lower);
  if (!dayMatch && !weekdayMatch && !dateMatch && !clock && !scheduleWord) return null;

  let target = { year: today.year, month: today.month, day: today.day };
  if (dayMatch && dayMatch[1] === 'tomorrow') {
    const d = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
    target = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  } else if (weekdayMatch) {
    const targetDay = WEEKDAYS.indexOf(weekdayMatch[2]);
    const todayDow = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
    let delta = (targetDay - todayDow + 7) % 7;
    if (delta === 0) delta = 7;
    const d = new Date(Date.UTC(today.year, today.month - 1, today.day + delta));
    target = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  } else if (dateMatch) {
    const month = MONTHS.indexOf(dateMatch[2]) + 1;
    const day = Number(dateMatch[1]);
    let year = today.year;
    if (month < today.month || (month === today.month && day < today.day)) year += 1;
    target = { year, month, day };
  }

  let hour = clock?.hour;
  const minute = clock?.minute ?? 0;
  if (hour === undefined) {
    if (/\b(morning|subah)\b/.test(lower)) hour = 9;
    else if (/\b(afternoon|dopahar)\b/.test(lower)) hour = 14;
    else if (/\b(evening|shaam|sham)\b/.test(lower)) hour = 18;
    else if (/\b(night|tonight|raat)\b/.test(lower)) hour = 21;
    else hour = bestHours[0] ?? 10;
  }

  const iso = zonedToUtc({ ...target, hour, minute, second: 0 }, tz).toISOString();
  return { iso, label: formatDateTime(iso, tz) };
}
