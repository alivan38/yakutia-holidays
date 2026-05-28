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
            <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
              width="36" height="36" viewBox="0 0 1254 1254"
              preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <g transform="translate(0,1254) scale(0.1,-0.1)" fill="currentColor" stroke="none">
                <path d="M5920 11749 c-1173 -84 -2220 -509 -3120 -1267 -169 -143 -520 -496 -658 -663 -378 -455 -661 -920 -896 -1470 -219 -512 -365 -1106 -417 -1704 -17 -194 -14 -670 5 -880 73 -775 299 -1484 694 -2180 552 -974 1403 -1776 2412 -2274 813 -402 1685 -586 2562 -543 351 18 583 48 900 118 737 163 1455 492 2073 951 1060 788 1835 1988 2110 3268 93 433 125 731 125 1161 0 504 -59 938 -196 1434 -492 1780 -1812 3206 -3497 3779 -430 146 -880 236 -1352 271 -161 11 -575 11 -745 -1z m781 -169 c1663 -129 3181 -1087 4069 -2570 708 -1182 945 -2556 664 -3855 -314 -1456 -1261 -2756 -2554 -3505 -1168 -677 -2535 -878 -3830 -564 -386 94 -884 292 -1255 499 -1365 761 -2352 2058 -2695 3540 -88 383 -124 701 -124 1120 0 294 8 430 45 695 137 989 575 1965 1240 2760 128 154 405 438 559 574 636 562 1365 953 2149 1152 289 74 690 139 966 157 125 8 644 6 766 -3z"/>
                <path d="M6008 10893 l-133 -167 -5 -478 -5 -478 -320 320 c-176 176 -327 320 -336 320 -9 0 -19 -6 -21 -12 -12 -35 42 -520 62 -558 5 -10 97 -99 202 -197 106 -98 311 -289 456 -425 161 -151 296 -269 346 -303 150 -100 285 -154 589 -236 321 -86 378 -112 449 -200 28 -35 61 -109 52 -118 -2 -2 -43 14 -92 37 -49 23 -129 53 -178 69 -88 27 -91 27 -421 31 -327 3 -333 3 -333 -17 0 -27 276 -357 337 -402 105 -79 209 -112 410 -129 70 -6 129 -12 130 -14 2 -2 -24 -225 -57 -497 -33 -272 -73 -606 -89 -742 -16 -137 -31 -251 -34 -253 -6 -7 -532 -152 -1482 -409 -236 -64 -559 -152 -716 -196 l-287 -79 -476 0 c-455 0 -476 -1 -476 -18 0 -29 328 -351 397 -389 59 -33 141 -56 246 -68 49 -6 57 -9 52 -23 -3 -9 -55 -201 -115 -427 -60 -225 -119 -447 -131 -492 l-22 -82 -193 -160 c-106 -88 -200 -171 -208 -183 -17 -27 -492 -1695 -498 -1748 l-3 -25 150 -2 c83 -2 155 0 161 5 9 6 175 320 571 1085 l119 229 104 54 c352 184 550 285 550 279 0 -3 -54 -100 -120 -215 -66 -114 -120 -213 -120 -219 0 -9 834 -1132 891 -1199 18 -21 24 -22 223 -22 154 0 206 3 214 13 11 13 1 32 -539 973 -121 210 -219 386 -219 391 0 9 364 587 456 723 26 39 35 45 69 48 22 1 308 23 635 47 327 25 656 50 730 55 74 6 161 13 192 16 l58 6 -5 -29 c-4 -25 -157 -1112 -265 -1892 -23 -161 -40 -305 -38 -320 l3 -26 130 -3 c72 -1 135 1 141 5 6 5 46 116 89 248 230 715 708 2135 718 2135 18 -1 756 -176 761 -181 6 -6 -161 -700 -171 -708 -4 -4 -63 -47 -130 -96 l-123 -89 0 -293 c0 -264 2 -293 16 -293 9 0 146 97 303 215 l287 215 162 443 c89 243 194 529 233 635 39 107 68 199 66 206 -3 6 -116 84 -251 171 -613 397 -665 432 -660 452 2 10 42 187 89 395 47 207 85 392 85 412 0 20 -33 141 -74 268 -76 237 -294 938 -317 1016 -7 23 -9 45 -6 49 7 6 353 76 686 137 101 19 189 40 196 48 29 32 195 310 195 327 0 10 -6 23 -12 29 -7 5 -200 91 -428 190 -228 99 -554 240 -723 313 l-308 134 3 30 3 30 405 135 c426 142 506 177 606 261 149 126 214 267 214 470 0 141 -3 142 -143 11 -130 -121 -229 -195 -362 -271 l-90 -51 -5 367 c-5 356 -6 368 -24 368 -14 0 -54 -45 -127 -140 l-108 -140 -1 -125 c0 -143 -14 -212 -62 -304 -41 -78 -145 -182 -225 -224 -54 -29 -192 -72 -230 -72 -11 0 -13 109 -13 625 0 529 -2 625 -14 625 -8 0 -77 -81 -155 -179 l-141 -179 0 -441 c0 -400 -2 -441 -16 -441 -9 0 -98 21 -198 46 -367 93 -500 142 -621 228 -153 110 -252 279 -271 464 l-7 61 277 279 c276 278 276 279 286 334 14 73 9 460 -6 465 -6 2 -56 -56 -111 -129 -98 -130 -304 -358 -477 -528 l-86 -85 0 507 c0 278 -3 513 -6 522 -3 9 -12 16 -19 16 -7 0 -73 -75 -147 -167z"/>
              </g>
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
