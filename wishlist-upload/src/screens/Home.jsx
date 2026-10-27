import { Thumb, itemRatio, useLive } from '../components.jsx';
import Stage from '../stage.jsx';
import { durationLabel, needSeconds, won } from '../calc.js';

function short(title, max = 14) {
  return title.length > max ? `${title.slice(0, max)}…` : title;
}

export default function Home({ settings, items, go }) {
  const wage = settings.hourlyWage;
  const active = items.find((i) => i.id === settings.activeItemId);
  // 담은 순서대로 이어서 모은다
  const waiting = items.filter((i) => i.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt);
  const done = items.filter((i) => i.status === 'achieved' || i.status === 'purchased');
  const toBuy = done.filter((i) => i.status === 'achieved').length;
  const { live, need, ratio, money, running } = useLive(active, settings);
  const carry = settings.carrySeconds;

  return (
    <main className="screen home">
      <div className="top-bar">
        <span>내 시급 {won(wage)}</span>
        <button className="icon-btn" onClick={() => go('settings')} aria-label="설정">
          ⚙
        </button>
      </div>

      <h1 className="headline">
        {active
          ? `${short(active.title)}까지\n${durationLabel(need - Math.floor(live))} 남았어요!`
          : '사고 싶은 걸\n담아 보세요!'}
      </h1>

      <button
        className="stage-btn"
        onClick={() => active && go('detail', { id: active.id })}
        aria-label={active ? `${active.title} 상세 보기` : '모으는 상품 없음'}
      >
        <Stage item={active} ratio={ratio} running={running} />
      </button>

      <div className="sheet">
        {active ? (
          <div className="money-block">
            <span className="muted small">
              <i className="coin-dot" />
              모은 돈
            </span>
            <b className="live-money">{won(money)}</b>
            <span className="live-time">
              <b>{durationLabel(Math.floor(live))}</b> 동안 모았어요
            </span>
          </div>
        ) : (
          <p className="hint center">
            {waiting.length ? '아래 목록에서 모을 상품을 골라 주세요.' : '담는 순간부터 내 시급만큼 돈이 모여요.'}
          </p>
        )}
        {carry > 0 && (
          <p className="hint center">
            모아 둔 시간 <b>{durationLabel(carry)}</b>은 다음 상품에 쌓여요.
          </p>
        )}

        <section>
          <h2 className="section-title">
            다음 순서 {waiting.length > 0 && <span className="count">{waiting.length}</span>}
          </h2>
          {waiting.length === 0 && <p className="muted small">지금 상품을 다 모으면 다음에 모을 상품이 없어요.</p>}
          <ul className="list">
            {waiting.map((item, i) => (
              <li key={item.id}>
                <button className="list-item" onClick={() => go('detail', { id: item.id })}>
                  <span className="order">{i + 1}</span>
                  <Thumb item={item} size={48} ratio={itemRatio(item, wage)} />
                  <div className="grow">
                    <b>{item.title}</b>
                    <span className="muted small">{won(item.price)}</span>
                  </div>
                  <span className="hours-pill">{durationLabel(needSeconds(item.price, wage))}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="bottom-bar">
        <button className="btn" onClick={() => go('done')}>
          달성 폴더{toBuy > 0 && <span className="count">{toBuy}</span>}
        </button>
        <button className="btn primary" onClick={() => go('add')}>
          <span className="bell">＋</span> 담을래
        </button>
      </div>
    </main>
  );
}
