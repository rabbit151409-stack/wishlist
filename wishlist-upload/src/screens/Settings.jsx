import { useRef, useState } from 'react';
import { ConfirmSheet, Header } from '../components.jsx';
import WageForm from '../WageForm.jsx';
import { exportData, importData, saveWage } from '../db.js';
import { durationLabel, needSeconds, won } from '../calc.js';

export default function Settings({ settings, items, go, after }) {
  const [message, setMessage] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const fileRef = useRef(null);
  const purchased = items.filter((i) => i.status === 'purchased');
  const gaveUp = items.filter((i) => i.status === 'gaveup');
  const saved = gaveUp.reduce((sum, i) => sum + i.price, 0);

  async function download() {
    const blob = new Blob([JSON.stringify(await exportData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sigeup-wish-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // 파일을 고르면 확인 창을 띄우고, 확인하면 그때 불러온다
  function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setPendingFile(file);
  }

  async function restore() {
    const file = pendingFile;
    setPendingFile(null);
    try {
      await importData(JSON.parse(await file.text()));
      setMessage('백업을 불러왔어요.');
    } catch (err) {
      setMessage(err.message || '파일을 읽지 못했어요.');
    }
  }

  return (
    <main className="screen">
      <Header title="설정" onBack={() => go('home')} />

      <section>
        <h2 className="section-title">내 소득</h2>
        <p className="muted small">
          지금 세후 시급 {won(settings.hourlyWage)} · 바꾸면 모든 상품의 필요 시간이 다시 계산돼요.
        </p>
        <WageForm
          key={settings.hourlyWage}
          initialIncome={settings.income || { type: 'hourly', amount: settings.hourlyWage }}
          submitLabel="저장"
          onSubmit={async (wage, income) => {
            after(await saveWage(wage, income), 'settings');
            setMessage('소득 설정을 저장했어요.');
          }}
        />
      </section>

      <section>
        <h2 className="section-title">기록</h2>
        <div className="stats">
          <div>
            <b>{purchased.length}개</b>
            <span>산 물건</span>
          </div>
          <div>
            <b>{gaveUp.length}개</b>
            <span>참은 물건</span>
          </div>
          <div>
            <b>{won(saved)}</b>
            <span>아낀 돈 ({durationLabel(needSeconds(saved, settings.hourlyWage))})</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">백업</h2>
        <p className="muted small">데이터는 이 기기에만 있어요. 브라우저 데이터를 지우면 사라지니 가끔 백업해 두세요.</p>
        <div className="row">
          <button className="btn grow" onClick={download}>
            내보내기
          </button>
          <button className="btn grow" onClick={() => fileRef.current.click()}>
            가져오기
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={pick} />
        </div>
        {message && <p className="hint">{message}</p>}
      </section>
      {pendingFile && (
        <ConfirmSheet
          message="지금 기기의 데이터를 백업 파일로 바꿀까요? 지금 데이터는 사라져요."
          confirmLabel="바꿀래"
          danger
          onCancel={() => setPendingFile(null)}
          onConfirm={restore}
        />
      )}
    </main>
  );
}
