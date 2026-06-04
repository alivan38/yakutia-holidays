import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams, NavLink } from 'react-router-dom';
import { useHolidays } from '../hooks/useHolidays';
import { submitHolidayEvent, uploadEventFiles } from '../api/holidayEventsApi';
import CaptchaField, { isCaptchaConfigured } from '../components/CaptchaField';

const MAX_FILES = 10;

function MediaPreview({ file, src, onRemove }) {
  const isVideo = file.type?.startsWith('video/');
  return (
    <div className="file-preview-item">
      {isVideo ? (
        <video src={src} className="file-preview-video" muted preload="metadata" />
      ) : (
        <img src={src} alt="" />
      )}
      <button type="button" className="remove-file-btn" onClick={onRemove} aria-label="Удалить">×</button>
    </div>
  );
}

export default function ContributeEventPage() {
  const [searchParams] = useSearchParams();
  const preselectedHoliday = searchParams.get('holiday') || '';

  const { data: holidays = [], isLoading: loadingHolidays } = useHolidays();

  const [form, setForm] = useState({
    holiday_id: preselectedHoliday,
    title: '',
    event_date: '',
    description: '',
    author_email: '',
  });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const [captchaShake, setCaptchaShake] = useState(false);

  const fileInputRef = useRef(null);
  const consentRef = useRef(null);
  const captchaRef = useRef(null);

  const sortedHolidays = useMemo(
    () => [...holidays].sort((a, b) => a.title.localeCompare(b.title, 'ru')),
    [holidays],
  );

  const selectedHoliday = useMemo(
    () => sortedHolidays.find(h => h.id === form.holiday_id),
    [sortedHolidays, form.holiday_id],
  );

  useEffect(() => {
    if (preselectedHoliday) {
      setForm(f => ({ ...f, holiday_id: preselectedHoliday }));
    }
  }, [preselectedHoliday]);

  useEffect(() => () => { previews.forEach(URL.revokeObjectURL); }, [previews]);

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleHolidayChange = e => {
    const holidayId = e.target.value;
    const holiday = sortedHolidays.find(h => h.id === holidayId);
    setForm(f => ({
      ...f,
      holiday_id: holidayId,
      title: f.title || (holiday ? `${holiday.title} — ${new Date().getFullYear()}` : ''),
    }));
  };

  const handleFiles = e => {
    const selected = Array.from(e.target.files);
    if (files.length + selected.length > MAX_FILES) {
      setError(`Максимум ${MAX_FILES} файлов`);
      return;
    }
    setFiles(f => [...f, ...selected]);
    setPreviews(p => [...p, ...selected.map(file => URL.createObjectURL(file))]);
    setError('');
  };

  const removeFile = i => {
    URL.revokeObjectURL(previews[i]);
    setFiles(f => f.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.holiday_id) {
      setError('Выберите праздник из каталога');
      return;
    }
    if (!consent) {
      setConsentError(true);
      setError('Необходимо принять политику конфиденциальности');
      consentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (isCaptchaConfigured() && !captchaToken) {
      setCaptchaError(true);
      setCaptchaShake(true);
      setError('Подтвердите, что вы не робот');
      captchaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => setCaptchaShake(false), 600);
      return;
    }

    setError('');
    setCaptchaError(false);
    setCaptchaShake(false);
    setLoading(true);
    try {
      const imageIds = files.length > 0 ? await uploadEventFiles(files) : [];
      const authorEmail = form.author_email?.trim();
      await submitHolidayEvent(form.holiday_id, {
        title: form.title.trim(),
        event_date: form.event_date,
        description: form.description.trim(),
        ...(authorEmail ? { author_email: authorEmail } : {}),
        images: imageIds.filter(Boolean),
      }, { captchaToken: captchaToken || undefined });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Ошибка отправки');
      setCaptchaToken('');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return (
    <div className="page-sticky-footer">
      <div className="page contribute-success">
        <div className="success-card">
          <h2>Спасибо!</h2>
          <p>
            Ваш рассказ о мероприятии «{form.title}» отправлен на модерацию.
            После проверки он появится в блоке «Прошедшие мероприятия» на странице праздника.
          </p>
          <div className="success-card__actions">
            {form.holiday_id && (
              <Link to={`/holiday/${form.holiday_id}`} className="btn">
                Перейти к празднику
              </Link>
            )}
            <Link to="/" className="btn btn-secondary">На главную</Link>
          </div>
        </div>
      </div>
      <footer className="site-footer">
        <div className="footer-content">
          <p>677000, Республика Саха (Якутия), г. Якутск, ул. Орджоникидзе, д. 4</p>
          <p className="copyright">&copy; 2026 ФГБОУ ВО «Арктический государственный институт искусств и культуры»</p>
        </div>
      </footer>
    </div>
  );

  return (
    <>
      <div className="page contribute-page">
        <Link to="/" className="back-link">&larr; На главную</Link>

        <nav className="contribute-tabs" aria-label="Тип материала">
          <NavLink to="/contribute" className={({ isActive }) => `contribute-tab${isActive ? ' contribute-tab--active' : ''}`} end>
            Новый праздник
          </NavLink>
          <NavLink to="/contribute/event" className={({ isActive }) => `contribute-tab${isActive ? ' contribute-tab--active' : ''}`}>
            Прошедшее мероприятие
          </NavLink>
        </nav>

        <h1>Рассказать о прошедшем мероприятии</h1>
        <p className="contribute-lead">
          Поделитесь фото, видео и описанием того, как прошёл праздник в вашем населённом пункте.
          Материал появится на сайте после модерации.
        </p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="contribute-form">
          <div className="form-group">
            <label htmlFor="event-holiday">Праздник из каталога *</label>
            <select
              id="event-holiday"
              value={form.holiday_id}
              onChange={handleHolidayChange}
              required
              disabled={loadingHolidays}
            >
              <option value="">— выберите праздник —</option>
              {sortedHolidays.map(h => (
                <option key={h.id} value={h.id}>
                  {h.title} ({h.people})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="event-title">Название мероприятия *</label>
            <input
              id="event-title"
              type="text"
              value={form.title}
              onChange={set('title')}
              required
              placeholder={selectedHoliday ? `${selectedHoliday.title} — 2025` : 'Например: Ысыах в с. Майя 2025'}
            />
          </div>

          <div className="form-group">
            <label htmlFor="event-date">Дата проведения *</label>
            <input
              id="event-date"
              type="date"
              value={form.event_date}
              onChange={set('event_date')}
              required
              min="1900-01-01"
              max="2060-12-31"
            />
          </div>

          <div className="form-group">
            <label htmlFor="event-description">Как прошло мероприятие *</label>
            <textarea
              id="event-description"
              value={form.description}
              onChange={set('description')}
              required
              minLength={10}
              rows={6}
              placeholder="Опишите программу, участников, атмосферу, особенности проведения… (не менее 10 символов)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="event-email">Email</label>
            <input
              id="event-email"
              type="email"
              value={form.author_email}
              onChange={set('author_email')}
              autoComplete="email"
              placeholder="example@mail.ru (необязательно)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="event-files">Фото и видео (до {MAX_FILES} файлов)</label>
            <input
              ref={fileInputRef}
              id="event-files"
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              multiple
              onChange={handleFiles}
              className="file-input"
            />
            <div className="file-preview-container">
              {previews.map((src, idx) => (
                <MediaPreview
                  key={src}
                  file={files[idx]}
                  src={src}
                  onRemove={() => removeFile(idx)}
                />
              ))}
            </div>
          </div>

          <div
            ref={consentRef}
            className={`consent-block${consentError ? ' consent-block--error' : ''}`}
          >
            <label className="consent-check" htmlFor="consent-event">
              <input
                id="consent-event"
                type="checkbox"
                className="consent-checkbox"
                checked={consent}
                onChange={e => {
                  setConsent(e.target.checked);
                  if (e.target.checked) setConsentError(false);
                }}
              />
            </label>
            <label className="consent-text-label" htmlFor="consent-event">
              <span className="consent-text">
                Я согласен(а) на обработку персональных данных (email) в соответствии с{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer">политикой конфиденциальности</Link>{' '}
                согласно ФЗ-152
              </span>
            </label>
          </div>

          <CaptchaField
            ref={captchaRef}
            error={captchaError}
            shake={captchaShake}
            onToken={token => {
              setCaptchaToken(token);
              if (token) {
                setCaptchaError(false);
                setCaptchaShake(false);
              }
            }}
            onExpire={() => setCaptchaToken('')}
            onError={() => {
              setCaptchaToken('');
              setCaptchaError(true);
            }}
          />

          <button
            type="submit"
            className="btn"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Отправка...' : 'ОТПРАВИТЬ МАТЕРИАЛ'}
          </button>
        </form>
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
