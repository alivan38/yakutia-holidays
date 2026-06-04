import { Link } from 'react-router-dom';
import { formatDateLong, getColorByPeople, truncate, holidayExcerpt } from '../constants';

export default function HolidayRelated({ holidays }) {
  if (!holidays?.length) return null;

  return (
    <aside className="holiday-sidebar" aria-labelledby="holiday-related-heading">
      <h2 id="holiday-related-heading" className="holiday-sidebar-title">
        Вам может быть интересно
      </h2>
      <ul className="holiday-sidebar-list">
        {holidays.map(h => {
          const excerpt = holidayExcerpt(h);
          return (
          <li key={h.id}>
            <Link to={`/holiday/${h.id}`} className="holiday-sidebar-card">
              <span
                className="holiday-sidebar-card-accent"
                style={{ background: getColorByPeople(h.people) }}
                aria-hidden="true"
              />
              <span className="holiday-sidebar-card-body">
                <span className="holiday-sidebar-card-people">{h.people}</span>
                <span className="holiday-sidebar-card-title">{h.title}</span>
                {h.date && (
                  <span className="holiday-sidebar-card-date">{formatDateLong(h.date)}</span>
                )}
                {excerpt && (
                  <span className="holiday-sidebar-card-desc">{truncate(excerpt, 72)}</span>
                )}
              </span>
            </Link>
          </li>
          );
        })}
      </ul>
    </aside>
  );
}
