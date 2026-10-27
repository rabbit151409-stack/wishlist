import { useEffect, useState } from 'react';
import { Header } from '../components.jsx';
import CutoutPicker from '../CutoutPicker.jsx';
import { addItem } from '../db.js';
import { daysLabel, durationLabel, needSeconds } from '../calc.js';

export default function AddItem({ settings, go, after, initialUrl }) {
  const [url, setUrl] = useState(initialUrl || '');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  // imageUrl: 원본 사진(쇼핑몰 이미지 또는 직접 넣은 사진), image: 실제로 저장할 이미지(누끼 포함)
  const [imageUrl, setImageUrl] = useState('');
  const [image, setImage] = useState({ imageUrl: '', originalImageUrl: '', cutout: false });
  const [shop, setShop] = useState('');
  const [status, setStatus] = useState({ loading: false, message: '' });

  const priceNum = Number(price.replace(/[^\d]/g, ''));
  const need = needSeconds(priceNum, settings.hourlyWage);

  async function fetchInfo(target = url) {
    if (!target.trim()) return;
    setStatus({ loading: true, message: '' });
    try {
      const res = await fetch(`/api/parse?url=${encodeURIComponent(target.trim())}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (data.title) setTitle(data.title);
      if (data.imageUrl) setImageUrl(data.imageUrl);
      if (data.shop) setShop(data.shop);
      if (data.price) setPrice(String(data.price));
      setStatus({
        loading: false,
        message: data.price ? '상품 정보를 불러왔어요.' : '가격을 찾지 못했어요. 직접 입력해 주세요.',
      });
    } catch (e) {
      setStatus({ loading: false, message: `${e.message || '불러오지 못했어요'}. 직접 입력해 주세요.` });
    }
  }

  useEffect(() => {
    if (initialUrl) fetchInfo(initialUrl);
  }, [initialUrl]);

  async function save(e) {
    e.preventDefault();
    if (!title.trim() || !priceNum) return;
    const { achieved } = await addItem({ url: url.trim(), title: title.trim(), ...image, price: priceNum, shop });
    after(achieved);
  }

  return (
    <main className="screen">
      <Header title="상품 추가" onBack={() => go('home')} />
      <form className="stack" onSubmit={save}>
        <label className="field">
          <span>구매 링크</span>
          <div className="row">
            <input
              className="grow"
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (/^https?:\/\//.test(pasted.trim())) setTimeout(() => fetchInfo(pasted), 0);
              }}
            />
            <button type="button" className="btn small" onClick={() => fetchInfo()} disabled={status.loading || !url}>
              {status.loading ? '...' : '불러오기'}
            </button>
          </div>
        </label>
        {status.message && <p className="hint">{status.message}</p>}

        <CutoutPicker original={imageUrl} onPickOriginal={setImageUrl} onChange={setImage} />

        <label className="field">
          <span>상품명</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 무선 이어폰" required />
        </label>
        <label className="field">
          <span>가격</span>
          <div className="input-suffix">
            <input
              inputMode="numeric"
              value={priceNum ? priceNum.toLocaleString('ko-KR') : ''}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="예: 299,000"
              required
            />
            <em>원</em>
          </div>
        </label>

        {need > 0 && (
          <div className="card convert">
            <span className="muted">내 시급으로 환산하면</span>
            <b className="big-number">{durationLabel(need)}</b>
            <span className="muted">{daysLabel(need)}</span>
          </div>
        )}

        <button className="btn primary" disabled={!title.trim() || !priceNum}>
          위시리스트에 담기
        </button>
      </form>
    </main>
  );
}
