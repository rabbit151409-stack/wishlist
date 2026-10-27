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
