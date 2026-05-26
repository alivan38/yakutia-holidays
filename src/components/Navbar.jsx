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
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 6 L20 14 L28 14 L22 19 L24 27 L16 22 L8 27 L10 19 L4 14 L12 14 Z"
                fill="currentColor" opacity="0.85"/>
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
