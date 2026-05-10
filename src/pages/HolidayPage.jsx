import { useParams, Link } from "react-router-dom";
import holidaysExtended from "../data/holidaysExtended";

function formatDate(dateStr) {
  const [, month, day] = dateStr.split("-");
  const monthNames = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  return `${parseInt(day, 10)} ${monthNames[parseInt(month, 10) - 1]}`;
}

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

export default function HolidayPage() {
  const { id } = useParams();
  const holiday = holidaysExtended.find((h) => h.id === id);

  if (!holiday) {
    return <div className="not-found">Праздник не найден</div>;
  }

  return (
    <div className="holiday-page">
      <Link to="/" className="back-link">← Назад к списку</Link>
      <div
        className="holiday-hero"
        style={{ backgroundColor: getColorByPeople(holiday.people) }}
      >
        <h1>{holiday.title}</h1>
        <div className="holiday-meta">
          <span className="people">{holiday.people}</span>
          <span className="date">{formatDate(holiday.date)}</span>
        </div>
      </div>
      <div className="holiday-content">
        <p className="description">{holiday.fullDescription}</p>
        {holiday.tags && (
          <div className="tags">
            {holiday.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}