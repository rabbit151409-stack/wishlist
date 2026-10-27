import { useState } from 'react';
import { MONTHLY_HOURS, deductionRate, wageFromIncome, won } from './calc.js';

const TYPES = [
  { key: 'hourly', label: '시급', field: '시급', placeholder: '예: 10,320' },
  { key: 'monthly', label: '월급', field: '한 달 월급', placeholder: '예: 2,500,000' },
  { key: 'annual', label: '연봉', field: '연봉', placeholder: '예: 70,000,000' },
];

const digits = (s) => Number(String(s).replace(/[^\d]/g, ''));

// 시급·월급·연봉 중 하나로 소득을 넣으면 세후 시급으로 환산한다
export default function WageForm({ initialIncome, submitLabel, onSubmit }) {
  const [type, setType] = useState(initialIncome?.type || 'hourly');
  const [amount, setAmount] = useState(initialIncome?.amount || 0);
  const [basis, setBasis] = useState(initialIncome?.basis || (initialIncome?.type === 'annual' ? 'gross' : 'net'));
  const [monthlyHours, setMonthlyHours] = useState(initialIncome?.monthlyHours || MONTHLY_HOURS);

  const meta = TYPES.find((t) => t.key === type);
  const income = { type, amount, basis: type === 'hourly' ? 'net' : basis, monthlyHours };
  const wage = wageFromIncome(income);
  const annualGross = type === 'annual' ? amount : amount * 12;

  function pickType(next) {
    setType(next);
    setAmount(0);
    // 연봉은 보통 세전으로 말하니 기본값을 세전으로
    setBasis(next === 'annual' ? 'gross' : 'net');
  }

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (wage > 0) onSubmit(wage, income);
      }}
    >
      <div className="segmented">
        {TYPES.map((t) => (
          <button type="button" key={t.key} className={type === t.key ? 'on' : ''} onClick={() => pickType(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {type !== 'hourly' && (
        <div className="segmented small-seg">
          <button type="button" className={basis === 'gross' ? 'on' : ''} onClick={() => setBasis('gross')}>
            세전
          </button>
          <button type="button" className={basis === 'net' ? 'on' : ''} onClick={() => setBasis('net')}>
            세후 (실수령)
          </button>
        </div>
      )}

      <label className="field">
        <span>
          {type === 'hourly' ? '세후 시급' : `${meta.field} (${basis === 'gross' ? '세전' : '세후'})`}
        </span>
        <div className="input-suffix">
          <input
            inputMode="numeric"
            placeholder={meta.placeholder}
            value={amount ? amount.toLocaleString('ko-KR') : ''}
            onChange={(e) => setAmount(digits(e.target.value))}
            autoFocus
          />
          <em>원</em>
        </div>
      </label>

      {type !== 'hourly' && (
        <label className="field">
          <span>한 달 근무시간</span>
          <div className="input-suffix">
            <input
              inputMode="numeric"
              value={monthlyHours || ''}
              onChange={(e) => setMonthlyHours(digits(e.target.value))}
            />
            <em>시간</em>
          </div>
          <small className="hint">주 40시간 근무(주휴 포함)면 209시간이에요.</small>
        </label>
      )}

      {type !== 'hourly' && wage > 0 && (
        <div className="card convert">
          <span className="muted">내 세후 시급</span>
          <b className="big-number">{won(wage)}</b>
          {basis === 'gross' && (
            <span className="muted small">
              세금·4대보험 약 {Math.round(deductionRate(annualGross) * 100)}%를 뺀 추정치예요
            </span>
          )}
        </div>
      )}

      <button className="btn primary" disabled={!wage}>
        {submitLabel}
      </button>
    </form>
  );
}
