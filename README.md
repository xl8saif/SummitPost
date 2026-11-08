# SummitPost

A one-command social publishing studio. Type a sentence, get a finished post — copy, media,
hashtags, SEO score, per-network previews — then approve it or schedule it across seven networks.

```
post on facebook and instagram about winter tourism in the north of pakistan, schedule tomorrow 9am
```

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

No keys are required. Without a Gemini key a built-in copy engine writes the post; without stock
keys a branded placeholder visual stands in, so the whole flow works offline.

## What one command becomes

1. **Parse** — platforms, topic, media type, tone, language and schedule time (`tomorrow 9am`,
   `in 2 hours`, `friday 6pm`, `2026-11-20 10:00`).
2. **Write** — Gemini (`gemini-3.8-flash`, falling back to 3.6 Flash and 3.5 Flash-Lite) writes the hook, body
   and CTA, then per-network variants trimmed to each limit (X 280, IG 2200, Pinterest 500…).
3. **Find media** — Pexels and Unsplash photos and videos, with credit and alt text, or your upload.
4. **Hashtags + keywords** — per-network ideal counts, duplicates removed.
5. **Score SEO** 0–100 with pass/warn/fail checks: keyword in hook, length vs. limit, hashtag count,
   relevance and duplicates, CTA, readability, emoji balance, alt text, media present.
6. **Preview and ship** — exact per-network previews, then *Approve & publish* or *Schedule*.

## Screens

| Route | Purpose |
| --- | --- |
| `/` | Studio: command bar, parsed plan, draft editor, SEO panel, live preview |
| `/queue` | Needs approval / scheduled / published / failed / drafts, publish now, reschedule, delete |
| `/calendar` | Month grid with per-day detail |
| `/media` | Stock search (photos + videos), upload, reusable library |
| `/settings` | Keys, brand voice, defaults, per-network credentials, live publishing switch |

Installable as a PWA (`public/manifest.webmanifest` + `public/sw.js`). The service worker registers
only in a production build: `npm run build && npm start`, then open it on your phone and choose
*Add to Home Screen*.

## Keys

Set them in `/settings` or as env vars (env wins). See `.env.example`.

| Variable | Unlocks |
| --- | --- |
| `GEMINI_API_KEY` | AI-written copy and hashtags |
| `PEXELS_API_KEY` | Photo and video search |
| `UNSPLASH_ACCESS_KEY` | Additional photo search |

## Publishing

**Live publishing is off by default.** Each network is only used when it is connected in Settings
*and* live mode is on; otherwise the run is recorded as a clearly labelled **simulated** publish,
so you can exercise approval, scheduling and retries today.

Real adapters: Facebook Pages (`/feed`, `/photos`, `/videos`), Instagram (container → publish),
LinkedIn (posts API), X v2 (tweets, media upload), TikTok (content posting init), YouTube
(resumable `videos.insert`), Pinterest (pin create).

| Network | You need |
| --- | --- |
| Facebook | Meta app, Page access token with `pages_manage_posts`, Page ID |
| Instagram | IG Business account + linked Page, `instagram_content_publish`, IG user ID |
| LinkedIn | App with `w_member_social`, author URN |
| X | Developer project, OAuth 2.0 **user** token with `tweet.write` |
| TikTok | App with `video.publish`, Open ID |
| YouTube | Google Cloud project, YouTube Data API v3, OAuth `youtube.upload` |
| Pinterest | App with `pins:write`, board ID |

Scheduling runs every 20 seconds inside the server (`src/instrumentation.ts` → `startScheduler`).
`GET /api/cron` runs the same sweep on demand (cron, uptime pinger or manual tick).

## Honest constraints

- Meta, TikTok and Google require **public HTTPS media**. Local uploads live in `public/uploads`
  and are not publicly reachable, so they publish those networks as simulated with a reason.
  Stock media is already public. Run behind a public URL for real Meta/TikTok/Google posts.
- Each platform needs its own developer app and, often, review. The app names the exact missing
  field instead of failing silently.
- Keys and tokens are stored in `data/db.json` — plain text, not committed, **not encrypted**.
  v1 is a single-user local studio. Production path: a real database, OAuth per platform, encrypted
  token storage, per-user isolation and signed webhooks.
- Analytics are computed from local publish records; they are not fetched from the networks.

## Architecture

```
src/lib/
  parser.ts        command -> plan (platforms, topic, tone, schedule)
  writer.ts        offline copy engine + hashtag bank
  gemini.ts        Gemini client with model fallback
  compose.ts       plan -> draft (copy + media + hashtags + SEO)
  seo.ts           weighted checks and score
  images.ts        Pexels/Unsplash search, placeholder fallback
  publishers.ts    seven real adapters + simulated publish
  scheduler.ts     due-post sweep
  store.ts         mutexed JSON store (data/db.json)
src/app/api/       generate, images, upload, media, placeholder, posts,
                   posts/[id], posts/[id]/publish, cron, analytics, settings
```

## Checks

```bash
npm run typecheck
npm run build
```
