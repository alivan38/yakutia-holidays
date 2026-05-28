import { useState, useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import { fetchHolidays } from '../api/holidaysApi';

export default function CalendarPage() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHolidays()
      .then(setHolidays)
      .catch(() => setHolidays([]))
      .finally(() => setLoading(false));
  }, []);

  const events = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return holidays
      .filter(h => h.date)
      .map(h => {
        const [, month, day] = h.date.split('-');
        return {
          title: h.title,
          date: `${currentYear}-${month}-${day}`,
          color: '#1e5a96',
          textColor: '#ffffff',
          extendedProps: { description: h.description },
        };
      });
  }, [holidays]);

  if (loading) return (
    <div className="calendar-page">
      <p style={{ textAlign: 'center', marginTop: '2rem' }}>Загрузка календаря...</p>
    </div>
  );

  return (
    <>
      <div className="calendar-page">
        <h1 className="main-title">Календарь праздников</h1>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin, multiMonthPlugin]}
          initialView="multiMonthYear"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'multiMonthYear,dayGridMonth' }}
          locale="ru"
          firstDay={1}
          events={events}
          height="auto"
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
