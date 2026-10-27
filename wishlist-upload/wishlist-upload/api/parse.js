// Vercel 서버리스 함수: GET /api/parse?url=...
import { parseUrl } from '../lib/parse.js';

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x').searchParams.get('url');
  try {
    const result = await parseUrl(url);
    res.statusCode = result.ok ? 200 : 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(result));
  } catch {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: '상품 정보를 가져오지 못했어요' }));
  }
}
