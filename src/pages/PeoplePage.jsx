import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchHolidays } from '../api/holidaysApi';
import { getColorByPeople, truncate } from '../constants';

export default function PeoplePage() {
  const { people } = useParams();
  const decodedPeople = decodeURIComponent(people);
  const [allHolidays, setAllHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHolidays()
      .then(setAllHolidays)
      .catch(() => setAllHolidays([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = allHolidays.filter(h => h.people === decodedPeople);

  if (loading) return <div className="page">Загрузка...</div>;

  return (
    <div className="page">
      <Link to="/" className="back-link">← На главную</Link>
      <h2>Праздники народа: {decodedPeople}</h2>
      <div className="holidays-grid">
        {filtered.length === 0 ? (
          <p>Нет данных о праздниках этого народа.</p>
        ) : (
          filtered.map(h => (
            <Link to={`/holiday/${h.id}`} key={h.id} className="holiday-card">
              <div className="holiday-card-image" style={{ backgroundColor: getColorByPeople(h.people) }}>
                {h.title[0]}
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
