import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import holidaysExtended from "../data/holidaysExtended";

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const PEOPLES = ["Якуты", "Эвенки", "Эвены", "Юкагиры", "Долганы", "Чукчи"];

function getColorByPeople(people) {
  const colors = {
    "Якуты": "#1e5a96",
    "Эвенки": "#0b3d5e",
    "Эвены": "#2a6b8f",
    "Юкагиры": "#3e7ba0",
    "Долганы": "#165374",
    "Чукчи": "#0f2e44",
  };
  return colors[people] || "#1e5a96";
}

function truncate(text, maxLength) {
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

function getUpcomingHoliday(holidays) {
  const today = new Date();
  const thisYear = today.getFullYear();
  const upcoming = holidays
    .flatMap((h) => {
      const [_, month, day] = h.date.split("-");
      const dateThisYear = new Date(`${thisYear}-${month}-${day}`);
      const dateNextYear = new Date(`${thisYear + 1}-${month}-${day}`);
      return [
        { ...h, dateObj: dateThisYear },
        { ...h, dateObj: dateNextYear },
      ];
    })
    .filter((h) => h.dateObj >= today)
    .sort((a, b) => a.dateObj - b.dateObj);
  return upcoming.length > 0 ? upcoming[0] : null;
}

function formatDateShort(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

function daysUntil(dateObj) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = dateObj.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [selectedPeople, setSelectedPeople] = useState("Все");
  const [selectedMonth, setSelectedMonth] = useState("Все");
  const catalogRef = useRef(null);

  // ===== Глобальное интерактивное пятно =====
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseMove = (e) => {
    setMousePos({
      x: e.clientX,
      y: e.clientY,
    });
  };
  const handleMouseLeave = () => setIsHovering(false);
  // ==============================================

  const allPeoples = useMemo(() => {
    const peoples = holidaysExtended.map((h) => h.people);
    return ["Все", ...new Set(peoples)];
  }, []);

  const filteredHolidays = useMemo(() => {
    return holidaysExtended.filter((h) => {
      const matchSearch =
        h.title.toLowerCase().includes(search.toLowerCase()) ||
        h.description.toLowerCase().includes(search.toLowerCase());
      const matchPeople =
        selectedPeople === "Все" || h.people === selectedPeople;
      const holidayMonth = h.date.split("-")[1];
      const monthIndex = parseInt(holidayMonth, 10) - 1;
      const matchMonth =
        selectedMonth === "Все" || MONTH_NAMES[monthIndex] === selectedMonth;
      return matchSearch && matchPeople && matchMonth;
    });
  }, [search, selectedPeople, selectedMonth]);

  const upcoming = useMemo(
    () => getUpcomingHoliday(holidaysExtended),
    []
  );

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    catalogRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className="home-page"
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >


      <section className="hero">
        <div className="hero-overlay">
          <h1>Праздники и обряды северных народов Республики Саха (Якутия)</h1>
          <p>
            Добро пожаловать в мир древних традиций, обрядов и праздников,
            бережно хранимых народами Севера на суровой и прекрасной земле
            Якутии.
          </p>
          <form onSubmit={handleSearchSubmit} className="hero-search">
            <input
              type="text"
              placeholder="Поиск праздника..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="hero-search-input"
            />
            <button type="submit" className="btn hero-search-btn">
              <svg
                width="20"
                height="20"
                viewBox="0 0 56 56"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M43.5797 45.7492L30.2447 32.4118C24.3126 36.6293 16.1384 35.5977 11.4401 30.0387C6.74176 24.4797 7.08674 16.2479 12.2337 11.1015C17.3793 5.95289 25.6119 5.60642 31.1719 10.3045C36.732 15.0026 37.7641 23.1776 33.5464 29.1102L46.8814 42.4475L43.582 45.7469L43.5797 45.7492ZM22.1317 11.6662C17.707 11.6652 13.8896 14.7711 12.9908 19.1035C12.092 23.436 14.3587 27.8042 18.4186 29.5634C22.4785 31.3227 27.2158 29.9895 29.7623 26.371C32.3087 22.7525 31.9645 17.8433 28.938 14.6155L30.3497 16.0155L28.7584 14.4289L28.7304 14.4009C26.9845 12.6443 24.6083 11.6595 22.1317 11.6662Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </form>
        </div>
      </section>

      <hr className="section-divider" />

      <section className="peoples-section">
        <h2>НАРОДЫ СЕВЕРА ЯКУТИИ</h2>
        <div className="peoples-grid">
          {PEOPLES.map((name) => (
            <Link
              key={name}
              to={`/people/${encodeURIComponent(name)}`}
              className="people-card"
            >
              {name}
            </Link>
          ))}
        </div>
      </section>

      {/* Каталог праздников */}
      <section className="holidays-section" ref={catalogRef}>
        <h2>ПРАЗДНИКИ И ОБРЯДЫ</h2>
        <div className="filters">
          <select
            value={selectedPeople}
            onChange={(e) => setSelectedPeople(e.target.value)}
          >
            {allPeoples.map((people) => (
              <option key={people} value={people}>
                {people}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="Все">Все месяцы</option>
            {MONTH_NAMES.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>
        <div className="holidays-preview-grid">
          {filteredHolidays.length > 0 ? (
            filteredHolidays.map((h) => (
              <Link
                to={`/holiday/${h.id}`}
                key={h.id}
                className="holiday-preview-card"
              >
                <div
                  className="holiday-preview-img"
                  style={{ backgroundColor: getColorByPeople(h.people) }}
                >
                  {h.title[0]}
                </div>
                <div className="holiday-preview-content">
                  <h3>{h.title}</h3>
                  <p>{truncate(h.description, 100)}</p>
                </div>
              </Link>
            ))
          ) : (
            <p className="no-results">Праздники не найдены</p>
          )}
        </div>
      </section>

      <div className="section-divider"></div>

      {/* Ближайший праздник */}
      {upcoming && (
        <section className="upcoming-section">
          <h2>БЛИЖАЙШИЙ ПРАЗДНИК</h2>
          <div className="upcoming-card">
            <div
              className="upcoming-img"
              style={{ backgroundColor: getColorByPeople(upcoming.people) }}
            >
              <span className="upcoming-icon">{upcoming.title[0]}</span>
            </div>
            <div className="upcoming-details">
              <h3>{upcoming.title}</h3>
              <p className="upcoming-people">{upcoming.people}</p>
              <p className="upcoming-date">
                {formatDateShort(upcoming.dateObj)}{" "}
                {upcoming.dateObj.getFullYear()}
              </p>
              <p className="upcoming-description">
                {truncate(upcoming.description, 120)}
              </p>
              <div className="upcoming-countdown">
                {daysUntil(upcoming.dateObj) === 0
                  ? "Сегодня!"
                  : `Через ${daysUntil(upcoming.dateObj)} дней`}
              </div>
              <Link
                to={`/holiday/${upcoming.id}`}
                className="btn"
              >
                ПОДРОБНЕЕ →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Помощь в наполнении */}
      <section className="contribute-section">
        <h2>ЗНАЕТЕ НЕИЗВЕСТНЫЙ ПРАЗДНИК?</h2>
        <p>
          Помогите нам сохранить культурное наследие – расскажите о праздниках и обрядах,
          которые ещё не описаны на нашем сайте.
        </p>
        <Link to="/contribute" className="btn">
          ДОБАВИТЬ ДАННЫЕ →
        </Link>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-content">
          <h3>СЕВЕРНЫЕ ТРАДИЦИИ ЯКУТИИ</h3>
          <p>
            Сохранение и развитие культурного наследия северных народов
            Республики Саха (Якутия).
          </p>
          <p className="copyright">&copy; 2024 Северные традиции Якутии</p>
        </div>
      </footer>

      {/* Глобальное световое пятно */}
      <div
        className="mouse-glow"
        style={{
          left: mousePos.x,
          top: mousePos.y,
          opacity: isHovering ? 1 : 0,
        }}
      />
    </div>
  );
}