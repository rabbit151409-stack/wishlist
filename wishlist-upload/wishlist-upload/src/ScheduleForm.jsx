import { useState } from 'react';
import { DEFAULT_SCHEDULE, durationLabel, scheduleSeconds } from './calc.js';

// 월요일부터 보여 준다. 값은 0=일 … 6=토
const DAYS = [
  [1, '월'],
  [2, '화'],
  [3, '수'],
  [4, '목'],
  [5, '금'],
  [6, '토'],
  [0, '일'],
];

// 근무 요일·출퇴근·점심시간을 고른다. 돈은 이 시간에만 모인다
export default function ScheduleForm({ initial, onSubmit }) {
  const [s, setS] = useState({ ...DEFAULT_SCHEDULE, ...initial });
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const toggleDay = (d) => set({ days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d] });

  const { day, week } = scheduleSeconds(s);
  const error = !s.days.length
    ? '근무 요일을 하루 이상 골라 주세요.'
    : s.end <= s.start
      ? '퇴근 시간은 출근 시간보다 늦어야 해요.'
      : s.lunch && s.lunchEnd <= s.lunchStart
        ? '점심 끝나는 시간이 시작보다 늦어야 해요.'
        : null;

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!error) onSubmit({ ...s, days: [...s.days].sort() });
      }}
    >
      <div className="chips">
        {DAYS.map(([d, label]) => (
          <button type="button" key={d} className={s.days.includes(d) ? 'chip on' : 'chip'} onClick={() => toggleDay(d)}>
            {label}
          </button>
        ))}
      </div>

      <div className="row">
        <label className="field grow">
          <span>출근</span>
          <input type="time" value={s.start} onChange={(e) => set({ start: e.target.value })} required />
        </label>
        <label className="field grow">
          <span>퇴근</span>
          <input type="time" value={s.end} onChange={(e) => set({ end: e.target.value })} required />
        </label>
      </div>

      <label className="switch-row">
        <input type="checkbox" checked={s.lunch} onChange={(e) => set({ lunch: e.target.checked })} />
        <span>점심시간은 빼기</span>
      </label>
      {s.lunch && (
        <div className="row">
          <label className="field grow">
            <span>점심 시작</span>
            <input type="time" value={s.lunchStart} onChange={(e) => set({ lunchStart: e.target.value })} required />
          </label>
          <label className="field grow">
            <span>점심 끝</span>
            <input type="time" value={s.lunchEnd} onChange={(e) => set({ lunchEnd: e.target.value })} required />
          </label>
        </div>
      )}

      {error ? (
        <p className="hint danger-text">{error}</p>
      ) : (
        <p className="hint">
          하루 <b>{durationLabel(day)}</b> · 일주일 <b>{durationLabel(week)}</b> 동안 돈이 모여요.
        </p>
      )}

      <div className="row">
        <button type="button" className="btn grow-btn" onClick={() => setS(DEFAULT_SCHEDULE)}>
          기본값
        </button>
        <button className="btn primary grow-btn" disabled={!!error}>
          저장
        </button>
      </div>
    </form>
  );
}
