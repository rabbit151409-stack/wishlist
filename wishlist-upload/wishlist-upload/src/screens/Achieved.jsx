import Stage from '../stage.jsx';
import { markPurchased } from '../db.js';
import { durationLabel, won } from '../calc.js';

export default function Achieved({ items, settings, go, id }) {
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  const next = items.find((i) => i.id === settings.activeItemId);

  return (
    <main className="screen achieved">
      <h1 className="headline">{'달성!\n이제 사러 가 볼까요?'}</h1>
      <div className="achieved-thumb">
        <Stage item={item} />
      </div>
      <h2 className="title-2 center">{item.title}</h2>
      <p className="center">
        <b>{durationLabel(item.savedSeconds)}</b> 동안 모은 {won(item.price)}
      </p>
      <p className="hint center">
        달성 폴더에 넣어 뒀어요.
        {next ? (
          <>
            {' '}
            이어서 <b>{next.title}</b> 모으는 중이에요.
          </>
        ) : (
          ' 다음에 모을 상품을 담아 주세요.'
        )}
      </p>
      <div className="stack full">
        {item.url && (
          <a className="btn primary" href={item.url} target="_blank" rel="noreferrer">
            구매하러 가기
          </a>
        )}
        <button
          className="btn"
          onClick={async () => {
            await markPurchased(item.id);
            go('home');
          }}
        >
          샀어요
        </button>
        <button className="btn ghost" onClick={() => go('home')}>
          나중에 살게요
        </button>
      </div>
    </main>
  );
}
