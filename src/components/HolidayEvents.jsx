import { useState, useEffect } from 'react';
import { fetchHolidayEvents, getEventFileUrl } from '../api/holidayEventsApi';

// Формат даты: "21 июня 2024"
function formatEventDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function HolidayEvents({ holidayId }) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lightbox, setLightbox] = useState(null); // { files, index }

  useEffect(() => {
    if (!holidayId) return;
    setLoading(true);
    fetchHolidayEvents(holidayId)
      .then(data => { setEvents(data); setLoading(false); })
      .catch(() => { setError('Ошибка загрузки'); setLoading(false); });
  }, [holidayId]);

  // закрытие lightbox по Escape
  useEffect(() => {
    if (!lightbox) return;
    const onKey = e => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft')  navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  function navigate(delta) {
    setLightbox(prev => {
      const next = (prev.index + delta + prev.files.length) % prev.files.length;
      return { ...prev, index: next };
    });
  }

  if (loading) return (
    <section className="holiday-events">
      <h3 className="holiday-events__title">Прошедшие мероприятия</h3>
      <div className="holiday-events__list">
        {[1,2].map(i => (
          <div key={i} className="event-card event-card--skeleton">
            <div className="skeleton skeleton-heading" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          </div>
        ))}
      </div>
    </section>
  );

  if (error) return null;
  if (events.length === 0) return null;

  return (
    <section className="holiday-events">
      <h3 className="holiday-events__title">Прошедшие мероприятия</h3>

      <div className="holiday-events__list">
        {events.map(event => {
          const files = (event.images || [])
            .map(m => m?.directus_files_id)
            .filter(Boolean);

          return (
            <article key={event.id} className="event-card">
              <div className="event-card__header">
                <h4 className="event-card__title">{event.title}</h4>
                {event.event_date && (
                  <time className="event-card__date" dateTime={event.event_date}>
                    {formatEventDate(event.event_date)}
                  </time>
                )}
              </div>

              {event.description && (
                <p className="event-card__desc">{event.description}</p>
              )}

              {files.length > 0 && (
                <div className="event-card__gallery">
                  {files.map((file, idx) => {
                    const isVideo = file.type?.startsWith('video/');
                    return isVideo ? (
                      <video
                        key={file.id}
                        src={getEventFileUrl(file.id)}
                        className="event-card__thumb"
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <img
                        key={file.id}
                        src={getEventFileUrl(file.id, { width: 400, quality: 80 })}
                        alt={file.filename_download || `Фото ${idx + 1}`}
                        className="event-card__thumb"
                        loading="lazy"
                        width={file.width || 400}
                        height={file.height || 300}
                        onClick={() => setLightbox({ files, index: idx })}
                      />
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (() => {
        const file = lightbox.files[lightbox.index];
        return (
          <div className="image-modal-overlay" onClick={() => setLightbox(null)}>
            <div className="image-modal-content" onClick={e => e.stopPropagation()}>
              <button className="image-modal-close" onClick={() => setLightbox(null)}>&times;</button>
              <img
                src={getEventFileUrl(file.id)}
                alt={file.filename_download}
                className="image-modal-img"
              />
              {lightbox.files.length > 1 && (
                <div className="image-modal-nav">
                  <button className="image-modal-btn" onClick={() => navigate(-1)}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none"><path d="M16 4L8 12L16 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <span className="image-modal-counter">{lightbox.index + 1} / {lightbox.files.length}</span>
                  <button className="image-modal-btn" onClick={() => navigate(1)}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none"><path d="M8 4L16 12L8 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </section>
  );
}
