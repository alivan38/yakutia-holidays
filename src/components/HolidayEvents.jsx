import { useState, useEffect, useCallback } from 'react';
import { fetchHolidayEvents, getEventFileUrl } from '../api/holidayEventsApi';
import HolidayBlock from './HolidayBlock';

const LONG_TEXT_THRESHOLD = 320;

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getEventFiles(event) {
  return (event.images || [])
    .map(m => m?.directus_files_id)
    .filter(Boolean);
}

function EventMedia({ files, onImageClick }) {
  if (!files.length) return null;

  return (
    <div className="holiday-block__media">
      <h5 className="holiday-block__media-title">Фото/Видео</h5>
      <div className="holiday-block__gallery">
        {files.map((file, idx) => {
          const isVideo = file.type?.startsWith('video/');
          return isVideo ? (
            <video
              key={file.id}
              src={getEventFileUrl(file.id)}
              className="holiday-block__thumb"
              controls
              preload="metadata"
            />
          ) : (
            <img
              key={file.id}
              src={getEventFileUrl(file.id, { width: 640, quality: 80 })}
              alt={file.filename_download || `Фото ${idx + 1}`}
              className="holiday-block__thumb holiday-block__thumb--clickable"
              loading="lazy"
              width={file.width || 640}
              height={file.height || 480}
              onClick={() => onImageClick({ files, index: idx })}
            />
          );
        })}
      </div>
    </div>
  );
}

function EventCard({ event, heroStyle, onImageClick }) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const files = getEventFiles(event);
  const description = event.description?.trim() || '';
  const hasMedia = files.length > 0;
  const isLongText = description.length > LONG_TEXT_THRESHOLD;
  const showMediaInline = hasMedia && !isLongText;
  const showMediaToggle = hasMedia && isLongText && !mediaOpen;
  const showMediaExpanded = hasMedia && isLongText && mediaOpen;

  return (
    <HolidayBlock
      title={event.title}
      date={event.event_date ? formatEventDate(event.event_date) : null}
      heroStyle={heroStyle}
      titleTag="h4"
      className="holiday-block--event"
    >
      {description && (
        <div className="holiday-block__text">
          {description.split('\n').filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}

      {showMediaInline && (
        <EventMedia files={files} onImageClick={onImageClick} />
      )}

      {showMediaToggle && (
        <button
          type="button"
          className="holiday-block__media-toggle"
          onClick={() => setMediaOpen(true)}
        >
          показать фото/видео
        </button>
      )}

      {showMediaExpanded && (
        <>
          <EventMedia files={files} onImageClick={onImageClick} />
          <button
            type="button"
            className="holiday-block__media-toggle"
            onClick={() => setMediaOpen(false)}
          >
            скрыть фото/видео
          </button>
        </>
      )}
    </HolidayBlock>
  );
}

export default function HolidayEvents({ holidayId, heroStyle }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (!holidayId) return;
    setLoading(true);
    fetchHolidayEvents(holidayId)
      .then(data => { setEvents(data); setLoading(false); })
      .catch(() => { setError('Ошибка загрузки'); setLoading(false); });
  }, [holidayId]);

  const navigate = useCallback((delta) => {
    setLightbox(prev => {
      if (!prev) return prev;
      const next = (prev.index + delta + prev.files.length) % prev.files.length;
      return { ...prev, index: next };
    });
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = e => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, navigate]);

  if (loading) return (
    <section className="holiday-events">
      <h3 className="holiday-events__title">Прошедшие мероприятия</h3>
      <div className="holiday-events__list">
        {[1, 2].map(i => (
          <div key={i} className="holiday-block holiday-block--skeleton">
            <div className="holiday-block__layout">
              <div className="skeleton holiday-block__hero-skeleton" />
              <div className="holiday-block__panel">
                <div className="skeleton skeleton-text" />
                <div className="skeleton skeleton-text" style={{ width: '60%' }} />
              </div>
            </div>
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
        {events.map(event => (
          <EventCard
            key={event.id}
            event={event}
            heroStyle={heroStyle}
            onImageClick={setLightbox}
          />
        ))}
      </div>

      {lightbox && (() => {
        const file = lightbox.files[lightbox.index];
        return (
          <div className="image-modal-overlay" onClick={() => setLightbox(null)}>
            <div className="image-modal-content" onClick={e => e.stopPropagation()}>
              <button className="image-modal-close" type="button" onClick={() => setLightbox(null)}>&times;</button>
              <img
                src={getEventFileUrl(file.id)}
                alt={file.filename_download}
                className="image-modal-img"
              />
              {lightbox.files.length > 1 && (
                <div className="image-modal-nav">
                  <button className="image-modal-btn" type="button" onClick={() => navigate(-1)}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none"><path d="M16 4L8 12L16 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <span className="image-modal-counter">{lightbox.index + 1} / {lightbox.files.length}</span>
                  <button className="image-modal-btn" type="button" onClick={() => navigate(1)}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none"><path d="M8 4L16 12L8 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
