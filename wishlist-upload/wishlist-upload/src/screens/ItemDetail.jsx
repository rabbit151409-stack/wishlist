import { useState } from 'react';
import { ConfirmSheet, Header, ImageGauge, Thumb, useLive } from '../components.jsx';
import CutoutPicker from '../CutoutPicker.jsx';
import { giveUp, markPurchased, setActive, updateImage } from '../db.js';
import { daysLabel, durationLabel, needSeconds, won } from '../calc.js';

const STATUS = {
  waiting: '대기 중',
  collecting: '모으는 중',
  achieved: '달성',
  purchased: '구매 완료',
  gaveup: '포기',
};

export default function ItemDetail({ settings, items, go, after, id, from = 'home' }) {
  const item = items.find((i) => i.id === id);
  const [editing, setEditing] = useState(false);
  const [original, setOriginal] = useState(null);
  const [image, setImage] = useState(null);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const saved = Math.floor(useLive(item, settings).live);
  if (!item) return null;
  const need = needSeconds(item.price, settings.hourlyWage);
  const open = item.status === 'waiting' || item.status === 'collecting';

  return (
    <main className="screen">
      <Header title="상품 상세" onBack={() => go(from)} />
      <div className="detail-top">
        {item.status === 'collecting' || item.savedSeconds > 0 ? (
          <ImageGauge item={item} settings={settings} />
        ) : (
          <Thumb item={item} size={180} ratio={item.status === 'purchased' ? 1 : 0} />
        )}
        <span className="status-pill">{STATUS[item.status]}</span>
        <h2 className="title-2 center">{item.title}</h2>
        <p className="muted">
          {item.shop && `${item.shop} · `}
          {won(item.price)}
        </p>
      </div>

      {editing ? (
        <div className="card stack">
          <CutoutPicker
            original={original ?? (item.originalImageUrl || item.imageUrl)}
            onPickOriginal={setOriginal}
            onChange={setImage}
          />
          <div className="row">
            <button className="btn ghost grow-btn" onClick={() => setEditing(false)}>
              취소
            </button>
            <button
              className="btn primary grow-btn"
              disabled={!image?.imageUrl}
              onClick={async () => {
                await updateImage(item.id, image);
                setEditing(false);
              }}
            >
              이 사진으로 저장
            </button>
          </div>
        </div>
      ) : (
        <button className="btn small" onClick={() => setEditing(true)}>
          {item.cutout ? '사진 바꾸기' : '누끼 따기 · 사진 바꾸기'}
        </button>
      )}

      <div className="card convert">
        <span className="muted">필요한 노동 시간</span>
        <b className="big-number">{durationLabel(need)}</b>
        <span className="muted">{daysLabel(need)}</span>
      </div>

      <div className="stack">
        {item.status === 'waiting' && (
          <button className="btn primary" onClick={async () => after(await setActive(item.id))}>
            {settings.activeItemId ? '이 상품 먼저 모으기' : '이 상품 모으기'}
          </button>
        )}
        {item.status === 'achieved' && (
          <button className="btn primary" onClick={() => markPurchased(item.id)}>
            구매 완료로 표시
          </button>
        )}
        {item.url && (
          <a className="btn" href={item.url} target="_blank" rel="noreferrer">
            구매 페이지 열기
          </a>
        )}
        {open && (
          <button
            className="btn ghost danger"
            onClick={() => setConfirmGiveUp(true)}
          >
            포기하기
          </button>
        )}
      </div>
      {item.status === 'waiting' && settings.activeItemId && (
        <p className="hint center">바꾸면 지금 모으던 상품은 모은 시간을 그대로 둔 채 대기 목록으로 가요.</p>
      )}
      {confirmGiveUp && (
        <ConfirmSheet
          message={
            saved
              ? `포기할까요? 모은 ${durationLabel(saved)}은 다음 상품으로 넘어가요.`
              : '이 상품을 포기할까요?'
          }
          confirmLabel="포기할래"
          danger
          onCancel={() => setConfirmGiveUp(false)}
          onConfirm={async () => {
            setConfirmGiveUp(false);
            after(await giveUp(item.id));
          }}
        />
      )}
    </main>
  );
}
