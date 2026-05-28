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
              <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2.5"/>
              <path d="M36 72 Q34 65 35 58 Q36 52 44 50 Q48 49 50 49 Q52 49 56 50 Q64 52 65 58 Q66 65 64 72" fill="currentColor"/>
              <path d="M44 50 Q43 44 44 40 Q45 36 50 35 Q55 34 56 38 Q57 42 56 50" fill="currentColor"/>
              <path d="M47 38 Q46 41 47 43 Q49 46 53 45 Q56 44 56 41 Q55 37 52 36 Q49 35 47 38Z" fill="currentColor"/>
              <path d="M44 38 Q41 34 42 30 Q44 28 46 31 Q47 34 45 38Z" fill="currentColor"/>
              <path d="M56 37 Q57 33 59 30 Q61 28 62 31 Q62 35 59 38Z" fill="currentColor"/>
              <path d="M44 32 Q40 25 37 20 M37 20 Q34 16 32 13 M37 20 Q33 19 30 18 M40 27 Q36 24 33 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <path d="M56 31 Q60 24 63 19 M63 19 Q66 15 68 12 M63 19 Q67 18 70 17 M60 26 Q64 23 67 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <path d="M43 72 Q42 77 41 82" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <path d="M47 73 Q47 78 46 83" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <path d="M53 73 Q54 78 54 83" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <path d="M58 72 Q59 77 60 82" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <path d="M36 60 Q32 58 31 55 Q32 53 35 55Z" fill="currentColor"/>
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
