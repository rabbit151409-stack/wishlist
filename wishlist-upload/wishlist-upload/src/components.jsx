import { useEffect, useState } from 'react';
import { durationLabel, needSeconds, perSecond, progress, won, workSecondsBetween } from './calc.js';

export function Header({ title, onBack, right }) {
  return (
    <header className="header">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">
          ←
        </button>
      ) : (
        <span className="header-spacer" />
      )}
      <h1>{title}</h1>
      {right || <span className="header-spacer" />}
    </header>
  );
}

function ThumbLayer({ item, size, className, style }) {
  return item.imageUrl ? (
    <img
      className={item.cutout ? `${className} thumb-cutout` : className}
      style={style}
      src={item.imageUrl}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className={`${className} thumb-empty`} style={{ ...style, width: size, height: size, fontSize: size * 0.45 }}>
      🎁
    </div>
  );
}

// 투명하던 상품이 모은 시간만큼 아래에서부터 색으로 채워진다
export function Thumb({ item, size = 56, ratio = 1 }) {
  const empty = `${(1 - ratio) * 100}%`;
  return (
    <div className={item.cutout ? 'fill-thumb is-cutout' : 'fill-thumb'} style={{ width: size, height: size }}>
      <ThumbLayer item={item} size={size} className="thumb thumb-ghost" />
      <ThumbLayer item={item} size={size} className="thumb thumb-color" style={{ clipPath: `inset(${empty} 0 0 0)` }} />
      {ratio > 0 && ratio < 1 && <div className="fill-line" style={{ top: empty }} />}
    </div>
  );
}

// live: 자동 카운트로 지금 쌓이고 있는 초 (모으는 상품에만)
export const liveSeconds = (item, settings, elapsed) =>
  item.savedSeconds + (item.id === settings.activeItemId ? elapsed : 0);

export const itemRatio = (item, wage, live = item.savedSeconds) => progress(live, needSeconds(item.price, wage));

// 모으는 상품이면 매 프레임 지금까지 쌓인 초(소수점 포함)를 돌려준다
export function useLive(item, settings) {
  const startedAt = item && item.id === settings.activeItemId ? settings.workStartedAt : null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    let frame;
    const tick = () => {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [startedAt]);
  if (!item) return { live: 0, need: 0, ratio: 0, money: 0, running: false };
  const wage = settings.hourlyWage;
  const need = needSeconds(item.price, wage);
  const live = Math.min(need, item.savedSeconds + (startedAt ? workSecondsBetween(startedAt, now, settings.schedule) : 0));
  return { live, need, ratio: progress(live, need), money: Math.floor(live * perSecond(wage)), running: !!startedAt };
}

// 상품 이미지 자체가 게이지. 카운트 중이면 실시간으로 차오른다
export function ImageGauge({ item, settings, size = 180 }) {
  const { live, need, ratio, money, running } = useLive(item, settings);
  return (
    <div className={running ? 'image-gauge running' : 'image-gauge'}>
      <Thumb item={item} size={size} ratio={ratio} />
      <span className="muted small">모은 돈</span>
      <b className="live-money">{won(money)}</b>
      <span className="live-time">
        {(ratio * 100).toFixed(4)}% · <b>{durationLabel(Math.floor(live))}</b> / {durationLabel(need)}
      </span>
    </div>
  );
}

// 앱 안에서 띄우는 확인 창. 브라우저 기본 confirm()은 일부 앱 화면·홈 화면 앱에서 막혀 바로 '취소'가 된다
export function ConfirmSheet({ message, confirmLabel = '확인', danger, onConfirm, onCancel }) {
  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="confirm-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className="row">
          <button className="btn grow-btn" onClick={onCancel}>
            취소
          </button>
          <button className={danger ? 'btn primary danger-fill grow-btn' : 'btn primary grow-btn'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
