import { promises as fs } from 'fs';
import path from 'path';
import { PLATFORM_IDS } from './platforms/meta';
import type { AccountConfig, ActivityEvent, Database, MediaAsset, PlatformId, Post, Settings } from './types';
import { DEFAULT_TZ } from './time';
import { uid } from './utils';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'db.json');

function accounts(): Record<PlatformId, AccountConfig> {
  return PLATFORM_IDS.reduce((acc, id) => {
    acc[id] = { connected: false };
    return acc;
  }, {} as Record<PlatformId, AccountConfig>);
}

export const DEFAULT_SETTINGS: Settings = {
  geminiApiKey: '',
  geminiModel: 'gemini-3.8-flash',
  pexelsApiKey: '',
  unsplashAccessKey: '',
  timezone: DEFAULT_TZ,
  language: 'english',
  brand: {
    name: 'Northern Trails',
    voice: 'warm, adventurous, premium',
    audience: 'travellers planning a trip to northern Pakistan',
    cta: 'Save this for your winter trip and follow for more.',
    website: '',
    emojis: true,
  },
  defaultPlatforms: ['facebook', 'instagram'],
  hashtagCount: 12,
  livePublishing: false,
  approvalRequired: true,
  accounts: accounts(),
};

type StoreGlobal = typeof globalThis & {
  __summitDb?: Database;
  __summitDbQueue?: Promise<unknown>;
};
const store = globalThis as StoreGlobal;

function emptyDb(): Database {
  return { version: 1, posts: [], media: [], settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), activity: [] };
}

function mergeDb(raw: Partial<Database> | null): Database {
  const base = emptyDb();
  if (!raw) return base;
  return {
    version: 1,
    posts: Array.isArray(raw.posts) ? raw.posts : [],
    media: Array.isArray(raw.media) ? raw.media : [],
    activity: Array.isArray(raw.activity) ? raw.activity.slice(0, 200) : [],
    settings: {
      ...base.settings,
      ...(raw.settings ?? {}),
      brand: { ...base.settings.brand, ...(raw.settings?.brand ?? {}) },
      accounts: { ...base.settings.accounts, ...(raw.settings?.accounts ?? {}) },
    },
  };
}

export async function getDb(): Promise<Database> {
  if (store.__summitDb) return store.__summitDb;
  await fs.mkdir(DB_DIR, { recursive: true });
  try {
    const text = await fs.readFile(DB_PATH, 'utf8');
    store.__summitDb = mergeDb(JSON.parse(text) as Partial<Database>);
  } catch {
    store.__summitDb = emptyDb();
    await writeDb(store.__summitDb);
  }
  return store.__summitDb;
}

async function writeDb(db: Database): Promise<void> {
  await fs.mkdir(DB_DIR, { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(tmp, DB_PATH);
}

export async function mutate<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const previous = store.__summitDbQueue ?? Promise.resolve();
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  store.__summitDbQueue = previous.then(() => gate);
  await previous;
  try {
    const db = await getDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  } finally {
    release();
  }
}

export async function listPosts(): Promise<Post[]> {
  const db = await getDb();
  return [...db.posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPost(id: string): Promise<Post | null> {
  const db = await getDb();
  return db.posts.find((p) => p.id === id) ?? null;
}

export async function createPost(input: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): Promise<Post> {
  return mutate((db) => {
    const now = new Date().toISOString();
    const post: Post = { ...input, id: uid('post'), createdAt: now, updatedAt: now };
    db.posts.unshift(post);
    return post;
  });
}

export async function updatePost(id: string, patch: Partial<Post>): Promise<Post | null> {
  return mutate((db) => {
    const index = db.posts.findIndex((p) => p.id === id);
    if (index === -1) return null;
    const next: Post = { ...db.posts[index], ...patch, id, updatedAt: new Date().toISOString() };
    db.posts[index] = next;
    return next;
  });
}

export async function deletePost(id: string): Promise<boolean> {
  return mutate((db) => {
    const before = db.posts.length;
    db.posts = db.posts.filter((p) => p.id !== id);
    return db.posts.length !== before;
  });
}

export async function listMedia(): Promise<MediaAsset[]> {
  const db = await getDb();
  return [...db.media].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export async function addMedia(asset: MediaAsset): Promise<MediaAsset> {
  return mutate((db) => {
    db.media = [asset, ...db.media.filter((m) => m.url !== asset.url)].slice(0, 300);
    return asset;
  });
}

export async function deleteMedia(id: string): Promise<boolean> {
  return mutate((db) => {
    const found = db.media.find((m) => m.id === id);
    db.media = db.media.filter((m) => m.id !== id);
    return Boolean(found);
  });
}

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  return db.settings;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  return mutate((db) => {
    db.settings = {
      ...db.settings,
      ...patch,
      brand: { ...db.settings.brand, ...(patch.brand ?? {}) },
      accounts: { ...db.settings.accounts, ...(patch.accounts ?? {}) },
    };
    return db.settings;
  });
}

export async function logActivity(event: Omit<ActivityEvent, 'id' | 'at'>): Promise<void> {
  await mutate((db) => {
    db.activity = [{ ...event, id: uid('act'), at: new Date().toISOString() }, ...db.activity].slice(0, 200);
  });
}

export function resolveKeys(settings: Settings) {
  return {
    gemini: (process.env.GEMINI_API_KEY || settings.geminiApiKey || '').trim(),
    pexels: (process.env.PEXELS_API_KEY || settings.pexelsApiKey || '').trim(),
    unsplash: (process.env.UNSPLASH_ACCESS_KEY || settings.unsplashAccessKey || '').trim(),
  };
}
