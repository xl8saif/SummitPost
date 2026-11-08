'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CalendarDays, Images, Layers, Mountain, Settings2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Studio', icon: Sparkles },
  { href: '/queue', label: 'Queue', icon: Layers },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/media', label: 'Media', icon: Images },
  { href: '/settings', label: 'Settings', icon: Settings2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [live, setLive] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setLive(Boolean(data?.settings?.livePublishing)))
      .catch(() => setLive(null));
  }, [pathname]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline shell is a bonus, not a requirement */
    });
  }, []);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-white/[0.07] bg-ink-950/60 px-4 py-6 backdrop-blur-xl md:flex">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-mint-400 to-sky2-400 text-ink-950 shadow-glow">
            <Mountain size={20} strokeWidth={2.4} />
          </span>
          <span>
            <span className="block font-display text-[15px] font-bold tracking-tight text-white">SummitPost</span>
            <span className="block text-[11px] text-slate-500">social studio</span>
          </span>
        </Link>

        <nav className="mt-8 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive(item.href)
                  ? 'bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100',
              )}
            >
              <item.icon size={17} className={isActive(item.href) ? 'text-mint-300' : 'text-slate-500'} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3 px-1">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Publishing mode</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <span className={cn('h-1.5 w-1.5 rounded-full', live ? 'bg-mint-400' : 'bg-amber2-400')} />
              {live === null ? 'Checking…' : live ? 'Live connected' : 'Simulation'}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              {live ? 'Posts go to the networks you connected.' : 'Nothing leaves the app until you switch on live publishing.'}
            </p>
          </div>
          <Link href="/settings" className="block rounded-xl px-3 py-2 text-[11px] text-slate-500 hover:text-slate-300">
            Keys, voice & connections
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-mint-400 to-sky2-400 text-ink-950">
              <Mountain size={18} strokeWidth={2.4} />
            </span>
            <span className="font-display text-[15px] font-bold tracking-tight text-white">SummitPost</span>
          </Link>
          <span className={cn(
            'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
            live ? 'border-mint-400/40 bg-mint-400/10 text-mint-300' : 'border-amber2-400/35 bg-amber2-400/10 text-amber2-300',
          )}>
            {live === null ? '···' : live ? 'Live' : 'Sim'}
          </span>
        </div>
      </header>

      <main className="md:pl-[248px]">
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 md:px-8 md:pb-16 md:pt-9">{children}</div>
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-ink-950/90 pt-1.5 backdrop-blur-2xl md:hidden">
        <div className="flex items-stretch justify-around px-1">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5"
              >
                <item.icon size={19} className={active ? 'text-mint-300' : 'text-slate-500'} strokeWidth={active ? 2.4 : 1.9} />
                <span className={cn('text-[10px] font-semibold tracking-tight', active ? 'text-mint-200' : 'text-slate-500')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
