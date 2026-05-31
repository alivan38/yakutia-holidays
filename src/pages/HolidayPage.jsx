import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useHolidayById, useHolidays, useApprovedProposals } from '../hooks/useHolidays';
import { getColorByPeople, formatDateLong } from '../constants';
import { mergeHolidaysAndProposals, pickRelatedHolidays } from '../utils/mergeHolidays';
import HolidayRelated from '../components/HolidayRelated';
import HolidayBlock from '../components/HolidayBlock';

const DIRECTUS_ASSETS = import.meta.env.VITE_DIRECTUS_URL
  ? `${import.meta.env.VITE_DIRECTUS_URL}/assets`
  : 'http://localhost:8055/assets';

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
  const { data: holidays = [] } = useHolidays();
  const { data: approvedProposals = [] } = useApprovedProposals();
  const [selectedImage, setSelectedImage] = useState(null);

  const relatedHolidays = useMemo(() => {
    if (!holiday) return [];
    const all = mergeHolidaysAndProposals(holidays, approvedProposals);
    return pickRelatedHolidays(all, holiday.id, holiday.people);
  }, [holiday, holidays, approvedProposals]);

  useEffect(() => {
    if (!selectedImage) return;
    const handleEsc = e => { if (e.key === 'Escape') setSelectedImage(null); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [selectedImage]);

  if (isLoading) return (
    <div className="holiday-page">
      <Link to="/" className="back-link">&larr; Назад к списку</Link>
      <div className="holiday-block holiday-block--skeleton">
        <div className="holiday-block__layout">
          <div className="skeleton holiday-block__hero-skeleton" />
          <div className="holiday-block__panel">
            <div className="skeleton skeleton-text" style={{ width: '90%', marginBottom: '1rem' }} />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text" style={{ width: '75%' }} />
          </div>
        </div>
      </div>
    </div>
  );

  if (isError || !holiday) return (
    <div className="holiday-page">
      <Link to="/" className="back-link">&larr; Назад к списку</Link>
      <p style={{ color: 'var(--text-muted)', marginTop: '2rem' }}>⚠️ Праздник не найден или произошла ошибка.</p>
    </div>
  );

  const images = Array.isArray(holiday.image)
    ? holiday.image
    : (holiday.images || []);

  const navigate = delta => {
    const next = (selectedImage.index + delta + images.length) % images.length;
    setSelectedImage({ url: `${DIRECTUS_ASSETS}/${images[next]}`, index: next });
  };

  const heroStyle = {
    background: holiday.isProposal
      ? 'linear-gradient(135deg, #27ae60 0%, #145a32 100%)'
      : getColorByPeople(holiday.people),
  };

  const descriptionText = holiday.full_description || holiday.description || '';

  return (
    <>
      <div className="holiday-page">
        <Link to="/" className="back-link">&larr; Назад к списку</Link>

        <div className="holiday-page-layout">
          <div className="holiday-page-main">
            <HolidayBlock
              title={holiday.title}
              people={holiday.people}
              date={holiday.date ? formatDateLong(holiday.date) : null}
              heroStyle={heroStyle}
              titleTag="h1"
              className="holiday-block--intro"
            >
              {descriptionText && (
                <div className="holiday-block__text">
                  {descriptionText.split('\n').filter(Boolean).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}

              {holiday.region && (
                <p className="holiday-region">
                  <strong>Регион:</strong> {holiday.region}
                </p>
              )}

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
            </HolidayBlock>
          </div>

          <HolidayRelated holidays={relatedHolidays} />
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
