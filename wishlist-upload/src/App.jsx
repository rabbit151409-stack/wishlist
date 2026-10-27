import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings, syncClock } from './db.js';
import { needSeconds } from './calc.js';
import Onboarding from './screens/Onboarding.jsx';
import Home from './screens/Home.jsx';
import AddItem from './screens/AddItem.jsx';
import ItemDetail from './screens/ItemDetail.jsx';
import Achieved from './screens/Achieved.jsx';
import Settings from './screens/Settings.jsx';
import Done from './screens/Done.jsx';

// 공유하기(Web Share Target)로 들어오면 ?url= 또는 ?text= 안에 링크가 있다
function sharedUrl() {
  const q = new URLSearchParams(window.location.search);
  const candidates = [q.get('url'), q.get('text'), q.get('title')].filter(Boolean);
  for (const c of candidates) {
    const m = c.match(/https?:\/\/\S+/);
    if (m) return m[0];
  }
  return null;
}

const initialShare = sharedUrl();
if (initialShare) window.history.replaceState(null, '', '/');

// 카운트가 돌면 초마다 다시 그린다
function useElapsed(startedAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
}

export default function App() {
  const [route, setRoute] = useState(initialShare ? { name: 'add', url: initialShare } : { name: 'home' });
  const settings = useLiveQuery(getSettings);
  const items = useLiveQuery(() => db.items.orderBy('createdAt').reverse().toArray());
  const elapsed = useElapsed(settings?.workStartedAt);
  const committing = useRef(false);

  const go = (name, extra = {}) => {
    setRoute({ name, ...extra });
    window.scrollTo(0, 0);
  };
  // 달성한 상품이 있으면 축하 화면으로, 없으면 지정한 화면으로
  const after = (achievedId, fallback = 'home') => (achievedId ? go('achieved', { id: achievedId }) : go(fallback));

  // 앱을 열면 닫혀 있던 동안 흐른 시간까지 반영하고, 카운트가 멈춰 있으면 시작한다
  useEffect(() => {
    syncClock().then((id) => id && go('achieved', { id }));
  }, []);

  // 목표를 채운 그 초에 바로 달성 처리한다
  useEffect(() => {
    if (!settings?.workStartedAt || !items || committing.current) return;
    const active = items.find((i) => i.id === settings.activeItemId);
    if (!active || active.savedSeconds + elapsed < needSeconds(active.price, settings.hourlyWage)) return;
    committing.current = true;
    syncClock()
      .then((id) => id && go('achieved', { id }))
      .finally(() => {
        committing.current = false;
      });
  }, [elapsed, settings, items]);

  if (!settings || !items) return null;
  if (!settings.hourlyWage) return <Onboarding />;

  const props = { settings, items, go, after, elapsed };
  switch (route.name) {
    case 'add':
      return <AddItem {...props} initialUrl={route.url} />;
    case 'detail':
      return <ItemDetail {...props} id={route.id} from={route.from} />;
    case 'achieved':
      return <Achieved {...props} id={route.id} />;
    case 'done':
      return <Done {...props} />;
    case 'settings':
      return <Settings {...props} />;
    default:
      return <Home {...props} />;
  }
}
