// 기기(IndexedDB)에만 저장한다. 로그인·서버 DB 없음. 시간은 모두 초 단위.
import Dexie from 'dexie';
import { DEFAULT_SCHEDULE, localDate, needSeconds, workSecondsBetween } from './calc.js';

export const db = new Dexie('sigeup-wish');
db.version(1).stores({
  settings: '&key',
  items: '++id, status, createdAt',
  worklogs: '++id, date, wishItemId',
});
// v2: 시간 단위를 시간 → 초로 바꾼다
db.version(2)
  .stores({
    settings: '&key',
    items: '++id, status, createdAt',
    worklogs: '++id, date, wishItemId',
  })
  .upgrade(async (tx) => {
    await tx.table('items').toCollection().modify((i) => {
      i.savedSeconds = Math.round((i.savedHours || 0) * 3600);
      delete i.savedHours;
    });
    await tx.table('worklogs').toCollection().modify((l) => {
      l.seconds = Math.round((l.hours || 0) * 3600);
      delete l.hours;
    });
    await tx.table('settings').toCollection().modify((s) => {
      s.carrySeconds = Math.round((s.carryHours || 0) * 3600);
      delete s.carryHours;
    });
  });

// status: waiting(대기) · collecting(모으는 중) · achieved(달성) · purchased(구매완료) · gaveup(포기)

const DEFAULTS = {
  key: 'main',
  hourlyWage: 0,
  activeItemId: null,
  carrySeconds: 0,
  workStartedAt: null,
  schedule: DEFAULT_SCHEDULE,
};

export async function getSettings() {
  return { ...DEFAULTS, ...(await db.settings.get('main')) };
}

async function patchSettings(patch) {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch });
}

// workStartedAt: 모으는 상품의 시간을 세기 시작한 시각. 상품을 고르면 자동으로 카운트가 시작되고, 근무시간에만 쌓인다.

// 대기 목록에서 가장 먼저 담은 상품을 이어서 모은다. 이월된 시간이 먼저 쌓이고 카운트는 끊기지 않는다.
// 대기 상품이 없으면 카운트를 멈춘다. 트랜잭션 안에서만 부른다
async function activateNext() {
  const s = await getSettings();
  const [next] = await db.items.where('status').equals('waiting').sortBy('createdAt');
  if (!next) {
    await patchSettings({ activeItemId: null, workStartedAt: null });
    return;
  }
  await db.items.update(next.id, { status: 'collecting', savedSeconds: next.savedSeconds + s.carrySeconds });
  await patchSettings({ activeItemId: next.id, carrySeconds: 0, workStartedAt: s.workStartedAt || Date.now() });
}

// 모으는 상품이 다 찼으면 달성 폴더로 보내고 다음 상품으로 넘어간다.
// 남는 시간이 많으면 여러 개가 연달아 달성될 수 있다. 처음 달성한 상품 id를 돌려준다.
async function settleActive() {
  let first = null;
  for (;;) {
    const s = await getSettings();
    if (!s.activeItemId || !s.hourlyWage) break;
    const item = await db.items.get(s.activeItemId);
    if (!item) break;
    const need = needSeconds(item.price, s.hourlyWage);
    if (item.savedSeconds < need) break;
    await db.items.update(item.id, { savedSeconds: need, status: 'achieved', achievedAt: Date.now() });
    await patchSettings({ activeItemId: null, carrySeconds: s.carrySeconds + item.savedSeconds - need });
    first ??= item.id;
    await activateNext();
  }
  return first;
}

// 지금까지 흐른 시간을 모으는 상품에 쌓는다. 트랜잭션 안에서만 부른다
async function commitClock() {
  const s = await getSettings();
  if (!s.workStartedAt || !s.activeItemId) return;
  // 서울 기준 근무시간(평일 9~18시, 점심 제외)에 해당하는 시간만 쌓는다
  const now = Date.now();
  const work = workSecondsBetween(s.workStartedAt, now, s.schedule);
  const seconds = Math.floor(work);
  if (seconds <= 0) return;
  const item = await db.items.get(s.activeItemId);
  await db.items.update(item.id, { savedSeconds: item.savedSeconds + seconds });
  await db.worklogs.add({ date: localDate(s.workStartedAt), seconds, memo: '', wishItemId: item.id });
  // 1초가 안 되는 나머지는 다음에 이어서 센다
  await patchSettings({ workStartedAt: now - (work - seconds) * 1000 });
}

const ALL = [db.settings, db.items, db.worklogs];

// 흐른 시간을 반영하고, 모으는 상품이 있는데 카운트가 멈춰 있으면 시작한다. 달성한 상품 id를 돌려준다.
export function syncClock() {
  return db.transaction('rw', ALL, async () => {
    await commitClock();
    const achieved = await settleActive();
    const s = await getSettings();
    if (s.activeItemId && !s.workStartedAt) await patchSettings({ workStartedAt: Date.now() });
    return achieved;
  });
}

// income: 사용자가 입력한 원래 소득 정보(시급/월급/연봉, 세전/세후). 설정 화면에 다시 보여준다
export function saveWage(hourlyWage, income) {
  return db.transaction('rw', ALL, async () => {
    await commitClock();
    await patchSettings({ hourlyWage, income: income || { type: 'hourly', amount: hourlyWage, basis: 'net' } });
    return settleActive();
  });
}

// 근무시간을 바꾼다. 지금까지 흐른 시간은 이전 근무시간 기준으로 먼저 쌓아 둔다
export function saveSchedule(schedule) {
  return db.transaction('rw', ALL, async () => {
    await commitClock();
    await patchSettings({ schedule });
    return settleActive();
  });
}

// 모을 상품을 고른다. 이월된 시간이 먼저 쌓이고, 바로 카운트가 시작된다.
export function setActive(id) {
  return db.transaction('rw', ALL, async () => {
    await commitClock();
    const s = await getSettings();
    if (s.activeItemId === id) return null;
    if (s.activeItemId) await db.items.update(s.activeItemId, { status: 'waiting' });
    const item = await db.items.get(id);
    await db.items.update(id, { status: 'collecting', savedSeconds: item.savedSeconds + s.carrySeconds });
    await patchSettings({ activeItemId: id, carrySeconds: 0, workStartedAt: Date.now() });
    return settleActive();
  });
}

// imageUrl: 화면에 보일 이미지(누끼를 땄으면 누끼 이미지), originalImageUrl: 원본 사진
export async function addItem({ url, title, imageUrl, originalImageUrl, cutout, price, shop }) {
  const id = await db.items.add({
    url,
    title,
    imageUrl: imageUrl || null,
    originalImageUrl: originalImageUrl || imageUrl || null,
    cutout: !!cutout,
    price,
    shop: shop || '',
    status: 'waiting',
    savedSeconds: 0,
    createdAt: Date.now(),
  });
  const s = await getSettings();
  const achieved = s.activeItemId ? null : await setActive(id);
  return { id, achieved };
}

export function giveUp(id) {
  return db.transaction('rw', ALL, async () => {
    await commitClock();
    const s = await getSettings();
    const item = await db.items.get(id);
    const wasActive = s.activeItemId === id;
    await db.items.update(id, { status: 'gaveup', savedSeconds: 0 });
    await patchSettings({ carrySeconds: s.carrySeconds + item.savedSeconds });
    if (wasActive) {
      await patchSettings({ activeItemId: null });
      await activateNext();
      return settleActive();
    }
    return null;
  });
}

export const updateImage = (id, { imageUrl, originalImageUrl, cutout }) =>
  db.items.update(id, { imageUrl, originalImageUrl: originalImageUrl || imageUrl, cutout: !!cutout });

export const markPurchased = (id) => db.items.update(id, { status: 'purchased', purchasedAt: Date.now() });

export async function exportData() {
  return {
    app: 'sigeup-wish',
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: await db.settings.toArray(),
    items: await db.items.toArray(),
    worklogs: await db.worklogs.toArray(),
  };
}

export async function importData(data) {
  if (data?.app !== 'sigeup-wish') throw new Error('위시리스트 백업 파일이 아니에요');
  if (data.version !== 2) throw new Error('이 버전의 백업 파일은 불러올 수 없어요');
  await db.transaction('rw', ALL, async () => {
    await Promise.all(ALL.map((t) => t.clear()));
    await db.settings.bulkAdd(data.settings || []);
    await db.items.bulkAdd(data.items || []);
    await db.worklogs.bulkAdd(data.worklogs || []);
  });
}
