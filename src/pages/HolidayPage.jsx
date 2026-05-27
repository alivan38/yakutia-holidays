import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchHolidayById } from "../api/holidaysApi";
import { fetchProposalById } from "../api/proposalsApi";

const DIRECTUS_URL = 'http://localhost:8055/assets';

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
    "Якуты": "#C41E3A",
    "Эвенки": "#FFD700",
    "Эвены": "#87CEEB",
    "Юкагиры": "#B71C1C",
    "Долганы": "#CC7722",
    "Чукчи": "#9E9E9E",
  };
  return colors[people] || "#4A90E2";
}

function parseImages(images) {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  if (typeof images === 'string') {
    // Формат JSON строка: "[\"uuid1\",\"uuid2\"]"
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    // Формат PostgreSQL: {uuid1,uuid2}
    if (images.startsWith('{')) {
      return images.slice(1, -1).split(',').map(s => s.replace(/^"|"$/g, '')).filter(Boolean);
    }
  }
  return [];
}

export default function HolidayPage() {
  const { id } = useParams();
  const [holiday, setHoliday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (id.startsWith('proposal-')) {
          const numericId = id.replace('proposal-', '');
          const data = await fetchProposalById(numericId);
          if (!cancelled) {
            if (data) {
              setHoliday({
                ...data,
                fullDescription: data.description,
                isProposal: true,
                date: data.date || null,
                tags: data.tags || [],
                images: parseImages(data.image || data.images),
              });
            } else {
              setHoliday(null);
            }
          }
        } else {
          const data = await fetchHolidayById(id);
          if (!cancelled) {
            setHoliday({
              ...data,
              images: parseImages(data.image || data.images), // ← исправлено
              tags: Array.isArray(data.tags)
                ? data.tags
                : (data.tags ? data.tags.split(',').map(t => t.trim()) : []),
              fullDescription: data.full_description || data.description,
            });
          }
        }
      } catch (err) {
        if (!cancelled) setHoliday(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };
    if (selectedImage) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [selectedImage]);

  if (loading) return <div className="page">Загрузка...</div>;
  if (!holiday) return <div className="not-found">Праздник не найден</div>;

  const displayHoliday = {
    ...holiday,
    fullDescription: holiday.full_description || holiday.description,
  };

  return (
    <div className="holiday-page">
      <Link to="/" className="back-link">← Назад к списку</Link>

      <div
        className="holiday-hero"
        style={{
          backgroundColor: displayHoliday.isProposal ? '#27ae60' : getColorByPeople(displayHoliday.people),
        }}
      >
        <h1>{displayHoliday.title}</h1>
        <div className="holiday-meta">
          <span className="people">{displayHoliday.people}</span>
          {displayHoliday.date && <span className="date">{formatDate(displayHoliday.date)}</span>}
        </div>
      </div>

      <div className="holiday-content">
        <p className="description">{displayHoliday.fullDescription}</p>

        {displayHoliday.tags?.length > 0 && (
          <div className="tags">
            {displayHoliday.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}

        {/* Галерея изображений */}
        {displayHoliday.images && displayHoliday.images.length > 0 && (
          <div className="holiday-gallery">
            <h3>Фотографии</h3>
            <div className="gallery-grid">
              {displayHoliday.images.map((imageId, idx) => (
                <img
                  key={idx}
                  src={`${DIRECTUS_URL}/${imageId}`}
                  alt={`Фото ${idx + 1}`}
                  className="gallery-thumb"
                  onClick={() => setSelectedImage({ url: `${DIRECTUS_URL}/${imageId}`, index: idx })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно */}
      {selectedImage && (
        <div
          className="image-modal-overlay"
          onClick={() => setSelectedImage(null)}
        >
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="image-modal-close"
              onClick={() => setSelectedImage(null)}
              title="Закрыть"
            >
              &times;
            </button>

            <img
              src={selectedImage.url}
              alt={`Увеличенное фото ${selectedImage.index + 1}`}
              className="image-modal-img"
            />

            {displayHoliday.images.length > 1 && (
              <div className="image-modal-nav">
                <button
                  className="image-modal-btn image-modal-prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    const prevIndex = selectedImage.index > 0
                      ? selectedImage.index - 1
                      : displayHoliday.images.length - 1;
                    setSelectedImage({
                      url: `${DIRECTUS_URL}/${displayHoliday.images[prevIndex]}`,
                      index: prevIndex,
                    });
                  }}
                >
                  ←
                </button>
                <span className="image-modal-counter">
                  {selectedImage.index + 1} / {displayHoliday.images.length}
                </span>
                <button
                  className="image-modal-btn image-modal-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIndex = selectedImage.index < displayHoliday.images.length - 1
                      ? selectedImage.index + 1
                      : 0;
                    setSelectedImage({
                      url: `${DIRECTUS_URL}/${displayHoliday.images[nextIndex]}`,
                      index: nextIndex,
                    });
                  }}
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}