import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
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
  const [yearDraft, setYearDraft] = useState(() => String(clampYear(new Date().getFullYear())));
  const calendarRef = useRef(null);

  useEffect(() => {
    fetchHolidays()
      .then(setHolidays)
      .catch(() => setHolidays([]))
      .finally(() => setLoading(false));
  }, []);

  const goToYear = useCallback((year) => {
    const next = clampYear(year);
    setViewYear(next);
    setYearDraft(String(next));
    return next;
  }, []);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) api.gotoDate(`${viewYear}-01-01`);
  }, [viewYear]);

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

  const commitYearDraft = () => {
    const parsed = parseInt(yearDraft, 10);
    if (!Number.isNaN(parsed)) goToYear(parsed);
    else setYearDraft(String(viewYear));
  };

  const handleYearKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
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

        <div className="calendar-year-nav" role="group" aria-label="Выбор года">
          <button
            type="button"
            className="calendar-year-btn"
            onClick={() => goToYear(viewYear - 1)}
            disabled={viewYear <= MIN_YEAR}
            aria-label="Предыдущий год"
          >
            ‹
          </button>
          <input
            type="text"
            inputMode="numeric"
            className="calendar-year-value"
            value={yearDraft}
            onChange={e => setYearDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onBlur={commitYearDraft}
            onKeyDown={handleYearKeyDown}
            aria-label={`Год, от ${MIN_YEAR} до ${MAX_YEAR}`}
          />
          <button
            type="button"
            className="calendar-year-btn"
            onClick={() => goToYear(viewYear + 1)}
            disabled={viewYear >= MAX_YEAR}
            aria-label="Следующий год"
          >
            ›
          </button>
        </div>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate={`${viewYear}-01-01`}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: '',
          }}
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
            if (y !== viewYear) {
              setViewYear(y);
              setYearDraft(String(y));
            }
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
