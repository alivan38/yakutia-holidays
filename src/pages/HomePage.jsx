import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useHolidays, useApprovedProposals } from '../hooks/useHolidays';
import {
  MONTH_NAMES, getColorByPeople, truncate, formatDateShort, formatDateLong, resolveImages, getCoverImage,
} from '../constants';
import DrumPicker from '../components/DrumPicker';

const TYPEWRITER_WORDS = ['традиции', 'обряды', 'праздники'];

function getUpcomingHoliday(holidays) {
  const today = new Date();
  const thisYear = today.getFullYear();
  const upcoming = holidays
    .filter(h => h.date)
    .flatMap(h => {
      const [, month, day] = h.date.split('-');
      return [
        { ...h, dateObj: new Date(`${thisYear}-${month}-${day}`) },
        { ...h, dateObj: new Date(`${thisYear + 1}-${month}-${day}`) },
      ];
    })
    .filter(h => h.dateObj >= today)
    .sort((a, b) => a.dateObj - b.dateObj);
  return upcoming[0] || null;
}

function daysUntil(dateObj) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((dateObj - today) / 86400000);
}

function useTypewriter(
  words,
  { typingSpeed = 90, deletingSpeed = 45, pauseAfterWord = 1800, pauseBeforeType = 300 } = {}
) {
  const [displayed, setDisplayed] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState('typing');
  const jitter = useCallback(base => base + Math.random() * base * 0.4 - base * 0.2, []);

  useEffect(() => {
    const current = words[wordIndex % words.length];
    let timeout;
    if (phase === 'typing') {
      if (displayed.length < current.length)
        timeout = setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), jitter(typingSpeed));
      else
        timeout = setTimeout(() => setPhase('pausing'), pauseAfterWord);
    } else if (phase === 'pausing') {
      setPhase('deleting');
    } else if (phase === 'deleting') {
      if (displayed.length > 0)
        timeout = setTimeout(() => setDisplayed(current.slice(0, displayed.length - 1)), jitter(deletingSpeed));
      else
        setPhase('waiting');
    } else if (phase === 'waiting') {
      timeout = setTimeout(() => { setWordIndex(i => (i + 1) % words.length); setPhase('typing'); }, pauseBeforeType);
    }
    return () => clearTimeout(timeout);
  }, [displayed, phase, wordIndex, words, typingSpeed, deletingSpeed, pauseAfterWord, pauseBeforeType, jitter]);

  return displayed;
}

function HolidayCardSkeleton() {
  return (
    <div className="holiday-card" style={{ pointerEvents: 'none' }}>
      <div className="holiday-card-media skeleton" />
      <div className="holiday-card-body">
        <div className="skeleton skeleton-text skeleton-heading" />
        <div className="skeleton skeleton-text" style={{ width: '50%' }} />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text" style={{ width: '70%' }} />
      </div>
    </div>
  );
}

const PAGE_SIZE = 6;

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [selectedPeople, setSelectedPeople] = useState('Все');
  const [selectedMonth, setSelectedMonth] = useState('Все');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const catalogRef = useRef(null);
  const typedWord = useTypewriter(TYPEWRITER_WORDS);

  const { data: holidays = [], isLoading: loadingHolidays, isError: errorHolidays } = useHolidays();
  const { data: approvedProposals = [] } = useApprovedProposals();

  const allHolidays = useMemo(() => [
    ...holidays,
    ...approvedProposals.map(p => ({
      id: `proposal-${p.id}`,
      title: p.title,
      people: p.people,
      description: p.description,
      fullDescription: p.description,
      date: '',
      tags: [],
      images: resolveImages(p),
      isProposal: true,
    })),
  ], [holidays, approvedProposals]);

  const allPeoples = useMemo(() => ['Все', ...new Set(allHolidays.map(h => h.people))], [allHolidays]);
  const allMonths = useMemo(() => ['Все', ...MONTH_NAMES], []);

  const filteredHolidays = useMemo(() => allHolidays.filter(h => {
    const matchSearch = h.title.toLowerCase().includes(search.toLowerCase())
      || h.description.toLowerCase().includes(search.toLowerCase());
    const matchPeople = selectedPeople === 'Все' || h.people === selectedPeople;
    if (!h.date) return matchSearch && matchPeople;
    const matchMonth = selectedMonth === 'Все'
      || MONTH_NAMES[parseInt(h.date.split('-')[1], 10) - 1] === selectedMonth;
    return matchSearch && matchPeople && matchMonth;
  }), [search, selectedPeople, selectedMonth, allHolidays]);

  const visibleHolidays = filteredHolidays.slice(0, visibleCount);
  const hasMore = visibleCount < filteredHolidays.length;

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, selectedPeople, selectedMonth]);

  const upcoming = useMemo(() => getUpcomingHoliday(holidays), [holidays]);
  const isFiltered = selectedPeople !== 'Все' || selectedMonth !== 'Все';

  const handleSearchSubmit = e => {
    e.preventDefault();
    catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetFilters = () => {
    setSelectedPeople('Все');
    setSelectedMonth('Все');
  };

  return (
    <div className="home-page">
      {/* ── Hero ── */}
      <section className="hero">
        {/* Слоистые SVG-фигуры (как в макете Figma) */}
        <svg className="hero-shape hero-shape-violet" viewBox="0 0 1920 935" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <path d="M1522.4 450.901C1330.85 520.27 1206.31 615.406 1070.78 744.73C935.244 874.054 751.696 935 457.119 935H0V0H1920V381.532C1920 381.532 1713.95 381.532 1522.4 450.901Z" fill="var(--accent)"/>
        </svg>
        <svg className="hero-shape hero-shape-blue" viewBox="0 0 919 755" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <path d="M918.5 670.5C851.442 705.732 759.423 727.061 725.5 732.5C691.577 737.939 584.413 754.911 454 755H0V0L663.111 1.49406C849.797 223.611 917.256 470.2 918.5 670.5Z" fill="var(--primary)"/>
        </svg>
        {/* Декоративные круги */}
        <span className="hero-circle hero-circle-1" aria-hidden="true" />
        <span className="hero-circle hero-circle-2" aria-hidden="true" />

        <div className="hero-overlay">
          {/* Левая колонка: заголовок */}
          <div className="hero-left">
            <h1>Праздники и обряды коренных народов Якутии</h1>
            <div className="hero-subtitle">
              <span className="hero-subtitle-static">Откройте для себя </span>
              <span className="typewriter-line">
                <span className="typewriter-word">{typedWord}</span>
                <span className="typewriter-cursor" aria-hidden="true">|</span>
              </span>
            </div>
          </div>

          {/* Правая колонка: поиск + ближайший праздник */}
          <div className="hero-right">
            <form onSubmit={handleSearchSubmit} className="hero-search">
              <svg className="hero-search-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Ысыах, Бакалдын, Хэбденэк…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="hero-search-input"
                aria-label="Поиск праздника"
              />
              <button type="submit" className="hero-search-btn" aria-label="Найти">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </form>

            {upcoming && (
              <div className="hero-upcoming">
                <span className="upcoming-label">Ближайший праздник</span>
                <Link to={`/holiday/${upcoming.id}`} className="upcoming-card">
                  <div
                    className="upcoming-icon-block"
                    style={{ background: getColorByPeople(upcoming.people) }}
                  >
                    {upcoming.title[0]}
                  </div>
                  <div className="upcoming-info">
                    <div className="upcoming-people">{upcoming.people}</div>
                    <div className="upcoming-name">{upcoming.title}</div>
                    <div className="upcoming-date">
                      {formatDateShort(upcoming.dateObj)} {upcoming.dateObj.getFullYear()}
                    </div>
                    <span className="upcoming-countdown">
                      {daysUntil(upcoming.dateObj) === 0
                        ? 'Сегодня!'
                        : `Через ${daysUntil(upcoming.dateObj)} дн.`}
                    </span>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Drum-picker фильтры ── */}
      <section className="drum-section" ref={catalogRef}>
        <div className="drum-filters">
          <div className="drum-row">
            <DrumPicker
              items={allPeoples}
              value={selectedPeople}
              onChange={setSelectedPeople}
            />
          </div>
          <div className="drum-divider" />
          <div className="drum-row">
            <DrumPicker
              items={allMonths}
              value={selectedMonth}
              onChange={setSelectedMonth}
            />
          </div>
          {isFiltered && (
            <button className="filter-reset-btn" onClick={resetFilters}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Сбросить фильтры
            </button>
          )}
        </div>
      </section>

      {/* ── Каталог праздников ── */}
      <section className="holidays-section">
        <h2>Праздники народов Якутии</h2>
        <div className="holidays-preview-grid">
          {loadingHolidays ? (
            Array.from({ length: 6 }).map((_, i) => <HolidayCardSkeleton key={i} />)
          ) : errorHolidays ? (
            <p className="no-results">⚠️ Не удалось загрузить праздники. Проверьте подключение к серверу.</p>
          ) : visibleHolidays.length > 0 ? visibleHolidays.map(h => {
            const cover = getCoverImage(h);
            return (
            <Link to={`/holiday/${h.id}`} key={h.id} className="holiday-card">
              <div
                className={`holiday-card-media${cover ? ' has-image' : ''}`}
                style={{ backgroundColor: getColorByPeople(h.people) }}
              >
                {cover ? (
                  <img
                    className="holiday-card-img"
                    src={cover}
                    alt={h.title}
                    loading="lazy"
                    onError={(e) => {
                      // Если фото не загрузилось — возвращаемся к градиенту с буквой
                      e.currentTarget.parentElement.classList.remove('has-image');
                      e.currentTarget.remove();
                    }}
                  />
                ) : (
                  <span className="holiday-card-icon">{h.title[0]}</span>
                )}
              </div>
              <div className="holiday-card-body">
                <p className="holiday-card-people">{h.people}</p>
                <h3 className="holiday-card-title">{h.title}</h3>
                <p className="holiday-card-desc">{truncate(h.description, 90)}</p>
                {h.date && (
                  <div className="holiday-card-date">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    {formatDateLong(h.date)}
                  </div>
                )}
                {h.isProposal && <span className="proposal-dot" title="Недавно добавлен" />}
              </div>
            </Link>
          );
          }) : (
            <p className="no-results">Ничего не найдено</p>
          )}
        </div>

        {hasMore && (
          <div className="show-more-wrap">
            <button className="show-more-btn" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
              Показать ещё праздники
            </button>
          </div>
        )}
      </section>

      {/* ── CTA ── */}
      <section className="contribute-section">
        <div className="contribute-content">
          <h2>Знаете неизвестный праздник?</h2>
          <p>Помогите сохранить культурное наследие — расскажите о праздниках и обрядах, которые ещё не описаны на нашем сайте.</p>
          <Link to="/contribute" className="btn btn-accent cta-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
            </svg>
            Добавить данные
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="site-footer">
        <div className="footer-content">
          <p>677000, Республика Саха (Якутия), г. Якутск, ул. Орджоникидзе, д. 4</p>
          <p className="copyright">© 2026 ФГБОУ ВО «Арктический государственный институт искусств и культуры»</p>
        </div>
      </footer>
    </div>
  );
}
