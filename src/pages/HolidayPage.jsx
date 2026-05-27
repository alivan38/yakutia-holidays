import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchHolidayById } from "../api/holidaysApi";
import { fetchProposalById } from "../api/proposalsApi";

const DIRECTUS_ASSETS = 'http://localhost:8055/assets';

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseImages(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') return item.id || null;
      return null;
    }).filter(Boolean);
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    // Одиночный UUID
    if (UUID_RE.test(trimmed)) return [trimmed];
    // JSON: ["uuid", ...]
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(item => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') return item.id || null;
          return null;
        }).filter(Boolean);
      }
      if (parsed && typeof parsed === 'object' && parsed.id) return [parsed.id];
    } catch {}
    // PostgreSQL: {uuid1,uuid2}
    if (trimmed.startsWith('{')) {
      return trimmed.slice(1, -1).split(',').map(s => s.replace(/^"|"$/g, '').trim()).filter(Boolean);
    }
  }

  if (raw && typeof raw === 'object' && raw.id) return [raw.id];
  return [];
}

// Исправленная версия: пробует data.images, если пусто — пробует data.image
function resolveImages(data) {
  const fromImages = parseImages(data.images);
  if (fromImages.length > 0) return fromImages;
  return parseImages(data.image);
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
                images: resolveImages(data),
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
              images: resolveImages(data),
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
    if (selectedImage) document.addEventListener('keydown', handleEsc);
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

        {displayHoliday.images && displayHoliday.images.length > 0 && (
          <div className="holiday-gallery">
            <h3>Фотографии</h3>
            <div className="gallery-grid">
              {displayHoliday.images.map((imageId, idx) => (
                <img
                  key={idx}
                  src={`${DIRECTUS_ASSETS}/${imageId}`}
                  alt={`Фото ${idx + 1}`}
                  className="gallery-thumb"
                  onClick={() => setSelectedImage({ url: `${DIRECTUS_ASSETS}/${imageId}`, index: idx })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="image-modal-overlay" onClick={() => setSelectedImage(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setSelectedImage(null)} title="Закрыть">
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
                    const prevIndex = selectedImage.index > 0 ? selectedImage.index - 1 : displayHoliday.images.length - 1;
                    setSelectedImage({ url: `${DIRECTUS_ASSETS}/${displayHoliday.images[prevIndex]}`, index: prevIndex });
                  }}
                >←</button>
                <span className="image-modal-counter">{selectedImage.index + 1} / {displayHoliday.images.length}</span>
                <button
                  className="image-modal-btn image-modal-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIndex = selectedImage.index < displayHoliday.images.length - 1 ? selectedImage.index + 1 : 0;
                    setSelectedImage({ url: `${DIRECTUS_ASSETS}/${displayHoliday.images[nextIndex]}`, index: nextIndex });
                  }}
                >→</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
