// 도트 일러스트 무대: 진열대와 코인 표지판. 그 위에 상품 이미지(게이지)가 놓인다.
// 1칸 = 4px, 85 × 76칸. 상품이 주인공이라 진열대를 넓게 잡고 소품은 양끝으로 둔다
import { Thumb } from './components.jsx';

const INK = '#111111';
const MID = '#a9a9a9';
const LIGHT = '#e4e4e4';
const COIN = '#ffd23f';
const COIN_DARK = '#e0a800';

// rows: y0부터 한 줄씩 [x1, x2]. 테두리는 검정, 안쪽은 fill
function Blob({ y0, rows, fill }) {
  return rows.map(([x1, x2], i) => {
    const edge = i === 0 || i === rows.length - 1;
    return (
      <g key={i}>
        <rect x={x1} y={y0 + i} width={x2 - x1 + 1} height="1" fill={INK} />
        {!edge && <rect x={x1 + 1} y={y0 + i} width={x2 - x1 - 1} height="1" fill={fill} />}
      </g>
    );
  });
}

function Box({ x, y, w, h, fill }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} fill={INK} />
      <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} fill={fill} />
    </>
  );
}

const ROUND = [
  [2, 6],
  [1, 7],
  [0, 8],
  [0, 8],
  [0, 8],
  [0, 8],
  [1, 7],
  [2, 6],
];
const shift = (rows, dx) => rows.map(([a, b]) => [a + dx, b + dx]);

function Scenery() {
  return (
    <svg className="stage-art" viewBox="0 0 85 76" shapeRendering="crispEdges" aria-hidden="true">
      {/* 코인 표지판 */}
      <Box x={78} y={24} w={3} h={52} fill={MID} />
      <Blob y0={16} rows={shift(ROUND, 75)} fill={COIN} />
      <rect x="78" y="18" width="3" height="1" fill={COIN_DARK} />
      <rect x="78" y="21" width="3" height="1" fill={COIN_DARK} />
      <rect x="79" y="18" width="1" height="4" fill={COIN_DARK} />
      {/* 진열대 */}
      <Box x={9} y={60} w={66} h={4} fill={MID} />
      <Box x={12} y={63} w={60} h={10} fill="#fff" />
      <rect x="13" y="64" width="58" height="2" fill={LIGHT} />
      <rect x="68" y="64" width="3" height="8" fill={LIGHT} />
      <Box x={10} y={72} w={64} h={4} fill={MID} />
    </svg>
  );
}

export default function Stage({ item, ratio = 1, running = false }) {
  return (
    <div className={running ? 'stage running' : 'stage'}>
      <Scenery />
      <div className="stage-item">
        {item ? (
          <Thumb item={item} size={224} ratio={ratio} />
        ) : (
          <div className="stage-empty">?</div>
        )}
      </div>
    </div>
  );
}
