import { Link } from 'react-router-dom';

export default function ContributePage() {
  return (
    <div className="page contribute-page">
      <Link to="/" className="back-link">← На главную</Link>
      <h1>Предложить новый праздник или обряд</h1>
      
      <iframe
        src="https://forms.yandex.ru/u/6a00b5f2f47e738fd7e291f1?iframe=1"
        title="Форма для предложения праздника"
        width="100%"
        height="600"
        frameBorder="0"
      />
    </div>
  );
}