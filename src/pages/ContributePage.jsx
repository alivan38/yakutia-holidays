import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api/proposals';
const PEOPLES = ['Якуты', 'Эвенки', 'Эвены', 'Юкагиры', 'Долганы', 'Чукчи', 'Другое'];

const MONTHS = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
];

function DatePicker({ value, onChange }) {
  const today = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : null;

  const [day,   setDay]   = useState(parsed ? parsed.getDate()          : '');
  const [month, setMonth] = useState(parsed ? parsed.getMonth()         : '');
  const [year,  setYear]  = useState(parsed ? parsed.getFullYear()      : '');
  const [open,  setOpen]  = useState(false);
  const [viewY, setViewY] = useState(parsed ? parsed.getFullYear() : today.getFullYear());
  const [viewM, setViewM] = useState(parsed ? parsed.getMonth()    : today.getMonth());

  const pad = (n) => String(n).padStart(2, '0');

  const emit = (d, m, y) => {
    if (d && m !== '' && y && String(y).length === 4) {
      onChange(`${y}-${pad(m + 1)}-${pad(d)}`);
    } else {
      onChange('');
    }
  };

  const selectDay = (d) => {
    setDay(d); setMonth(viewM); setYear(viewY);
    emit(d, viewM, viewY);
    setOpen(false);
  };

  const daysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const firstDay    = (m, y) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };

  const prevMonth = () => {
    if (viewM === 0) { setViewM(11); setViewY(v => v - 1); }
    else setViewM(v => v - 1);
  };
  const nextMonth = () => {
    if (viewM === 11) { setViewM(0); setViewY(v => v + 1); }
    else setViewM(v => v + 1);
  };

  const displayValue = (day && month !== '' && year)
    ? `${pad(day)} ${MONTHS[month].slice(0,3)} ${year}`
    : '';

  const isSelected = (d) => d === day && viewM === month && viewY === year;
  const isToday    = (d) => d === today.getDate() && viewM === today.getMonth() && viewY === today.getFullYear();

  return (
    <div className="datepicker-wrapper" style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        className={`datepicker-trigger${open ? ' datepicker-trigger--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Выбрать дату"
      >
        <span className="datepicker-trigger-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </span>
        <span className={`datepicker-trigger-value${!displayValue ? ' datepicker-trigger-placeholder' : ''}`}>
          {displayValue || 'Выберите дату…'}
        </span>
        <span className="datepicker-trigger-chevron">
          <svg width="12" height="12" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 1l5 5 5-5"/>
          </svg>
        </span>
      </button>

      {/* Dropdown calendar */}
      {open && (
        <>
          {/* Overlay to close */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div className="datepicker-popup">
            {/* Header */}
            <div className="datepicker-header">
              <button type="button" className="datepicker-nav" onClick={prevMonth} aria-label="Предыдущий месяц">
                <svg width="14" height="14" viewBox="0 0 8 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 1L1 6l6 5"/>
                </svg>
              </button>
              <span className="datepicker-month-label">
                {MONTHS[viewM]} {viewY}
              </span>
              <button type="button" className="datepicker-nav" onClick={nextMonth} aria-label="Следующий месяц">
                <svg width="14" height="14" viewBox="0 0 8 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 1l6 5-6 5"/>
                </svg>
              </button>
            </div>

            {/* Weekday names */}
            <div className="datepicker-weekdays">
              {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(w => (
                <span key={w} className="datepicker-weekday">{w}</span>
              ))}
            </div>

            {/* Days grid */}
            <div className="datepicker-days">
              {Array.from({ length: firstDay(viewM, viewY) }).map((_, i) => (
                <span key={`e${i}`} />
              ))}
              {Array.from({ length: daysInMonth(viewM, viewY) }, (_, i) => i + 1).map(d => (
                <button
                  key={d}
                  type="button"
                  className={[
                    'datepicker-day',
                    isSelected(d) ? 'datepicker-day--selected' : '',
                    isToday(d)    ? 'datepicker-day--today'    : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => selectDay(d)}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Quick-clear */}
            {displayValue && (
              <div className="datepicker-footer">
                <button
                  type="button"
                  className="datepicker-clear"
                  onClick={() => { setDay(''); setMonth(''); setYear(''); onChange(''); setOpen(false); }}
                >
                  Очистить
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ContributePage() {
  const [title, setTitle] = useState('');
  const [people, setPeople] = useState(PEOPLES[0]);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => { previews.forEach(url => URL.revokeObjectURL(url)); };
  }, [previews]);

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    if (files.length + selected.length > 5) { setError('Максимум 5 изображений'); return; }
    const newPreviews = selected.map(file => URL.createObjectURL(file));
    setFiles([...files, ...selected]);
    setPreviews([...previews, ...newPreviews]);
    setError('');
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index]);
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const formData = new FormData();
    formData.append('title', title);
    formData.append('people', people);
    formData.append('date', date);
    formData.append('description', description);
    formData.append('region', region);
    files.forEach(file => formData.append('images', file));
    try {
      const res = await fetch(API_URL, { method: 'POST', body: formData });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Ошибка отправки'); }
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (submitted) {
    return (
      <div className="page contribute-success">
        <div className="success-card">
          <h2>Спасибо за ваш вклад!</h2>
          <p>Информация о празднике «{title}» отправлена на модерацию.</p>
          <Link to="/" className="btn">Вернуться на главную</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page contribute-page">
      <Link to="/" className="back-link">← На главную</Link>
      <h1>Предложить новый праздник или обряд</h1>
      {error && <p className="auth-error">{error}</p>}
      <form onSubmit={handleSubmit} className="contribute-form">
        <div className="form-group">
          <label>Название праздника *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Народ *</label>
          <select value={people} onChange={(e) => setPeople(e.target.value)} required>
            {PEOPLES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* ── CUSTOM DATE PICKER ── */}
        <div className="form-group">
          <label>Дата празднования</label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div className="form-group">
          <label>Описание, обряды, история *</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} />
        </div>
        <div className="form-group">
          <label>Регион</label>
          <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Фотографии (до 5 шт.)</label>
          <input type="file" accept="image/*" multiple onChange={handleFiles} className="file-input" />
          <div className="file-preview-container">
            {previews.map((src, idx) => (
              <div key={idx} className="file-preview-item">
                <img src={src} alt={`Превью ${idx+1}`} />
                <button type="button" className="remove-file-btn" onClick={() => removeFile(idx)}>×</button>
              </div>
            ))}
          </div>
        </div>
        <button type="submit" className="btn" style={{ width: '100%' }}>ОТПРАВИТЬ ДАННЫЕ</button>
      </form>
    </div>
  );
}
