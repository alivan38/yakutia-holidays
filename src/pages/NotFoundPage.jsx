import { Link, useLocation } from 'react-router-dom';

export default function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <div className="not-found-page">
      <div className="not-found-inner">
        <span className="not-found-code">404</span>
        <h1 className="not-found-title">Страница не найдена</h1>
        <p className="not-found-desc">
          Адрес <code>{pathname || '...'}</code> не существует.<br />
          Возможно, ссылка устарела или была введена с ошибкой.
        </p>
        <Link to="/" className="btn btn-accent not-found-btn">
          ← На главную
        </Link>
      </div>
    </div>
  );
}
