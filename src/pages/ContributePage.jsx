import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { submitProposal, uploadFiles } from '../api/proposalsApi';
import { PEOPLES } from '../constants';

const MONTHS = [
  { value: 1,  label: 'Январь',   days: 31 },
  { value: 2,  label: 'Февраль',  days: 29 },
  { value: 3,  label: 'Март',     days: 31 },
  { value: 4,  label: 'Апрель',   days: 30 },
  { value: 5,  label: 'Май',      days: 31 },
  { value: 6,  label: 'Июнь',     days: 30 },
  { value: 7,  label: 'Июль',     days: 31 },
  { value: 8,  label: 'Август',   days: 31 },
  { value: 9,  label: 'Сентябрь', days: 30 },
  { value: 10, label: 'Октябрь',  days: 31 },
  { value: 11, label: 'Ноябрь',   days: 30 },
  { value: 12, label: 'Декабрь',  days: 31 },
];

function MonthDayPicker({ value, onChange }) {
  const parseVal = v => {
    if (!v) return { month: '', day: '' };
    const [, m, d] = v.split('-');
    return { month: parseInt(m, 10), day: parseInt(d, 10) };
  };
  const { month: initMonth, day: initDay } = parseVal(value);
  const [month, setMonth] = useState(initMonth || '');
  const [day, setDay] = useState(initDay || '');

  const maxDays = month ? (MONTHS.find(m => m.value === Number(month))?.days ?? 31) : 31;

  const emit = (m, d) => {
    if (m && d) onChange(`2000-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    else onChange('');
  };

  const handleMonth = e => {
    const m = e.target.value;
    setMonth(m);
    const max = MONTHS.find(mo => mo.value === Number(m))?.days ?? 31;
    const safeDay = day && Number(day) <= max ? day : '';
    setDay(safeDay);
    emit(m, safeDay);
  };

  const handleDay = e => {
    const d = e.target.value;
    setDay(d);
    emit(month, d);
  };

  return (
    <>
      <select
        className={`contribute-inline-select${!month ? ' contribute-inline-select--empty' : ''}`}
        value={month}
        onChange={handleMonth}
      >
        <option value="">-</option>
        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      <select
        className={`contribute-inline-select${!day ? ' contribute-inline-select--empty' : ''}`}
        value={day}
        onChange={handleDay}
      >
        <option value="">-</option>
        {Array.from({ length: maxDays }, (_, i) => i + 1).map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </>
  );
}

export default function ContributePage() {
  const [form, setForm] = useState({
    title: '',
    people: PEOPLES[0],
    date: '',
    description: '',
    region: '',
    author_email: '',
  });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => () => { previews.forEach(URL.revokeObjectURL); }, [previews]);

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleFiles = e => {
    const selected = Array.from(e.target.files);
    if (files.length + selected.length > 5) { setError('Максимум 5 изображений'); return; }
    setFiles(f => [...f, ...selected]);
    setPreviews(p => [...p, ...selected.map(f => URL.createObjectURL(f))]);
    setError('');
  };

  const removeFile = i => {
    URL.revokeObjectURL(previews[i]);
    const newFiles = files.filter((_, idx) => idx !== i);
    setFiles(newFiles);
    setPreviews(p => p.filter((_, idx) => idx !== i));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!consent) { setError('Необходимо дать согласие на обработку персональных данных'); return; }
    setError('');
    setLoading(true);
    try {
      const imageIds = files.length > 0 ? await uploadFiles(files) : [];
      await submitProposal({
        title: form.title,
        description: form.description,
        author_email: form.author_email,
        holiday_date: form.date || undefined,
        images: imageIds,
        people: form.people,
        region: form.region || null,
        approved: false,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return (
    <>
      <div className="page contribute-success">
        <div className="success-card">
          <h2>Спасибо за ваш вклад!</h2>
          <p>Информация о празднике «{form.title}» отправлена на модерацию.</p>
          <Link to="/" className="btn">Вернуться на главную</Link>
        </div>
      </div>
      <footer className="site-footer">
        <div className="footer-content">
          <p>677000, Республика Саха (Якутия), г. Якутск, ул. Орджоникидзе, д. 4</p>
          <p className="copyright">&copy; 2026 ФГБОУ ВО «Арктический государственный институт искусств и культуры»</p>
        </div>
      </footer>
    </>
  );

  return (
    <>
      <div className="page contribute-page">
        <Link to="/" className="back-link">&larr; На главную</Link>
        <h1>Предложить новый праздник или обряд</h1>
        {error && <p className="auth-error">{error}</p>}
        <form onSubmit={handleSubmit} className="contribute-form">

          <div className="form-group">
            <label>Название праздника *</label>
            <input type="text" value={form.title} onChange={set('title')} required placeholder="Например: Ысыах" />
          </div>

          <div className="form-group">
            <label>Народ, Дата празднования</label>
            <div className="contribute-inline-row">
              <select
                className="contribute-inline-select contribute-inline-select--people"
                value={form.people}
                onChange={set('people')}
                required
              >
                {PEOPLES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <MonthDayPicker
                value={form.date}
                onChange={v => setForm(f => ({ ...f, date: v }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Описание, обряды, история *</label>
            <textarea value={form.description} onChange={set('description')} required rows={5} placeholder="Расскажите об истории, обрядах и традициях праздника…" />
          </div>

          <div className="form-group">
            <label>Регион</label>
            <input type="text" value={form.region} onChange={set('region')} placeholder="Например: Мирнинский район" />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={form.author_email}
              onChange={set('author_email')}
              required
              autoComplete="email"
              placeholder="example@mail.ru"
            />
          </div>

          <div className="form-group">
            <label>Фотографии (до 5 шт.)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              className="file-input"
            />
            <div className="file-preview-container">
              {previews.map((src, idx) => (
                <div key={idx} className="file-preview-item">
                  <img src={src} alt={`Превью ${idx + 1}`} />
                  <button type="button" className="remove-file-btn" onClick={() => removeFile(idx)}>×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="consent-block">
            <label className="consent-check" htmlFor="consent-pd">
              <input
                id="consent-pd"
                type="checkbox"
                className="consent-checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
              />
            </label>
            <label className="consent-text-label" htmlFor="consent-pd">
              <span className="consent-text">
                Я согласен(а) на обработку персональных данных (email) в соответствии с{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer">политикой конфиденциальности</Link>{' '}
                согласно ФЗ-152
              </span>
            </label>
          </div>

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading || !consent}>
            {loading ? 'Отправка...' : 'ОТПРАВИТЬ ДАННЫЕ'}
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
