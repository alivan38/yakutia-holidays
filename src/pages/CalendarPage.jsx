import { useState, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";
import { fetchHolidays } from "../api/holidaysApi";

export default function CalendarPage() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHolidays()
      .then(setHolidays)
      .catch(() => setHolidays([]))
      .finally(() => setLoading(false));
  }, []);

  // Преобразуем данные из БД в события FullCalendar
  const events = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return holidays.map((h) => {
      // h.date из БД имеет вид "2026-06-22"
      const [, month, day] = h.date.split("-");
      const newDate = `${currentYear}-${month}-${day}`;
      return {
        title: h.title,
        date: newDate,
        color: "#1e5a96",
        textColor: "#ffffff",
        extendedProps: { description: h.description }, // для подсказок/клик
      };
    });
  }, [holidays]);

  if (loading) {
    return (
      <div className="calendar-page">
        <p style={{ textAlign: "center", marginTop: "2rem" }}>Загрузка календаря...</p>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      <h1 className="main-title">Календарь праздников</h1>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin, multiMonthPlugin]}
        initialView="multiMonthYear"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "multiMonthYear,dayGridMonth",
        }}
        locale="ru"
        firstDay={1}
        events={events}
        height="auto"
      />
    </div>
  );
}