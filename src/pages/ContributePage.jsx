import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function ContributePage() {
  const iframeRef = useRef(null);

  useEffect(() => {
    const handleMessage = (e) => {
      // Принимаем сообщение только от Яндекс.Форм и только типа 'resize'
      if (
        e.origin === 'https://forms.yandex.ru' &&
        e.data &&
        e.data.type === 'resize'
      ) {
        if (iframeRef.current) {
          // Устанавливаем высоту iframe равной высоте формы
          iframeRef.current.style.height = e.data.height + 'px';
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="page contribute-page">
      <Link to="/" className="back-link">← На главную</Link>
      <h1>Предложить новый праздник или обряд</h1>

      <div style={{
        width: '100%',
        border: '1px solid #d9e6f2',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
      }}>
        <iframe
          ref={iframeRef}
          src="https://forms.yandex.ru/u/6a00b5f2f47e738fd7e291f1?iframe=1"
          title="Форма для предложения праздника"
          width="100%"
          frameBorder="0"
          style={{
            border: 'none',
            display: 'block',
            minHeight: '970px',   // начальная высота, пока форма загружается
          }}
        />
      </div>
    </div>
  );
}