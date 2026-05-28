import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">🌿</span>
          <span className="footer-title">Праздники народов Якутии</span>
        </div>

        <nav className="footer-nav" aria-label="Навигация подвала">
          <Link to="/">Главная</Link>
          <Link to="/calendar">Календарь</Link>
          <Link to="/contribute">Добавить праздник</Link>
        </nav>

        <p className="footer-copy">
          © {year} Народы Якутии и Севера. Все права защищены.
        </p>
      </div>
    </footer>
  );
}
