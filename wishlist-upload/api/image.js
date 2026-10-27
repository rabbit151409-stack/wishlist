// Vercel 서버리스 함수: GET /api/image?url=...
// 쇼핑몰 이미지를 대신 받아 온다. 브라우저에서 직접 받으면 CORS 때문에 누끼를 딸 수 없다.
import { validateUrl } from '../lib/parse.js';

const MAX_BYTES = 8 * 1024 * 1024;

function fail(res, status, error) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: false, error }));
}

export default async function handler(req, res) {
  const url = validateUrl(new URL(req.url, 'http://x').searchParams.get('url'));
  if (!url) return fail(res, 400, '올바른 이미지 링크가 아니에요');
  try {
    const upstream = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SigeupWishBot/0.1)', Referer: url.origin },
    });
    const type = upstream.headers.get('content-type') || '';
    if (!upstream.ok || !type.startsWith('image/')) return fail(res, 502, '이미지를 받지 못했어요');
    const body = Buffer.from(await upstream.arrayBuffer());
    if (body.length > MAX_BYTES) return fail(res, 413, '이미지가 너무 커요');
    res.statusCode = 200;
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(body);
  } catch {
    fail(res, 502, '이미지를 받지 못했어요');
  }
}
