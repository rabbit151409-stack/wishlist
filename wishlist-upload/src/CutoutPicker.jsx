import { useEffect, useRef, useState } from 'react';
import { photoToDataUrl, removeBackground } from './cutout.js';

// 원본 사진을 받으면 자동으로 누끼를 따고, 누끼/원본 중 무엇을 쓸지 고르게 한다.
// onChange({ imageUrl, originalImageUrl, cutout })
export default function CutoutPicker({ original, onPickOriginal, onChange }) {
  const [cut, setCut] = useState({ state: 'idle', src: null, progress: 0 });
  const [useCut, setUseCut] = useState(true);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!original) return;
    let live = true;
    setCut({ state: 'working', src: null, progress: 0 });
    removeBackground(original, (p) => live && setCut((c) => ({ ...c, progress: p })))
      .then((src) => live && setCut({ state: 'done', src, progress: 1 }))
      .catch(() => live && setCut({ state: 'failed', src: null, progress: 0 }));
    return () => {
      live = false;
    };
  }, [original]);

  const showCut = useCut && cut.state === 'done';
  useEffect(() => {
    onChange({ imageUrl: showCut ? cut.src : original, originalImageUrl: original, cutout: showCut });
  }, [showCut, cut.src, original]);

  async function pickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onPickOriginal(await photoToDataUrl(file));
  }

  return (
    <div className="cutout-picker">
      {original && (
        <div className={showCut ? 'preview-box checker' : 'preview-box'}>
          <img className="preview" src={showCut ? cut.src : original} alt="" referrerPolicy="no-referrer" />
        </div>
      )}
      {cut.state === 'working' && (
        <p className="hint">
          누끼 따는 중…
          {cut.progress > 0 && cut.progress < 1 && ` 처음 한 번은 준비하느라 조금 걸려요 (${Math.round(cut.progress * 100)}%)`}
        </p>
      )}
      {cut.state === 'failed' && <p className="hint">누끼를 따지 못해서 원본 사진을 쓸게요.</p>}
      {cut.state === 'done' && (
        <div className="segmented small-seg">
          <button type="button" className={useCut ? 'on' : ''} onClick={() => setUseCut(true)}>
            누끼
          </button>
          <button type="button" className={useCut ? '' : 'on'} onClick={() => setUseCut(false)}>
            원본
          </button>
        </div>
      )}
      <button type="button" className="btn small" onClick={() => fileRef.current.click()}>
        {original ? '다른 사진 넣기' : '사진 넣기'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
    </div>
  );
}
