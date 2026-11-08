import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PALETTES: Array<[string, string, string]> = [
  ['#071a2b', '#0d3b4f', '#5eead4'],
  ['#101a33', '#243b6b', '#93c5fd'],
  ['#1a1024', '#3c2350', '#f0abfc'],
  ['#0d1b12', '#1f4530', '#86efac'],
  ['#221408', '#4a2c12', '#fcd34d'],
];

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] ?? c));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = escapeXml((searchParams.get('text') ?? 'Northern Pakistan').slice(0, 56));
  const seed = Number(searchParams.get('seed') ?? '1') || 1;
  const [dark, mid, accent] = PALETTES[seed % PALETTES.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${dark}"/><stop offset="70%" stop-color="${mid}"/><stop offset="100%" stop-color="${dark}"/>
    </linearGradient>
    <linearGradient id="snow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#sky)"/>
  <circle cx="${880 - seed * 40}" cy="200" r="86" fill="${accent}" opacity="0.22"/>
  <path d="M0 640 L230 320 L420 560 L610 250 L820 560 L980 380 L1200 620 L1200 900 L0 900 Z" fill="#0b1524" opacity="0.85"/>
  <path d="M230 320 L300 420 L250 400 L200 430 Z" fill="url(#snow)" opacity="0.9"/>
  <path d="M610 250 L690 380 L630 350 L570 390 Z" fill="url(#snow)" opacity="0.9"/>
  <path d="M980 380 L1040 470 L990 450 L940 480 Z" fill="url(#snow)" opacity="0.8"/>
  <path d="M0 760 L180 640 L360 740 L540 660 L760 790 L960 700 L1200 800 L1200 900 L0 900 Z" fill="#050a12" opacity="0.9"/>
  <text x="72" y="812" font-family="Segoe UI, Inter, sans-serif" font-size="46" font-weight="600" fill="#e6f3ee">${text}</text>
  <text x="72" y="858" font-family="Segoe UI, Inter, sans-serif" font-size="22" fill="${accent}" letter-spacing="4">SUMMITPOST PLACEHOLDER</text>
</svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
