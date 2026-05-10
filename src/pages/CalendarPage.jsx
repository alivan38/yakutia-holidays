import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";
import holidaysExtended from "../data/holidaysExtended";

export default function CalendarPage() {
  const events = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return holidaysExtended.map((h) => {
      const [, month, day] = h.date.split("-");
      const newDate = `${currentYear}-${month}-${day}`;
      return {
        title: h.title,
        date: newDate,
        color: "#1e5a96",
        textColor: "#ffffff",
      };
    });
  }, []);

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