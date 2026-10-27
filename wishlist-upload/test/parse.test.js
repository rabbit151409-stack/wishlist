import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHtml, validateUrl, toPrice } from '../lib/parse.js';
import {
  clockLabel,
  deductionRate,
  durationLabel,
  needSeconds,
  wageFromIncome,
  wageFromMonthly,
} from '../src/calc.js';

test('Open Graph 태그에서 상품 정보를 읽는다', () => {
  const html = `<html><head>
    <meta property="og:title" content="무선 이어폰 &amp; 케이스">
    <meta property="og:image" content="/img/a.jpg">
    <meta property="product:price:amount" content="299000">
    <meta property="og:site_name" content="테스트몰">
  </head></html>`;
  assert.deepEqual(parseHtml(html, 'https://shop.example.com/p/1'), {
    title: '무선 이어폰 & 케이스',
    imageUrl: 'https://shop.example.com/img/a.jpg',
    price: 299000,
    shop: '테스트몰',
  });
});

test('가격이 메타 태그에 없으면 JSON-LD에서 찾는다', () => {
  const html = `<title>키보드</title><script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[{"@type":"Product","name":"기계식 키보드","image":["https://x.com/k.png"],"offers":{"@type":"Offer","price":"129,000"}}]}
  </script>`;
  const r = parseHtml(html, 'https://www.x.com/k');
  assert.equal(r.title, '기계식 키보드');
  assert.equal(r.price, 129000);
  assert.equal(r.imageUrl, 'https://x.com/k.png');
  assert.equal(r.shop, 'x.com');
});

test('정보가 없으면 가격은 null', () => {
  assert.equal(parseHtml('<title>빈 페이지</title>', 'https://a.com').price, null);
});

test('내부망·잘못된 링크는 막는다', () => {
  assert.equal(validateUrl('http://localhost:3000'), null);
  assert.equal(validateUrl('http://192.168.0.1'), null);
  assert.equal(validateUrl('file:///etc/passwd'), null);
  assert.equal(validateUrl('그냥 글자'), null);
  assert.ok(validateUrl('https://www.coupang.com/vp/products/1'));
});

test('계산 규칙', () => {
  assert.equal(toPrice('₩12,900'), 12900);
  // 초 단위: 299,000원 ÷ (10,320원/3600초) = 104,302.3초 → 올림
  assert.equal(needSeconds(299000, 10320), 104303);
  assert.equal(needSeconds(100000, 12000), 30000);
  assert.equal(durationLabel(104303), '28시간 58분 23초');
  assert.equal(durationLabel(0), '0초');
  assert.equal(durationLabel(3600), '1시간');
  assert.equal(clockLabel(3725), '01:02:05');
  assert.equal(wageFromMonthly(2_200_000), 10526);
});

test('시급·월급·연봉을 세후 시급으로 환산한다', () => {
  assert.equal(wageFromIncome({ type: 'hourly', amount: 12000 }), 12000);
  assert.equal(wageFromIncome({ type: 'monthly', amount: 2_090_000, basis: 'net' }), 10000);
  // 세전 연봉 3,600만 → 공제 약 11.5% → 월 265.5만 ÷ 209
  assert.equal(wageFromIncome({ type: 'annual', amount: 36_000_000, basis: 'gross' }), 12703);
  assert.equal(wageFromIncome({ type: 'annual', amount: 24_000_000, basis: 'net', monthlyHours: 160 }), 12500);
  assert.equal(deductionRate(120_000_000), 0.26);
});
