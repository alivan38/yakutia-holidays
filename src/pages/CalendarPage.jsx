import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import { fetchHolidays } from '../api/holidaysApi';

const MIN_YEAR = 2000;
const MAX_YEAR = 2060;

function clampYear(year) {
  if (!Number.isFinite(year)) return new Date().getFullYear();
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.round(year)));
}

export default function CalendarPage() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewYear, setViewYear] = useState(() => clampYear(new Date().getFullYear()));
  const [yearInput, setYearInput] = useState(() => String(clampYear(new Date().getFullYear())));
  const calendarRef = useRef(null);

  useEffect(() => {
    fetchHolidays()
      .then(setHolidays)
      .catch(() => setHolidays([]))
      .finally(() => setLoading(false));
  }, []);

  const events = useMemo(() => holidays
    .filter(h => h.date)
    .map(h => {
      const [, month, day] = h.date.split('-');
      return {
        title: h.title,
        date: `${viewYear}-${month}-${day}`,
        color: '#1e5a96',
        textColor: '#ffffff',
        extendedProps: { description: h.description },
      };
    }), [holidays, viewYear]);

  const goToYear = useCallback((year) => {
    const next = clampYear(year);
    setViewYear(next);
    setYearInput(String(next));
    calendarRef.current?.getApi()?.gotoDate(`${next}-01-01`);
  }, []);

  const handleYearInputChange = e => {
    setYearInput(e.target.value);
  };

  const applyYearInput = () => {
    const parsed = parseInt(yearInput, 10);
    if (!Number.isNaN(parsed)) goToYear(parsed);
    else setYearInput(String(viewYear));
  };

  const handleYearKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyYearInput();
    }
  };

  if (loading) return (
    <div className="calendar-page">
      <p style={{ textAlign: 'center', marginTop: '2rem' }}>Загрузка календаря...</p>
    </div>
  );

  return (
    <>
      <div className="calendar-page">
        <h1 className="main-title">Календарь праздников</h1>

        <div className="calendar-year-bar">
          <label className="calendar-year-label" htmlFor="calendar-year-input">
            Год
          </label>
          <input
            id="calendar-year-input"
            className="calendar-year-input"
            type="number"
            min={MIN_YEAR}
            max={MAX_YEAR}
            step={1}
            value={yearInput}
            onChange={handleYearInputChange}
            onBlur={applyYearInput}
            onKeyDown={handleYearKeyDown}
            aria-label={`Год от ${MIN_YEAR} до ${MAX_YEAR}`}
          />
          <button
            type="button"
            className="calendar-year-btn"
            onClick={() => goToYear(viewYear - 1)}
            disabled={viewYear <= MIN_YEAR}
            aria-label="Предыдущий год"
          >
            −
          </button>
          <button
            type="button"
            className="calendar-year-btn"
            onClick={() => goToYear(viewYear + 1)}
            disabled={viewYear >= MAX_YEAR}
            aria-label="Следующий год"
          >
            +
          </button>
        </div>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin, multiMonthPlugin]}
          initialView="multiMonthYear"
          initialDate={`${viewYear}-01-01`}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'multiMonthYear,dayGridMonth' }}
          locale="ru"
          firstDay={1}
          events={events}
          height="auto"
          validRange={{
            start: `${MIN_YEAR}-01-01`,
            end: `${MAX_YEAR}-12-31`,
          }}
          datesSet={info => {
            const y = clampYear(info.view.currentStart.getFullYear());
            setViewYear(y);
            setYearInput(String(y));
          }}
        />
      </div>

      <footer className="site-footer">
        <div className="footer-content">
          <p>677000, Республика Саха (Якутия), г. Якутск, ул. Орджоникидзе, д. 4</p>
          <p className="copyright">&copy; 2026 ФГБОУ ВО «Арктический государственный институт искусств и культуры»</p>
        </div>
      </footer>
    </>
  );
}
