// 계산 규칙 (기획서 '데이터 구조와 계산 규칙'). 시간은 모두 초 단위로 다룬다.

export const MONTHLY_HOURS = 209;

// 세전 연봉 → 실수령 비율의 대략치 (4대보험 + 소득세, 부양가족 1인 기준 근사)
const DEDUCTION = [
  [30_000_000, 0.095],
  [40_000_000, 0.115],
  [50_000_000, 0.15],
  [60_000_000, 0.17],
  [80_000_000, 0.2],
  [100_000_000, 0.22],
  [Infinity, 0.26],
];

export function deductionRate(annualGross) {
  return DEDUCTION.find(([limit]) => annualGross <= limit)[1];
}

// income: { type: 'hourly' | 'monthly' | 'annual', amount, basis: 'net' | 'gross', monthlyHours }
// 시급은 언제나 세후로 입력받는다
export function wageFromIncome({ type, amount, basis = 'net', monthlyHours = MONTHLY_HOURS }) {
  if (!amount) return 0;
  if (type === 'hourly') return Math.round(amount);
  const monthly = type === 'annual' ? amount / 12 : amount;
  const net = basis === 'gross' ? monthly * (1 - deductionRate(monthly * 12)) : monthly;
  return Math.round(net / (monthlyHours || MONTHLY_HOURS));
}

export const wageFromMonthly = (monthly) => wageFromIncome({ type: 'monthly', amount: monthly });

// 필요 시간(초) = 가격 ÷ 초당 수입, 1초 단위로 올림
export function needSeconds(price, wage) {
  if (!price || !wage) return 0;
  return Math.ceil((price * 3600) / wage);
}

export const perSecond = (wage) => wage / 3600;

export function progress(saved, need) {
  if (!need) return 0;
  return Math.min(1, saved / need);
}

export const won = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`;

// 62,103초 → "17시간 15분 3초"
export function durationLabel(sec) {
  const total = Math.max(0, Math.round(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [];
  if (h) parts.push(`${h.toLocaleString('ko-KR')}시간`);
  if (m) parts.push(`${m}분`);
  if (s || !parts.length) parts.push(`${s}초`);
  return parts.join(' ');
}

// 타이머용 "01:23:45"
export function clockLabel(sec) {
  const total = Math.max(0, Math.floor(sec));
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

// 하루 8시간 근무 기준 환산
export const daysLabel = (sec) => `약 ${(Math.round((sec / 28800) * 10) / 10).toLocaleString('ko-KR')}일치 근무`;

export function localDate(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── 근무시간(서울 기준) ──────────────────────────────────────────
// 돈은 근무시간에만 모인다. 설정에서 요일·출퇴근·점심시간을 바꿀 수 있고,
// 기본값은 직장인 평균인 평일(월~금) 09:00~18:00, 점심 12:00~13:00 제외(하루 8시간, 주 40시간).
// 공휴일은 따로 빼지 않는다. 밤을 넘기는 근무(퇴근이 출근보다 이른 경우)는 지원하지 않는다.
const HOUR = 3600e3;
const DAY = 24 * HOUR;
const KST = 9 * HOUR; // 서울은 UTC+9, 서머타임 없음

// days: 0=일 … 6=토
export const DEFAULT_SCHEDULE = {
  days: [1, 2, 3, 4, 5],
  start: '09:00',
  end: '18:00',
  lunch: true,
  lunchStart: '12:00',
  lunchEnd: '13:00',
};

const toHours = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h + m / 60;
};

// 하루 근무 구간(시간 단위). 점심이 근무시간 안에 있으면 그만큼 잘라낸다
export function dailyWindows(schedule = DEFAULT_SCHEDULE) {
  const start = toHours(schedule.start);
  const end = toHours(schedule.end);
  if (end <= start) return [];
  if (!schedule.lunch) return [[start, end]];
  const ls = Math.max(start, toHours(schedule.lunchStart));
  const le = Math.min(end, toHours(schedule.lunchEnd));
  if (le <= ls) return [[start, end]];
  return [
    [start, ls],
    [le, end],
  ].filter(([x, y]) => y > x);
}

// 하루·한 주 근무시간(초)
export function scheduleSeconds(schedule = DEFAULT_SCHEDULE) {
  const day = dailyWindows(schedule).reduce((sum, [x, y]) => sum + (y - x) * 3600, 0);
  return { day, week: day * schedule.days.length };
}

const dayIndex = (ts) => Math.floor((ts + KST) / DAY);
const dayStart = (idx) => idx * DAY - KST;
const weekdayOf = (idx) => new Date(idx * DAY).getUTCDay();

// 하루하루 근무 구간을 [시작, 끝] 타임스탬프로 늘어놓는다
function* workWindows(fromTs, schedule, maxDays = 3660) {
  const windows = dailyWindows(schedule);
  if (!windows.length || !schedule.days.length) return;
  const first = dayIndex(fromTs);
  for (let i = first; i < first + maxDays; i++) {
    if (!schedule.days.includes(weekdayOf(i))) continue;
    const s0 = dayStart(i);
    for (const [h1, h2] of windows) yield [s0 + h1 * HOUR, s0 + h2 * HOUR];
  }
}

// a~b 사이에서 근무시간에 해당하는 초
export function workSecondsBetween(a, b, schedule = DEFAULT_SCHEDULE) {
  if (!a || b <= a) return 0;
  let total = 0;
  for (const [lo, hi] of workWindows(a, schedule, dayIndex(b) - dayIndex(a) + 1)) {
    const x = Math.max(a, lo);
    const y = Math.min(b, hi);
    if (y > x) total += y - x;
  }
  return total / 1000;
}

// 지금 근무 중인지, 아니면 언제 다시 시작하는지
export function workStatus(now, schedule = DEFAULT_SCHEDULE) {
  for (const [lo, hi] of workWindows(now, schedule, 8)) {
    if (now < lo) return { working: false, resumeAt: lo };
    if (now < hi) return { working: true, resumeAt: null };
  }
  return { working: false, resumeAt: null };
}

// 지금부터 근무시간으로 seconds만큼 지나면 언제인지(예상 달성 시각)
export function finishAt(now, seconds, schedule = DEFAULT_SCHEDULE) {
  let remain = seconds * 1000;
  if (remain <= 0) return now;
  for (const [lo, hi] of workWindows(now, schedule)) {
    const x = Math.max(now, lo);
    if (hi <= x) continue;
    if (hi - x >= remain) return x + remain;
    remain -= hi - x;
  }
  return null;
}

const kstFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

// "10월 29일 (목) 15:20"
export function kstLabel(ts) {
  const p = Object.fromEntries(kstFormat.formatToParts(ts).map((x) => [x.type, x.value]));
  return `${p.month} ${p.day}일 (${p.weekday}) ${p.hour}:${p.minute}`;
}

// 쉬는 시간 안내: 점심 / 출근 전 / 퇴근 / 쉬는 날
export function restLabel(now, resumeAt, schedule = DEFAULT_SCHEDULE) {
  const time = kstLabel(resumeAt).slice(-5);
  if (dayIndex(resumeAt) === dayIndex(now)) {
    const startedToday = now >= dayStart(dayIndex(now)) + toHours(schedule.start) * HOUR;
    return startedToday ? `점심시간이에요 · ${time}부터 다시 모여요` : `출근 전이에요 · ${time}부터 모여요`;
  }
  if (dayIndex(resumeAt) === dayIndex(now) + 1) return `퇴근했어요 · 내일 ${time}부터 다시 모여요`;
  const weekday = kstFormat.formatToParts(resumeAt).find((x) => x.type === 'weekday').value;
  return `쉬는 날이에요 · ${weekday}요일 ${time}부터 다시 모여요`;
}
