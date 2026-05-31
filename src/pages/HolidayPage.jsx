import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useHolidayById } from '../hooks/useHolidays';
import { getColorByPeople, formatDateLong } from '../constants';

const DIRECTUS_ASSETS = 'http://localhost:8055/assets';

const IconArrowRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M8 4L16 12L8 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconArrowLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M16 4L8 12L16 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function HolidayPage() {
  const { id } = useParams();
  const { data: holiday, isLoading, isError } = useHolidayById(id);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (!selectedImage) return;
    const handleEsc = e => { if (e.key === 'Escape') setSelectedImage(null); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [selectedImage]);

  if (isLoading) return (
    <div className="holiday-page">
      <Link to="/" className="back-link">&larr; Назад к списку</Link>
      <div className="skeleton holiday-hero-skeleton" />
      <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: '1rem' }} />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
    </div>
  );

  if (isError || !holiday) return (
    <div className="holiday-page">
      <Link to="/" className="back-link">&larr; Назад к списку</Link>
      <p style={{ color: 'var(--text-muted)', marginTop: '2rem' }}>&warning; Праздник не найден или произошла ошибка.</p>
    </div>
  );

  const images = holiday.images || [];

  const navigate = delta => {
    const next = (selectedImage.index + delta + images.length) % images.length;
    setSelectedImage({ url: `${DIRECTUS_ASSETS}/${images[next]}`, index: next });
  };

  return (
    <>
      <div className="holiday-page">
        <Link to="/" className="back-link">&larr; Назад к списку</Link>

        <div
          className="holiday-hero"
          style={{ background: holiday.isProposal ? 'linear-gradient(135deg, #27ae60 0%, #145a32 100%)' : getColorByPeople(holiday.people) }}
        >
          <h1>{holiday.title}</h1>
          <div className="holiday-meta">
            <span className="people">{holiday.people}</span>
            {holiday.date && <span className="date">{formatDateLong(holiday.date)}</span>}
          </div>
        </div>

        <div className="holiday-content">
          <p className="description">{holiday.fullDescription}</p>

          {holiday.tags?.length > 0 && (
            <div className="tags">
              {holiday.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
            </div>
          )}

          {images.length > 0 && (
            <div className="holiday-gallery">
              <h3>Фотографии</h3>
              <div className="gallery-grid">
                {images.map((imgId, idx) => (
                  <img
                    key={idx}
                    src={`${DIRECTUS_ASSETS}/${imgId}`}
                    alt={`Фото ${idx + 1}`}
                    className="gallery-thumb"
                    loading="lazy"
                    onClick={() => setSelectedImage({ url: `${DIRECTUS_ASSETS}/${imgId}`, index: idx })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedImage && (
          <div className="image-modal-overlay" onClick={() => setSelectedImage(null)}>
            <div className="image-modal-content" onClick={e => e.stopPropagation()}>
              <button className="image-modal-close" onClick={() => setSelectedImage(null)} title="Закрыть">&times;</button>
              <img src={selectedImage.url} alt={`Фото ${selectedImage.index + 1}`} className="image-modal-img" />
              {images.length > 1 && (
                <div className="image-modal-nav">
                  <button className="image-modal-btn" onClick={e => { e.stopPropagation(); navigate(-1); }}>
                    <IconArrowLeft />
                  </button>
                  <span className="image-modal-counter">{selectedImage.index + 1} / {images.length}</span>
                  <button className="image-modal-btn" onClick={e => { e.stopPropagation(); navigate(1); }}>
                    <IconArrowRight />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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
