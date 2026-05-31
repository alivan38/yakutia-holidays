/**
 * Блок: сверху цветной hero, снизу белая панель с текстом.
 */
export default function HolidayBlock({
  title,
  people,
  date,
  heroStyle,
  titleTag: TitleTag = 'h2',
  className = '',
  children,
}) {
  return (
    <article className={`holiday-block ${className}`.trim()}>
      <div className="holiday-block__layout">
        <div className="holiday-block__hero" style={heroStyle}>
          <div className="holiday-block__hero-head">
            <TitleTag className="holiday-block__title">{title}</TitleTag>
            {(people || date) && (
              <div className="holiday-meta">
                {people && <span className="people">{people}</span>}
                {date && <span className="date">{date}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="holiday-block__panel">
          {children}
        </div>
      </div>
    </article>
  );
}
