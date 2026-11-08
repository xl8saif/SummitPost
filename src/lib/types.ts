export type PlatformId =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'x'
  | 'tiktok'
  | 'youtube'
  | 'pinterest';

export type MediaType = 'image' | 'video';

export type PostStatus =
  | 'draft'
  | 'pending_approval'
  | 'scheduled'
  | 'published'
  | 'partial'
  | 'failed';

export type Language = 'english' | 'roman-urdu' | 'urdu';

export interface MediaAsset {
  id: string;
  type: MediaType;
  url: string;
  thumbUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  source: 'pexels' | 'unsplash' | 'upload' | 'placeholder';
  credit?: string;
  creditUrl?: string;
  alt?: string;
  addedAt: string;
}

export interface SeoCheck {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  weight: number;
  points: number;
}

export interface SeoReport {
  score: number;
  grade: 'excellent' | 'good' | 'fair' | 'weak';
  checks: SeoCheck[];
  keywords: string[];
  platform: PlatformId;
  characters: number;
  limit: number;
  hashtagCount: number;
}

export interface PostVariant {
  title?: string;
  caption: string;
  hashtags: string[];
  altText?: string;
}

export type PublishState = 'published' | 'simulated' | 'error' | 'pending';

export interface PublishResult {
  platform: PlatformId;
  status: PublishState;
  externalId?: string;
  permalink?: string;
  message: string;
  at: string;
}

export interface Post {
  id: string;
  createdAt: string;
  updatedAt: string;
  command: string;
  topic: string;
  tone: string;
  language: Language;
  mediaType: MediaType;
  title: string;
  caption: string;
  hashtags: string[];
  media: MediaAsset[];
  platforms: PlatformId[];
  status: PostStatus;
  scheduleAt: string | null;
  timezone: string;
  variants: Partial<Record<PlatformId, PostVariant>>;
  seo: SeoReport;
  keywords: string[];
  imageQuery: string;
  engine: 'gemini' | 'offline';
  results: PublishResult[];
  approvedAt?: string | null;
  publishedAt?: string | null;
  notes?: string;
}

export interface AccountConfig {
  connected: boolean;
  accessToken?: string;
  accountId?: string;
  accountName?: string;
  pageId?: string;
  boardId?: string;
  openId?: string;
  lastCheckedAt?: string;
  note?: string;
}

export interface BrandProfile {
  name: string;
  voice: string;
  audience: string;
  cta: string;
  website: string;
  emojis: boolean;
}

export interface Settings {
  geminiApiKey: string;
  geminiModel: string;
  pexelsApiKey: string;
  unsplashAccessKey: string;
  timezone: string;
  language: Language;
  brand: BrandProfile;
  defaultPlatforms: PlatformId[];
  hashtagCount: number;
  livePublishing: boolean;
  approvalRequired: boolean;
  accounts: Record<PlatformId, AccountConfig>;
}

export interface ActivityEvent {
  id: string;
  at: string;
  type: 'generate' | 'schedule' | 'publish' | 'update' | 'delete' | 'connect' | 'upload';
  message: string;
  postId?: string;
}

export interface Database {
  version: number;
  posts: Post[];
  media: MediaAsset[];
  settings: Settings;
  activity: ActivityEvent[];
}

export interface CommandPlan {
  raw: string;
  topic: string;
  platforms: PlatformId[];
  mediaType: MediaType;
  tone: string;
  language: Language;
  scheduleAt: string | null;
  scheduleLabel: string | null;
  keywords: string[];
  explicitPlatforms: boolean;
}

export interface DraftPayload {
  command: string;
  plan: CommandPlan;
  title: string;
  caption: string;
  hashtags: string[];
  keywords: string[];
  imageQuery: string;
  altText: string;
  variants: Partial<Record<PlatformId, PostVariant>>;
  media: MediaAsset[];
  mediaSuggestions: MediaAsset[];
  engine: 'gemini' | 'offline';
  engineNote: string;
  suggestedScheduleAt: string | null;
  seo: SeoReport;
}
