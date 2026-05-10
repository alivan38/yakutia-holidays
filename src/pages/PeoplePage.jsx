import { useParams, Link } from "react-router-dom";
import holidaysExtended from "../data/holidaysExtended";

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

export default function PeoplePage() {
  const { people } = useParams();
  const decodedPeople = decodeURIComponent(people);
  const filtered = holidaysExtended.filter((h) => h.people === decodedPeople);

  return (
    <div className="page">
      <Link to="/" className="back-link">← На главную</Link>
      <h2>Праздники народа: {decodedPeople}</h2>
      <div className="holidays-grid">
        {filtered.length === 0 ? (
          <p>Нет данных о праздниках этого народа.</p>
        ) : (
          filtered.map((h) => (
            <Link to={`/holiday/${h.id}`} key={h.id} className="holiday-card">
              <div className="holiday-card-image">
                <img
                  src={h.image}
                  alt={h.title}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.style.backgroundColor = getColorByPeople(h.people);
                    e.target.parentElement.textContent = h.title[0];
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div className="holiday-card-content">
                <h3>{h.title}</h3>
                <p>{truncate(h.description, 80)}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}