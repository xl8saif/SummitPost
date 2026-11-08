'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
interface ToastItem { id: number; message: string; tone: Tone }
interface ToastApi { push: (message: string, tone?: Tone) => void }

const ToastContext = createContext<ToastApi>({ push: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: Tone = 'info') => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, tone }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4200);
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-8">
        {items.map((item) => (
          <div
            key={item.id}
            className="animate-rise flex w-full max-w-md items-start gap-2.5 rounded-2xl border border-white/10 bg-ink-850/95 px-4 py-3 text-sm shadow-card backdrop-blur-xl"
          >
            {item.tone === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-mint-400" />
              : item.tone === 'error' ? <TriangleAlert size={18} className="mt-0.5 shrink-0 text-rose-400" />
              : <Info size={18} className="mt-0.5 shrink-0 text-sky2-400" />}
            <p className="flex-1 leading-snug text-slate-100">{item.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
              className="rounded-lg p-1 text-slate-500 hover:text-slate-200"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
