import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";

const NAV_LINKS = [
  { to: "/",          label: "Главная",   icon: "🏠" },
  { to: "/calendar",  label: "Календарь", icon: "📅" },
  { to: "/contribute",label: "Добавить",  icon: "✍️" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <header className={`navbar${scrolled ? " navbar--scrolled" : ""}${menuOpen ? " navbar--open" : ""}` }>
        <div className="navbar-inner">
          <NavLink to="/" className="navbar-logo" aria-label="На главную">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="36" height="36" aria-hidden="true">
              <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="3"/>
              <ellipse cx="50" cy="58" rx="16" ry="11" fill="currentColor"/>
              <rect x="47" y="44" width="8" height="12" rx="3" fill="currentColor"/>
              <ellipse cx="51" cy="41" rx="7" ry="6" fill="currentColor"/>
              <ellipse cx="55" cy="43" rx="4" ry="3" fill="currentColor"/>
              <ellipse cx="45" cy="36" rx="2.5" ry="4" fill="currentColor" transform="rotate(-15 45 36)"/>
              <ellipse cx="55" cy="35" rx="2.5" ry="4" fill="currentColor" transform="rotate(15 55 35)"/>
              <line x1="46" y1="34" x2="38" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="38" y1="20" x2="33" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="38" y1="20" x2="34" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="38" y1="26" x2="32" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="54" y1="33" x2="62" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="62" y1="19" x2="67" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="62" y1="19" x2="66" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="62" y1="25" x2="68" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="40" y1="67" x2="38" y2="80" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
              <line x1="45" y1="68" x2="44" y2="81" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
              <line x1="55" y1="68" x2="56" y2="81" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
              <line x1="60" y1="67" x2="62" y2="80" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
              <ellipse cx="34" cy="57" rx="4" ry="3" fill="currentColor" transform="rotate(-20 34 57)"/>
            </svg>
            <span className="navbar-logo-text">
              <span className="navbar-logo-primary">Якутия</span>
              <span className="navbar-logo-secondary">Праздники</span>
            </span>
          </NavLink>

          <nav className="navbar-links" aria-label="Основная навигация">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `navbar-link${isActive ? " navbar-link--active" : ""}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <button
            className="navbar-burger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menuOpen}
          >
            <span className={`burger-line${menuOpen ? " burger-line--1-open" : ""}`} />
            <span className={`burger-line${menuOpen ? " burger-line--2-open" : ""}`} />
            <span className={`burger-line${menuOpen ? " burger-line--3-open" : ""}`} />
          </button>
        </div>
      </header>

      <div
        className={`mobile-menu${menuOpen ? " mobile-menu--open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <nav className="mobile-menu-links" aria-label="Мобильная навигация">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `mobile-menu-link${isActive ? " mobile-menu-link--active" : ""}`
              }
            >
              <span className="mobile-menu-icon">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {menuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
