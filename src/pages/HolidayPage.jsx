import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchHolidayById } from '../api/holidaysApi';
import { fetchProposalById } from '../api/proposalsApi';
import { getColorByPeople, formatDateLong, resolveImages } from '../constants';

const DIRECTUS_ASSETS = 'http://localhost:8055/assets';

export default function HolidayPage() {
  const { id } = useParams();
  const [holiday, setHoliday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let data;
        if (id.startsWith('proposal-')) {
          data = await fetchProposalById(id.replace('proposal-', ''));
          if (data) data = {
            ...data,
            fullDescription: data.description,
            isProposal: true,
            date: data.date || null,
            tags: data.tags || [],
            images: resolveImages(data),
          };
        } else {
          data = await fetchHolidayById(id);
          if (data) data = {
            ...data,
            images: resolveImages(data),
            tags: Array.isArray(data.tags)
              ? data.tags
              : (data.tags ? data.tags.split(',').map(t => t.trim()) : []),
            fullDescription: data.full_description || data.description,
          };
        }
        if (!cancelled) setHoliday(data || null);
      } catch {
        if (!cancelled) setHoliday(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!selectedImage) return;
    const handleEsc = e => { if (e.key === 'Escape') setSelectedImage(null); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [selectedImage]);

  if (loading) return <div className="page">Загрузка...</div>;
  if (!holiday)  return <div className="not-found">Праздник не найден</div>;

  const images = holiday.images || [];

  const navigate = delta => {
    const next = (selectedImage.index + delta + images.length) % images.length;
    setSelectedImage({ url: `${DIRECTUS_ASSETS}/${images[next]}`, index: next });
  };

  return (
    <div className="holiday-page">
      <Link to="/" className="back-link">← Назад к списку</Link>

      <div
        className="holiday-hero"
        style={{ backgroundColor: holiday.isProposal ? '#27ae60' : getColorByPeople(holiday.people) }}
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
                <button className="image-modal-btn image-modal-prev" onClick={e => { e.stopPropagation(); navigate(-1); }}>←</button>
                <span className="image-modal-counter">{selectedImage.index + 1} / {images.length}</span>
                <button className="image-modal-btn image-modal-next" onClick={e => { e.stopPropagation(); navigate(1); }}>→</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
