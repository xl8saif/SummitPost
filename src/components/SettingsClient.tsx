'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Save, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/client';
import { PLATFORMS, PLATFORM_IDS } from '@/lib/platforms/meta';
import type { AccountConfig, Language, PlatformId, Settings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ConnectionEditor } from './ConnectionEditor';
import { useToast } from './Toast';
import { Toggle } from './ui';

type SafeSettings = Omit<Settings, 'geminiApiKey' | 'pexelsApiKey' | 'unsplashAccessKey'> & {
  keyStatus: { gemini: boolean; pexels: boolean; unsplash: boolean };
};

const ZONES = ['Asia/Karachi', 'Asia/Dubai', 'Asia/Kolkata', 'Europe/London', 'America/New_York', 'UTC'];
const LANGS: Array<{ id: Language; label: string }> = [
  { id: 'english', label: 'English' },
  { id: 'roman-urdu', label: 'Roman Urdu' },
  { id: 'urdu', label: 'اردو' },
];

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-3.5">
      <h2 className="font-display text-[13.5px] font-bold text-white">{title}</h2>
      {hint ? <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{hint}</p> : null}
      <div className="mt-3 space-y-2.5">{children}</div>
    </section>
  );
}

export function SettingsClient() {
  const toast = useToast();
  const [settings, setSettings] = useState<SafeSettings | null>(null);
  const [envKeys, setEnvKeys] = useState({ gemini: false, pexels: false, unsplash: false });
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [form, setForm] = useState({ geminiKey: '', pexelsKey: '', unsplashKey: '', name: '', voice: '', audience: '', cta: '', website: '' });

  useEffect(() => {
    api<{ settings: SafeSettings; envKeys: typeof envKeys }>('/api/settings')
      .then((data) => {
        setSettings(data.settings);
        setEnvKeys(data.envKeys);
        setForm((current) => ({ ...current, name: data.settings.brand.name, voice: data.settings.brand.voice, audience: data.settings.brand.audience, cta: data.settings.brand.cta, website: data.settings.brand.website }));
      })
      .catch(() => toast.push('Could not load settings', 'error'));
  }, [toast]);

  const save = async (patch: Partial<Settings>, keepForm = false) => {
    setSaving(true);
    try {
      const data = await api<{ settings: SafeSettings }>('/api/settings', { method: 'PATCH', body: JSON.stringify(patch) });
      setSettings(data.settings);
      if (!keepForm) setForm((current) => ({ ...current, geminiKey: '', pexelsKey: '', unsplashKey: '' }));
      toast.push('Saved', 'success');
    } catch (error) {
      toast.push(error instanceof Error ? error.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveAll = () => {
    if (!settings) return;
    const patch: Partial<Settings> = { brand: { ...settings.brand, name: form.name, voice: form.voice, audience: form.audience, cta: form.cta, website: form.website } };
    if (form.geminiKey.trim()) patch.geminiApiKey = form.geminiKey.trim();
    if (form.pexelsKey.trim()) patch.pexelsApiKey = form.pexelsKey.trim();
    if (form.unsplashKey.trim()) patch.unsplashAccessKey = form.unsplashKey.trim();
    save(patch);
  };

  const saveAccount = async (id: PlatformId, patch: Partial<AccountConfig>) => {
    if (!settings) return;
    setSavingId(id);
    await save({ accounts: { [id]: { ...settings.accounts[id], ...patch } } as Settings['accounts'] }, true);
    setSavingId('');
  };

  if (!settings) return <div className="card h-64 skeleton" />;

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">Settings</h1>
          <p className="mt-1 text-[12.5px] text-slate-500">Keys, brand voice, defaults and connections.</p>
        </div>
        <button type="button" onClick={saveAll} disabled={saving} className="btn btn-primary"><Save size={14} /> Save</button>
      </header>

      <Section title="API keys" hint="Stored in data/db.json on this machine. Env vars win if both are set.">
        <label className="block">
          <span className="label">Gemini API key {settings.keyStatus.gemini || envKeys.gemini ? '· connected' : '· optional'}</span>
          <input type="password" value={form.geminiKey} onChange={(e) => setForm({ ...form, geminiKey: e.target.value })} autoComplete="off"
            placeholder={settings.keyStatus.gemini || envKeys.gemini ? 'Saved — paste a new key to replace' : 'AIza…'} className="input !text-[12px]" />
        </label>
        <label className="block">
          <span className="label">Gemini model</span>
          <select value={settings.geminiModel} onChange={(e) => save({ geminiModel: e.target.value }, true)} className="input !text-[12px]">
            <option value="gemini-3.8-flash">gemini-3.8-flash — free tier, default</option>
            <option value="gemini-3.6-flash">gemini-3.6-flash — free tier</option>
            <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite — fastest</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Pexels key {settings.keyStatus.pexels || envKeys.pexels ? '· connected' : ''}</span>
          <input type="password" value={form.pexelsKey} onChange={(e) => setForm({ ...form, pexelsKey: e.target.value })} autoComplete="off" placeholder="Pexels API key" className="input !text-[12px]" />
        </label>
        <label className="block">
          <span className="label">Unsplash key {settings.keyStatus.unsplash || envKeys.unsplash ? '· connected' : ''}</span>
          <input type="password" value={form.unsplashKey} onChange={(e) => setForm({ ...form, unsplashKey: e.target.value })} autoComplete="off" placeholder="Unsplash Client-ID" className="input !text-[12px]" />
        </label>
      </Section>

      <Section title="Brand voice" hint="Every caption, hook and CTA is written in this voice.">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block"><span className="label">Brand name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input !text-[12px]" /></label>
          <label className="block"><span className="label">Website</span>
            <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" className="input !text-[12px]" /></label>
        </div>
        <label className="block"><span className="label">Voice</span>
          <textarea value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })} rows={2} className="input !text-[12px]" /></label>
        <label className="block"><span className="label">Audience</span>
          <textarea value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} rows={2} className="input !text-[12px]" /></label>
        <label className="block"><span className="label">Default call to action</span>
          <input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} className="input !text-[12px]" /></label>
        <Toggle checked={settings.brand.emojis} onChange={(value) => save({ brand: { ...settings.brand, emojis: value } }, true)} label="Tasteful emoji" hint="Off for a strictly corporate tone." />
      </Section>

      <Section title="Defaults" hint="Applied to every new draft unless your command says otherwise.">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block"><span className="label">Timezone</span>
            <select value={settings.timezone} onChange={(e) => save({ timezone: e.target.value }, true)} className="input !text-[12px]">
              {ZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </select></label>
          <label className="block"><span className="label">Language</span>
            <select value={settings.language} onChange={(e) => save({ language: e.target.value as Language }, true)} className="input !text-[12px]">
              {LANGS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select></label>
        </div>
        <label className="block"><span className="label">Hashtags per post · {settings.hashtagCount}</span>
          <input type="range" min={0} max={20} value={settings.hashtagCount} onChange={(e) => save({ hashtagCount: Number(e.target.value) }, true)} className="w-full accent-emerald-400" /></label>
        <div>
          <span className="label">Default networks</span>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORM_IDS.map((id) => {
              const on = settings.defaultPlatforms.includes(id);
              return (
                <button key={id} type="button" className={cn('chip', on && 'chip-on')}
                  onClick={() => save({ defaultPlatforms: on ? settings.defaultPlatforms.filter((p) => p !== id) : [...settings.defaultPlatforms, id] }, true)}>
                  {PLATFORMS[id].short}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section title="Publishing" hint="Live mode is off by default so nothing leaves this machine by accident.">
        <Toggle checked={settings.livePublishing} onChange={(value) => save({ livePublishing: value }, true)} label="Live publishing"
          hint="Off = every publish is recorded as simulated. On = posts go to connected accounts for real." />
        <Toggle checked={settings.approvalRequired} onChange={(value) => save({ approvalRequired: value }, true)} label="Require approval first"
          hint="New drafts wait in the queue until you press Approve & publish." />
        <div className="flex gap-2 rounded-xl border border-amber2-400/25 bg-amber2-400/[0.07] p-2.5">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber2-300" />
          <p className="text-[11px] leading-snug text-amber2-100/85">
            Tokens and keys sit in an unencrypted local JSON file. Single-user studio only — production needs a database, OAuth apps and encrypted secrets.
            Meta, TikTok and Google also need public HTTPS media, so local uploads publish there as simulated.
          </p>
        </div>
      </Section>

      <Section title="Network connections" hint="Copy the fields from each platform's developer console. A network is only used when it is connected here and live mode is on.">
        <div className="space-y-2">
          {PLATFORM_IDS.map((id) => (
            <ConnectionEditor key={id} platform={PLATFORMS[id]} account={settings.accounts[id]} saving={savingId === id} onSave={(patch) => saveAccount(id, patch)} />
          ))}
        </div>
      </Section>

      <p className="flex items-center gap-1.5 pb-2 text-[10.5px] text-slate-600">
        <KeyRound size={11} /> Keys are read only by the server routes, never sent to the browser.
      </p>
    </div>
  );
}
