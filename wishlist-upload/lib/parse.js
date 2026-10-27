// 상품 페이지 HTML에서 상품명·이미지·가격을 뽑는다.
// 순서: Open Graph → 상품 메타 태그 → JSON-LD(schema.org Product)

const BLOCKED_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$)/i;

export function validateUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  if (BLOCKED_HOST.test(url.hostname)) return null;
  return url;
}

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function meta(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${key}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return decode(m[1]);
  }
  return null;
}

export function toPrice(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function findProduct(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const found = findProduct(n);
      if (found) return found;
    }
    return null;
  }
  const type = node['@type'];
  if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) return node;
  if (node['@graph']) return findProduct(node['@graph']);
  return null;
}

function jsonLd(html) {
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, body] of blocks) {
    try {
      const product = findProduct(JSON.parse(body.trim()));
      if (!product) continue;
      const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
      const image = Array.isArray(product.image) ? product.image[0] : product.image;
      return {
        title: product.name || null,
        imageUrl: typeof image === 'string' ? image : image?.url || null,
        price: toPrice(offers?.price ?? offers?.lowPrice),
      };
    } catch {
      // 깨진 JSON-LD는 건너뛴다
    }
  }
  return {};
}

export function parseHtml(html, pageUrl) {
  const ld = jsonLd(html);
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = meta(html, 'og:title') || ld.title || (titleTag ? decode(titleTag[1]) : null);
  let imageUrl = meta(html, 'og:image') || ld.imageUrl || null;
  if (imageUrl) {
    try {
      imageUrl = new URL(imageUrl, pageUrl).href;
    } catch {
      imageUrl = null;
    }
  }
  const price =
    toPrice(meta(html, 'og:price:amount')) ??
    toPrice(meta(html, 'product:price:amount')) ??
    toPrice(meta(html, 'product:price')) ??
    ld.price ??
    null;
  const shop = meta(html, 'og:site_name') || new URL(pageUrl).hostname.replace(/^www\./, '');
  return { title, imageUrl, price, shop };
}

export async function parseUrl(raw) {
  const url = validateUrl(raw);
  if (!url) return { ok: false, error: '올바른 링크가 아니에요' };
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SigeupWishBot/0.1)',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
  });
  if (!res.ok) return { ok: false, error: `페이지를 열 수 없어요 (${res.status})` };
  const html = (await res.text()).slice(0, 2_000_000);
  return { ok: true, url: url.href, ...parseHtml(html, res.url || url.href) };
}
