import { useState, useMemo, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import { useHolidays, useApprovedProposals } from '../hooks/useHolidays';
import { mergeHolidaysAndProposals } from '../utils/mergeHolidays';
import { getColorByPeople, MONTH_NAMES } from '../constants';

const MIN_YEAR = 2000;
const MAX_YEAR = 2060;

function clampYear(year) {
  if (!Number.isFinite(year)) {
    return Math.min(MAX_YEAR, Math.max(MIN_YEAR, new Date().getFullYear()));
  }
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.round(year)));
}

/** Месяц и день из даты каталога (год в записи не привязывает событие к одному году). */
function parseHolidayMonthDay(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('-');
  if (parts.length >= 3) {
    return { month: parts[1].padStart(2, '0'), day: parts[2].padStart(2, '0') };
  }
  if (parts.length === 2) {
    return { month: parts[0].padStart(2, '0'), day: parts[1].padStart(2, '0') };
  }
  return null;
}

function monthLabelFromDate(date) {
  return MONTH_NAMES[date.getMonth()];
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const calendarRef = useRef(null);
  const programmaticNavRef = useRef(false);

  const { data: holidays = [], isLoading: loadingHolidays } = useHolidays();
  const { data: approvedProposals = [], isLoading: loadingProposals } = useApprovedProposals();
  const today = new Date();
  /** Месяц (0–11), видимый в режиме «Месяц». */
  const visibleMonthRef = useRef(today.getMonth());
  const currentYear = clampYear(today.getFullYear());
  const [viewYear, setViewYear] = useState(currentYear);
  const [yearDraft, setYearDraft] = useState(String(currentYear));
  const [activeView, setActiveView] = useState('multiMonthYear');
  const [monthLabel, setMonthLabel] = useState(monthLabelFromDate(today));

  const loading = loadingHolidays || loadingProposals;

  const allHolidays = useMemo(
    () => mergeHolidaysAndProposals(holidays, approvedProposals),
    [holidays, approvedProposals],
  );

  const events = useMemo(() => allHolidays.flatMap(h => {
    const md = parseHolidayMonthDay(h.date);
    if (!md) return [];
    const color = getColorByPeople(h.people);
    return [{
      id: `${h.id}-${viewYear}`,
      title: h.title,
      date: `${viewYear}-${md.month}-${md.day}`,
      backgroundColor: color,
      borderColor: color,
      textColor: '#ffffff',
      extendedProps: { holidayId: h.id },
    }];
  }), [allHolidays, viewYear]);

  const yearRange = useMemo(() => ({
    start: `${viewYear}-01-01`,
    end: `${viewYear}-12-31`,
  }), [viewYear]);

  const gotoCalendarDate = useCallback((dateInput) => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    programmaticNavRef.current = true;
    api.gotoDate(dateInput);
    window.setTimeout(() => {
      programmaticNavRef.current = false;
      if (api.view.type === 'dayGridMonth') {
        const cursor = api.getDate();
        visibleMonthRef.current = cursor.getMonth();
        setMonthLabel(monthLabelFromDate(cursor));
      }
    }, 0);
  }, []);

  const applyViewYear = useCallback((next) => {
    flushSync(() => {
      setViewYear(next);
      setYearDraft(String(next));
    });
  }, []);

  const goToYear = useCallback((year, anchorDate) => {
    const next = clampYear(year);
    const api = calendarRef.current?.getApi();
    if (!api) return;

    if (anchorDate) {
      applyViewYear(next);
      gotoCalendarDate(anchorDate);
      return;
    }

    if (api.view.type === 'dayGridMonth') {
      const month = visibleMonthRef.current;
      applyViewYear(next);
      gotoCalendarDate(new Date(next, month, 1));
      return;
    }

    applyViewYear(next);
    gotoCalendarDate(new Date(next, 0, 1));
  }, [applyViewYear, gotoCalendarDate]);

  const shiftYear = useCallback((delta) => {
    goToYear(viewYear + delta);
  }, [goToYear, viewYear]);

  const goToToday = useCallback(() => {
    const now = new Date();
    goToYear(now.getFullYear(), now);
  }, [goToYear]);

  const handleDatesSet = useCallback((info) => {
    setActiveView(info.view.type);

    if (programmaticNavRef.current) return;

    if (info.view.type === 'dayGridMonth') {
      const cursor = info.view.calendar.getDate();
      visibleMonthRef.current = cursor.getMonth();
      setMonthLabel(monthLabelFromDate(cursor));
      const y = clampYear(cursor.getFullYear());
      setViewYear(y);
      setYearDraft(String(y));
    }
  }, []);

  const handleEventClick = useCallback((info) => {
    const holidayId = info.event.extendedProps.holidayId;
    if (holidayId != null) navigate(`/holiday/${holidayId}`);
  }, [navigate]);

  const commitYearDraft = () => {
    const parsed = parseInt(yearDraft, 10);
    if (Number.isNaN(parsed)) {
      setYearDraft(String(viewYear));
      return;
    }
    const next = clampYear(parsed);
    if (next !== viewYear) goToYear(next);
    else setYearDraft(String(next));
  };

  const handleYearKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const initialDate = useMemo(() => {
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${currentYear}-${m}-${d}`;
  }, []);

  if (loading) return (
    <div className="calendar-page">
      <p style={{ textAlign: 'center', marginTop: '2rem' }}>Загрузка календаря...</p>
    </div>
  );

  return (
    <>
      <div className="calendar-page">
        <h1 className="main-title">Календарь праздников</h1>

        <div className="calendar-year-nav">
          <button
            type="button"
            className="calendar-year-btn"
            onClick={() => shiftYear(-1)}
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
            onClick={() => shiftYear(1)}
            disabled={viewYear >= MAX_YEAR}
            aria-label="Следующий год"
          >
            ›
          </button>
          <button
            type="button"
            className="calendar-year-today"
            onClick={goToToday}
          >
            Сегодня
          </button>
        </div>

        {activeView === 'dayGridMonth' && (
          <p className="calendar-month-caption" aria-live="polite">
            {monthLabel}
          </p>
        )}

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView="multiMonthYear"
          initialDate={initialDate}
          datesSet={handleDatesSet}
          headerToolbar={{
            left: activeView === 'dayGridMonth' ? 'prev,next' : '',
            center: '',
            right: 'multiMonthYear,dayGridMonth',
          }}
          buttonText={{
            month: 'Месяц',
            multiMonthYear: 'Год',
          }}
          locale="ru"
          firstDay={1}
          events={events}
          eventClick={handleEventClick}
          height="auto"
          validRange={yearRange}
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
