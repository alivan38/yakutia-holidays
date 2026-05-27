import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchApprovedProposals } from '../api/proposalsApi';
import { fetchHolidays } from '../api/holidaysApi';
import {
  MONTH_NAMES, getColorByPeople, truncate, formatDateShort, resolveImages,
} from '../constants';

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

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [selectedPeople, setSelectedPeople] = useState('Все');
  const [selectedMonth, setSelectedMonth] = useState('Все');
  const catalogRef = useRef(null);
  const [holidays, setHolidays] = useState([]);
  const [approvedProposals, setApprovedProposals] = useState([]);
  const typedWord = useTypewriter(TYPEWRITER_WORDS);

  useEffect(() => {
    fetchHolidays().then(setHolidays).catch(() => setHolidays([]));
    fetchApprovedProposals().then(setApprovedProposals).catch(() => setApprovedProposals([]));
  }, []);

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

  const filteredHolidays = useMemo(() => allHolidays.filter(h => {
    const matchSearch = h.title.toLowerCase().includes(search.toLowerCase())
      || h.description.toLowerCase().includes(search.toLowerCase());
    const matchPeople = selectedPeople === 'Все' || h.people === selectedPeople;
    if (!h.date) return matchSearch && matchPeople;
    const matchMonth = selectedMonth === 'Все'
      || MONTH_NAMES[parseInt(h.date.split('-')[1], 10) - 1] === selectedMonth;
    return matchSearch && matchPeople && matchMonth;
  }), [search, selectedPeople, selectedMonth, allHolidays]);

  const upcoming = useMemo(() => getUpcomingHoliday(holidays), [holidays]);

  const handleSearchSubmit = e => {
    e.preventDefault();
    catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-overlay">
          <h1>Праздники и обряды коренных народов Якутии</h1>
          <div className="hero-subtitle">
            <span className="hero-subtitle-static">Откройте для себя</span>
            <span className="typewriter-line">
              <span className="typewriter-word">{typedWord}</span>
              <span className="typewriter-cursor" aria-hidden="true"></span>
            </span>
          </div>
          <form onSubmit={handleSearchSubmit} className="hero-search">
            <input
              type="text"
              placeholder="Поиск праздника..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="hero-search-input"
            />
            <button type="submit" className="hero-search-btn">
              <svg width="20" height="20" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M43.5797 45.7492L30.2447 32.4118C24.3126 36.6293 16.1384 35.5977 11.4401 30.0387C6.74176 24.4797 7.08674 16.2479 12.2337 11.1015C17.3793 5.95289 25.6119 5.60642 31.1719 10.3045C36.732 15.0026 37.7641 23.1776 33.5464 29.1102L46.8814 42.4475L43.582 45.7469L43.5797 45.7492ZM22.1317 11.6662C17.707 11.6652 13.8896 14.7711 12.9908 19.1035C12.092 23.436 14.3587 27.8042 18.4186 29.5634C22.4785 31.3227 27.2158 29.9895 29.7623 26.371C32.3087 22.7525 31.9645 17.8433 28.938 14.6155L30.3497 16.0155L28.7584 14.4289L28.7304 14.4009C26.9845 12.6443 24.6083 11.6595 22.1317 11.6662Z" fill="currentColor"/>
              </svg>
              Найти
            </button>
          </form>
        </div>
      </section>

      {/* Каталог */}
      <section className="holidays-section" ref={catalogRef}>
        <h2>Праздники и обряды</h2>
        <div className="filters">
          <select value={selectedPeople} onChange={e => setSelectedPeople(e.target.value)}>
            {allPeoples.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            <option value="Все">Все месяцы</option>
            {MONTH_NAMES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="holidays-preview-grid">
          {filteredHolidays.length > 0 ? filteredHolidays.map(h => (
            <Link to={`/holiday/${h.id}`} key={h.id} className="holiday-card">
              <div className="holiday-card-media" style={{ backgroundColor: getColorByPeople(h.people) }}>
                <span className="holiday-card-icon">{h.title[0]}</span>
              </div>
              <div className="holiday-card-body">
                <h3>{h.title}</h3>
                <p className="holiday-card-people">{h.people}</p>
                <p className="holiday-card-desc">{truncate(h.description, 90)}</p>
                {h.isProposal && <span className="proposal-dot" title="Недавно добавлен"></span>}
              </div>
            </Link>
          )) : (
            <p className="no-results">Ничего не найдено</p>
          )}
        </div>
      </section>

      {/* Ближайший праздник */}
      {upcoming && (
        <section className="upcoming-section">
          <div className="upcoming-card">
            <div className="upcoming-icon-block" style={{ backgroundColor: getColorByPeople(upcoming.people) }}>
              <span className="upcoming-icon">{upcoming.title[0]}</span>
            </div>
            <div className="upcoming-details">
              <h3>{upcoming.title}</h3>
              <p className="upcoming-people">{upcoming.people}</p>
              <p className="upcoming-date">{formatDateShort(upcoming.dateObj)} {upcoming.dateObj.getFullYear()}</p>
              <p className="upcoming-description">{truncate(upcoming.description, 120)}</p>
              <div className="upcoming-countdown">
                {daysUntil(upcoming.dateObj) === 0 ? 'Сегодня!' : `Через ${daysUntil(upcoming.dateObj)} дн.`}
              </div>
              <Link to={`/holiday/${upcoming.id}`} className="btn">Подробнее →</Link>
            </div>
          </div>
        </section>
      )}

      {/* Помощь */}
      <section className="contribute-section">
        <div className="contribute-content">
          <h2>Знаете неизвестный праздник?</h2>
          <p>Помогите сохранить культурное наследие — расскажите о праздниках и обрядах, которые ещё не описаны на нашем сайте.</p>
          <Link to="/contribute" className="btn btn-accent">Добавить данные →</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-content">
          <p>677000, Республика Саха (Якутия), г. Якутск, ул. Орджоникидзе, д. 4</p>
          <p className="copyright">© 2026 ФГБОУ ВО «Арктический государственный институт искусств и культуры»</p>
        </div>
      </footer>
    </div>
  );
}
