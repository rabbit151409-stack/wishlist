import { Header, Thumb } from '../components.jsx';
import { markPurchased } from '../db.js';
import { durationLabel, won } from '../calc.js';

// 달성 폴더: 다 모은 상품. 아직 안 산 것부터, 최근 달성한 순으로
export default function Done({ items, go }) {
  const done = items
    .filter((i) => i.status === 'achieved' || i.status === 'purchased')
    .sort((a, b) => (a.status === b.status ? b.achievedAt - a.achievedAt : a.status === 'achieved' ? -1 : 1));
  const total = done.reduce((sum, i) => sum + i.price, 0);

  return (
    <main className="screen">
      <Header title="달성 폴더" onBack={() => go('home')} />
      {done.length === 0 ? (
        <div className="card empty">아직 달성한 상품이 없어요.</div>
      ) : (
        <>
          <p className="hint">
            지금까지 <b>{done.length}개</b>, <b>{won(total)}</b>어치를 모았어요.
          </p>
          <ul className="list">
            {done.map((item) => (
              <li key={item.id} className="done-item">
                <button className="done-main" onClick={() => go('detail', { id: item.id, from: 'done' })}>
                  <Thumb item={item} size={56} />
                  <div className="grow">
                    <b>{item.title}</b>
                    <span className="muted small">
                      {won(item.price)} · {durationLabel(item.savedSeconds)}
                    </span>
                  </div>
                </button>
                {item.status === 'purchased' ? (
                  <span className="status-pill">구매 완료</span>
                ) : (
                  <div className="done-actions">
                    {item.url && (
                      <a className="btn small primary" href={item.url} target="_blank" rel="noreferrer">
                        사러 가기
                      </a>
                    )}
                    <button className="btn small" onClick={() => markPurchased(item.id)}>
                      샀어요
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
