import WageForm from '../WageForm.jsx';
import { saveWage } from '../db.js';
import Stage from '../stage.jsx';

export default function Onboarding() {
  return (
    <main className="screen onboarding">
      <div className="hero">
        <h1 className="headline">{'사고 싶은 물건을\n내 시급으로 모아 볼게요!'}</h1>
        <Stage />
      </div>
      <p className="hint center">시급·월급·연봉 중 편한 걸로 입력하면 세후 시급으로 바꿔 드려요.</p>
      <WageForm submitLabel="시작하기" onSubmit={saveWage} />
    </main>
  );
}
