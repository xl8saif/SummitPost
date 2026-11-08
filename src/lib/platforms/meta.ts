import type { MediaType, PlatformId } from '../types';

export interface CredentialField {
  key: 'accessToken' | 'pageId' | 'accountId' | 'accountName' | 'boardId' | 'openId';
  label: string;
  hint: string;
  secret?: boolean;
}

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  short: string;
  limit: number;
  hashtagIdeal: [number, number];
  media: MediaType[];
  supportsText: boolean;
  accent: string;
  gradient: string;
  bestHours: number[];
  docs: string;
  setup: string;
  credentialFields: CredentialField[];
  notes: string[];
}

export const PLATFORMS: Record<PlatformId, PlatformMeta> = {
  facebook: {
    id: 'facebook', name: 'Facebook', short: 'FB', limit: 63206, hashtagIdeal: [3, 8],
    media: ['image', 'video'], supportsText: true, accent: '#1877F2',
    gradient: 'linear-gradient(135deg,#1877F2,#0b4fa8)', bestHours: [9, 13, 19],
    docs: 'https://developers.facebook.com/docs/pages-api/posts',
    setup: 'Meta app -> Page access token -> Page ID',
    credentialFields: [
      { key: 'pageId', label: 'Page ID', hint: 'Numeric ID of the Page' },
      { key: 'accessToken', label: 'Page access token', hint: 'pages_manage_posts scope', secret: true },
      { key: 'accountName', label: 'Page name', hint: 'Shown in the app' },
    ],
    notes: ['Video needs a public HTTPS URL or uploaded source.', 'Native scheduling needs 10+ minutes lead time.'],
  },
  instagram: {
    id: 'instagram', name: 'Instagram', short: 'IG', limit: 2200, hashtagIdeal: [8, 15],
    media: ['image', 'video'], supportsText: false, accent: '#E1306C',
    gradient: 'linear-gradient(135deg,#f9ce34,#ee2a7b 55%,#6228d7)', bestHours: [11, 14, 19],
    docs: 'https://developers.facebook.com/docs/instagram-platform/content-publishing',
    setup: 'IG Business account linked to a Facebook Page',
    credentialFields: [
      { key: 'accountId', label: 'IG user ID', hint: 'ig-user-id from /me/accounts' },
      { key: 'accessToken', label: 'Access token', hint: 'instagram_content_publish', secret: true },
      { key: 'accountName', label: 'Handle', hint: 'e.g. @northern.trails' },
    ],
    notes: ['Media must sit on a public HTTPS URL.', 'Container -> publish flow; carousels take 2-10 items.'],
  },
  linkedin: {
    id: 'linkedin', name: 'LinkedIn', short: 'IN', limit: 3000, hashtagIdeal: [3, 5],
    media: ['image', 'video'], supportsText: true, accent: '#0A66C2',
    gradient: 'linear-gradient(135deg,#0A66C2,#053b73)', bestHours: [8, 12, 17],
    docs: 'https://learn.microsoft.com/linkedin/marketing/community-management/shares/posts-api',
    setup: 'LinkedIn app -> w_member_social -> author URN',
    credentialFields: [
      { key: 'accountId', label: 'Author URN', hint: 'urn:li:person:xxxx' },
      { key: 'accessToken', label: 'OAuth token', hint: 'w_member_social scope', secret: true },
      { key: 'accountName', label: 'Profile / company', hint: 'Shown in the app' },
    ],
    notes: ['Media upload is register -> upload -> finalize.', 'Versioned API headers are set by the adapter.'],
  },
  x: {
    id: 'x', name: 'X (Twitter)', short: 'X', limit: 280, hashtagIdeal: [1, 3],
    media: ['image', 'video'], supportsText: true, accent: '#E7E9EA',
    gradient: 'linear-gradient(135deg,#1d9bf0,#0b3d63)', bestHours: [8, 12, 18],
    docs: 'https://docs.x.com/x-api/posts/creation-of-a-post',
    setup: 'X developer project -> OAuth 2.0 user token',
    credentialFields: [
      { key: 'accessToken', label: 'OAuth 2.0 user token', hint: 'tweet.read + tweet.write', secret: true },
      { key: 'accountName', label: 'Handle', hint: 'e.g. @northern.trails' },
    ],
    notes: ['280 characters is a hard limit.', 'Needs a user-context token, not an app bearer token.'],
  },
  tiktok: {
    id: 'tiktok', name: 'TikTok', short: 'TT', limit: 2200, hashtagIdeal: [3, 6],
    media: ['video', 'image'], supportsText: false, accent: '#25F4EE',
    gradient: 'linear-gradient(135deg,#25F4EE,#FE2C55)', bestHours: [18, 21, 23],
    docs: 'https://developers.tiktok.com/doc/content-posting-api-get-started',
    setup: 'TikTok app -> video.publish scope',
    credentialFields: [
      { key: 'openId', label: 'Open ID', hint: 'Returned by TikTok OAuth' },
      { key: 'accessToken', label: 'Access token', hint: 'video.publish scope', secret: true },
      { key: 'accountName', label: 'Handle', hint: 'e.g. @northern.trails' },
    ],
    notes: ['Audited apps post directly; others upload a draft.', 'Video must be publicly reachable.'],
  },
  youtube: {
    id: 'youtube', name: 'YouTube', short: 'YT', limit: 5000, hashtagIdeal: [3, 5],
    media: ['video'], supportsText: false, accent: '#FF0033',
    gradient: 'linear-gradient(135deg,#FF0033,#7a0018)', bestHours: [15, 18, 20],
    docs: 'https://developers.google.com/youtube/v3/docs/videos/insert',
    setup: 'Google Cloud -> YouTube Data API v3 -> OAuth',
    credentialFields: [
      { key: 'accessToken', label: 'OAuth token', hint: 'youtube.upload scope', secret: true },
      { key: 'accountName', label: 'Channel name', hint: 'Shown in the app' },
    ],
    notes: ['Video-only network; text-only posts are blocked.', 'Large uploads can take minutes.'],
  },
  pinterest: {
    id: 'pinterest', name: 'Pinterest', short: 'PIN', limit: 500, hashtagIdeal: [2, 5],
    media: ['image', 'video'], supportsText: false, accent: '#E60023',
    gradient: 'linear-gradient(135deg,#E60023,#6d0011)', bestHours: [20, 21, 22],
    docs: 'https://developers.pinterest.com/docs/api/v5/pins-create',
    setup: 'Pinterest app -> pins:write -> board ID',
    credentialFields: [
      { key: 'boardId', label: 'Board ID', hint: 'Target board for pins' },
      { key: 'accessToken', label: 'Access token', hint: 'pins:write scope', secret: true },
      { key: 'accountName', label: 'Profile', hint: 'Shown in the app' },
    ],
    notes: ['Needs a title plus a keyword-rich description.', 'Best image ratio is 2:3.'],
  },
};

export const PLATFORM_IDS = Object.keys(PLATFORMS) as PlatformId[];

export const STATUS_META: Record<string, { label: string; tone: 'neutral' | 'amber' | 'sky' | 'mint' | 'rose' }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  pending_approval: { label: 'Needs approval', tone: 'amber' },
  scheduled: { label: 'Scheduled', tone: 'sky' },
  published: { label: 'Published', tone: 'mint' },
  partial: { label: 'Partially published', tone: 'amber' },
  failed: { label: 'Failed', tone: 'rose' },
};
