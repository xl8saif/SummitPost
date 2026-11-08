import { promises as fs } from 'fs';
import path from 'path';
import { PLATFORMS } from './platforms/meta';
import type { MediaAsset, PlatformId, Post, PublishResult, Settings } from './types';

interface Ctx {
  post: Post;
  settings: Settings;
  caption: string;
  hashtags: string[];
  media: MediaAsset[];
  account: Settings['accounts'][PlatformId];
}

function now(): string {
  return new Date().toISOString();
}

function simulated(platform: PlatformId, reason: string): PublishResult {
  return {
    platform,
    status: 'simulated',
    message: reason,
    at: now(),
  };
}

function failed(platform: PlatformId, message: string): PublishResult {
  return { platform, status: 'error', message, at: now() };
}

function buildFullCaption(ctx: Ctx): string {
  const tagLine = ctx.hashtags.map((t) => `#${t}`).join(' ');
  return [ctx.caption.trim(), tagLine].filter(Boolean).join('\n\n');
}

function isPublic(url: string): boolean {
  return /^https:\/\//i.test(url);
}

async function readLocalFile(url: string): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!url.startsWith('/')) return null;
  const clean = url.split('?')[0].replace(/^\//, '');
  const filePath = path.join(process.cwd(), 'public', clean);
  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.mp4' ? 'video/mp4' : ext === '.webm' ? 'video/webm' : ext === '.mov' ? 'video/quicktime'
      : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return { buffer, mime };
  } catch {
    return null;
  }
}

function graphBase(): string {
  return 'https://graph.facebook.com/v21.0';
}

async function postJson<T>(url: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data, text };
}

function graphError(text: string): string {
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } };
    return parsed.error?.message ?? text.slice(0, 220);
  } catch {
    return text.slice(0, 220);
  }
}

async function publishFacebook(ctx: Ctx): Promise<PublishResult> {
  const { pageId, accessToken } = ctx.account;
  if (!pageId || !accessToken) return failed('facebook', 'Add a Page ID and Page access token in Settings.');
  const image = ctx.media.find((m) => m.type === 'image');
  const video = ctx.media.find((m) => m.type === 'video');
  const caption = buildFullCaption(ctx);

  if (video) {
    if (!isPublic(video.url)) return failed('facebook', 'Facebook needs the video on a public HTTPS URL (stock media works, local uploads do not).');
    const res = await postJson<{ id?: string; error?: { message?: string } }>(
      `${graphBase()}/${pageId}/videos`,
      { file_url: video.url, description: caption, access_token: accessToken },
    );
    if (!res.ok) return failed('facebook', graphError(res.text));
    return { platform: 'facebook', status: 'published', externalId: res.data?.id, message: 'Video posted to the Page.', at: now(), permalink: res.data?.id ? `https://facebook.com/${res.data.id}` : undefined };
  }

  if (image) {
    if (!isPublic(image.url)) return failed('facebook', 'Facebook needs an image on a public HTTPS URL for URL-based publishing.');
    const res = await postJson<{ id?: string; post_id?: string }>(
      `${graphBase()}/${pageId}/photos`,
      { url: image.url, caption, access_token: accessToken },
    );
    if (!res.ok) return failed('facebook', graphError(res.text));
    const id = res.data?.post_id ?? res.data?.id;
    return { platform: 'facebook', status: 'published', externalId: id, message: 'Photo posted to the Page.', at: now(), permalink: id ? `https://facebook.com/${id}` : undefined };
  }

  const res = await postJson<{ id?: string }>(`${graphBase()}/${pageId}/feed`, { message: caption, access_token: accessToken });
  if (!res.ok) return failed('facebook', graphError(res.text));
  return { platform: 'facebook', status: 'published', externalId: res.data?.id, message: 'Text post published.', at: now() };
}

async function publishInstagram(ctx: Ctx): Promise<PublishResult> {
  const { accountId, accessToken } = ctx.account;
  if (!accountId || !accessToken) return failed('instagram', 'Add an Instagram user ID and access token in Settings.');
  const asset = ctx.media[0];
  if (!asset) return failed('instagram', 'Instagram needs an image or video.');
  if (!isPublic(asset.url)) return failed('instagram', 'Instagram requires public HTTPS media — use stock media or host the upload.');
  const caption = buildFullCaption(ctx);

  const containerBody: Record<string, unknown> = asset.type === 'video'
    ? { media_type: 'REELS', video_url: asset.url, caption, share_to_feed: true, access_token: accessToken }
    : { image_url: asset.url, caption, access_token: accessToken };

  const container = await postJson<{ id?: string }>(`${graphBase()}/${accountId}/media`, containerBody);
  if (!container.ok || !container.data?.id) return failed('instagram', graphError(container.text));

  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (asset.type === 'image' && attempt === 0) break;
    const statusRes = await fetch(`${graphBase()}/${container.data.id}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`);
    const statusJson = (await statusRes.json().catch(() => ({}))) as { status_code?: string };
    if (statusJson.status_code === 'FINISHED') break;
    if (statusJson.status_code === 'ERROR') return failed('instagram', 'Instagram rejected the media container.');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const published = await postJson<{ id?: string }>(`${graphBase()}/${accountId}/media_publish`, {
    creation_id: container.data.id,
    access_token: accessToken,
  });
  if (!published.ok) return failed('instagram', graphError(published.text));
  return {
    platform: 'instagram',
    status: 'published',
    externalId: published.data?.id,
    message: 'Container published to Instagram.',
    at: now(),
  };
}

async function publishLinkedIn(ctx: Ctx): Promise<PublishResult> {
  const { accountId, accessToken } = ctx.account;
  if (!accountId || !accessToken) return failed('linkedin', 'Add an author URN and access token in Settings.');
  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202411',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: accountId,
      commentary: buildFullCaption(ctx).slice(0, 2900),
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  });
  const text = await res.text();
  if (!res.ok) return failed('linkedin', text.slice(0, 220) || `HTTP ${res.status}`);
  return {
    platform: 'linkedin', status: 'published',
    externalId: res.headers.get('x-restli-id') ?? ctx.post.id,
    message: 'Post shared on LinkedIn.', at: now(),
  };
}

async function publishX(ctx: Ctx): Promise<PublishResult> {
  const { accessToken } = ctx.account;
  if (!accessToken) return failed('x', 'Add an OAuth 2.0 user token in Settings.');
  let text = buildFullCaption(ctx);
  if (text.length > 280) text = `${text.slice(0, 279).trimEnd()}…`;
  const res = await postJson<{ data?: { id?: string }; detail?: string }>(
    'https://api.x.com/2/tweets', { text }, { Authorization: `Bearer ${accessToken}` },
  );
  if (!res.ok) return failed('x', res.data?.detail ?? res.text.slice(0, 220));
  const id = res.data?.data?.id;
  return {
    platform: 'x', status: 'published', externalId: id,
    message: 'Post published to X.', at: now(),
    permalink: id ? `https://x.com/i/web/status/${id}` : undefined,
  };
}

async function publishTikTok(ctx: Ctx): Promise<PublishResult> {
  const { accessToken } = ctx.account;
  if (!accessToken) return failed('tiktok', 'Add a TikTok access token in Settings.');
  const video = ctx.media.find((m) => m.type === 'video');
  if (!video) return failed('tiktok', 'TikTok needs a video.');
  if (!isPublic(video.url)) return failed('tiktok', 'TikTok pulls video from a public HTTPS URL — local uploads cannot be sent.');
  const res = await postJson<{ data?: { publish_id?: string }; error?: { message?: string } }>(
    'https://open.tiktokapis.com/v2/post/publish/video/init/',
    {
      post_info: { title: buildFullCaption(ctx).slice(0, 2200), privacy_level: 'SELF_ONLY' },
      source_info: { source: 'PULL_FROM_URL', video_url: video.url },
    },
    { Authorization: `Bearer ${accessToken}` },
  );
  if (!res.ok) return failed('tiktok', res.data?.error?.message ?? res.text.slice(0, 220));
  return {
    platform: 'tiktok', status: 'published', externalId: res.data?.data?.publish_id,
    message: 'Upload accepted by TikTok (SELF_ONLY privacy until reviewed).', at: now(),
  };
}

async function publishYouTube(ctx: Ctx): Promise<PublishResult> {
  const { accessToken } = ctx.account;
  if (!accessToken) return failed('youtube', 'Add a YouTube OAuth token in Settings.');
  const video = ctx.media.find((m) => m.type === 'video');
  if (!video) return failed('youtube', 'YouTube needs a video file.');
  let buffer: Buffer;
  let mime = 'video/mp4';
  if (isPublic(video.url)) {
    const res = await fetch(video.url);
    if (!res.ok) return failed('youtube', `Could not download the video (HTTP ${res.status}).`);
    buffer = Buffer.from(await res.arrayBuffer());
    mime = res.headers.get('content-type') ?? mime;
  } else {
    const local = await readLocalFile(video.url);
    if (!local) return failed('youtube', 'Uploaded video missing on disk.');
    buffer = local.buffer;
    mime = local.mime;
  }

  const boundary = `summitpost_${Date.now()}`;
  const metadata = {
    snippet: {
      title: (ctx.post.title || 'SummitPost video').slice(0, 100),
      description: buildFullCaption(ctx).slice(0, 4900),
      categoryId: '22',
    },
    status: { privacyStatus: 'private', selfDeclaredMadeForKids: false },
  };
  const head = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([head, buffer, tail]);

  const res = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!res.ok) return failed('youtube', json.error?.message ?? `HTTP ${res.status}`);
  return {
    platform: 'youtube', status: 'published', externalId: json.id,
    message: 'Video uploaded privately to YouTube.', at: now(),
    permalink: json.id ? `https://youtu.be/${json.id}` : undefined,
  };
}

async function publishPinterest(ctx: Ctx): Promise<PublishResult> {
  const { accessToken, boardId } = ctx.account;
  if (!accessToken || !boardId) return failed('pinterest', 'Add a board ID and access token in Settings.');
  const asset = ctx.media.find((m) => m.type === 'image') ?? ctx.media[0];
  if (!asset) return failed('pinterest', 'Pinterest needs an image or video.');
  const res = await postJson<{ id?: string; message?: string }>(
    'https://api.pinterest.com/v5/pins',
    {
      board_id: boardId,
      title: (ctx.post.title || ctx.caption.slice(0, 90)).slice(0, 100),
      description: buildFullCaption(ctx).slice(0, 500),
      media_source: { source_type: 'image_url', url: asset.url },
    },
    { Authorization: `Bearer ${accessToken}` },
  );
  if (!res.ok) return failed('pinterest', res.data?.message ?? res.text.slice(0, 220));
  return {
    platform: 'pinterest', status: 'published', externalId: res.data?.id,
    message: 'Pin created.', at: now(),
    permalink: res.data?.id ? `https://pinterest.com/pin/${res.data.id}` : undefined,
  };
}

export async function publishPost(post: Post, settings: Settings): Promise<{ results: PublishResult[]; status: Post['status'] }> {
  const results: PublishResult[] = [];

  for (const platform of post.platforms) {
    const variant = post.variants[platform] ?? { caption: post.caption, hashtags: post.hashtags };
    const account = settings.accounts[platform];
    const ctx: Ctx = {
      post, settings,
      caption: variant.caption || post.caption,
      hashtags: variant.hashtags ?? post.hashtags,
      media: post.media,
      account,
    };

    if (!settings.livePublishing) {
      results.push(simulated(platform, 'Simulated — Live publishing is off in Settings, so nothing left the app.'));
      continue;
    }
    if (!account?.connected || !account.accessToken) {
      results.push(simulated(platform, `Simulated — connect ${PLATFORMS[platform].name} in Settings to publish for real.`));
      continue;
    }

    try {
      switch (platform) {
        case 'facebook': results.push(await publishFacebook(ctx)); break;
        case 'instagram': results.push(await publishInstagram(ctx)); break;
        case 'linkedin': results.push(await publishLinkedIn(ctx)); break;
        case 'x': results.push(await publishX(ctx)); break;
        case 'tiktok': results.push(await publishTikTok(ctx)); break;
        case 'youtube': results.push(await publishYouTube(ctx)); break;
        case 'pinterest': results.push(await publishPinterest(ctx)); break;
        default: results.push(failed(platform, 'Unsupported network.'));
      }
    } catch (error) {
      results.push(failed(platform, error instanceof Error ? error.message : 'Unexpected publishing error'));
    }
  }

  const errors = results.filter((r) => r.status === 'error').length;
  const ok = results.filter((r) => r.status === 'published' || r.status === 'simulated').length;
  const status: Post['status'] = errors === 0 ? 'published' : ok > 0 ? 'partial' : 'failed';
  return { results, status };
}
