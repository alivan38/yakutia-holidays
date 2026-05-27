import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createProposal } from '../api/proposalsApi';

const PEOPLES = ['Якуты', 'Эвенки', 'Эвены', 'Юкагиры', 'Долганы', 'Чукчи', 'Другое'];

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

const DIRECTUS_URL = 'http://localhost:8055';

function MonthDayPicker({ value, onChange }) {
  const parse = (v) => {
    if (!v) return { month: '', day: '' };
    const parts = v.split('-');
    return { month: parseInt(parts[1], 10), day: parseInt(parts[2], 10) };
  };

  const { month: initMonth, day: initDay } = parse(value);
  const [month, setMonth] = useState(initMonth || '');
  const [day,   setDay]   = useState(initDay   || '');

  const maxDays = month ? (MONTHS.find(m => m.value === Number(month))?.days ?? 31) : 31;
  const days    = Array.from({ length: maxDays }, (_, i) => i + 1);

  const handleMonth = (e) => {
    const m = e.target.value;
    setMonth(m);
    const newMax = MONTHS.find(mo => mo.value === Number(m))?.days ?? 31;
    const safeDay = day && Number(day) <= newMax ? day : '';
    setDay(safeDay);
    emit(m, safeDay);
  };

  const handleDay = (e) => {
    const d = e.target.value;
    setDay(d);
    emit(month, d);
  };

  const emit = (m, d) => {
    if (m && d) {
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      onChange(`2000-${mm}-${dd}`);
    } else {
      onChange('');
    }
  };

  return (
    <div className="month-day-picker">
      <div className="month-day-picker__field">
        <label className="month-day-picker__sublabel">Месяц</label>
        <select className="month-day-picker__select" value={month} onChange={handleMonth}>
          <option value="">—</option>
          {MONTHS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <div className="month-day-picker__divider">/</div>
      <div className="month-day-picker__field month-day-picker__field--day">
        <label className="month-day-picker__sublabel">День</label>
        <select className="month-day-picker__select" value={day} onChange={handleDay} disabled={!month}>
          <option value="">—</option>
          {days.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function ContributePage() {
  const [title,       setTitle]       = useState('');
  const [people,      setPeople]      = useState(PEOPLES[0]);
  const [date,        setDate]        = useState('');
  const [description, setDescription] = useState('');
  const [region,      setRegion]      = useState('');
  const [files,       setFiles]       = useState([]);
  const [previews,    setPreviews]    = useState([]);
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    return () => { previews.forEach(url => URL.revokeObjectURL(url)); };
  }, [previews]);

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    if (files.length + selected.length > 5) {
      setError('Максимум 5 изображений');
      return;
    }
    const newPreviews = selected.map(f => URL.createObjectURL(f));
    setFiles([...files, ...selected]);
    setPreviews([...previews, ...newPreviews]);
    setError('');
  };

  const removeFile = (i) => {
    URL.revokeObjectURL(previews[i]);
    setFiles(files.filter((_, idx) => idx !== i));
    setPreviews(previews.filter((_, idx) => idx !== i));
  };

  // Получаем токен один раз
  const getToken = async () => {
    const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@yakutia.ru', password: 'admin123' }),
    });
    const data = await res.json();
    return data.data.access_token;
  };

  // Загрузка одного файла
  const uploadFile = async (file, token) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${DIRECTUS_URL}/files`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    return json?.data?.id || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Загружаем фото если есть
      let imageIds = [];
      if (files.length > 0) {
        const token = await getToken();
        for (const file of files) {
          const uuid = await uploadFile(file, token);
          if (uuid) imageIds.push(uuid);
        }
      }

      // 2. Создаём запись в propsals
      await createProposal({
        title,
        people,
        date:        date || null,
        description,
        region:      region || null,
        image:       imageIds.length > 0 ? JSON.stringify(imageIds) : null,
        approved:    false,
      });

      setSubmitted(true);
    } catch (err) {
      console.error('Ошибка:', err);
      setError(err.message || 'Ошибка отправки');
    } finally {
      setLoading(false);
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
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>Народ *</label>
          <select value={people} onChange={e => setPeople(e.target.value)} required>
            {PEOPLES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Дата празднования</label>
          <MonthDayPicker value={date} onChange={setDate} />
        </div>

        <div className="form-group">
          <label>Описание, обряды, история *</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={5} />
        </div>

        <div className="form-group">
          <label>Регион</label>
          <input type="text" value={region} onChange={e => setRegion(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Фотографии (до 5 шт.)</label>
          <input type="file" accept="image/*" multiple onChange={handleFiles} className="file-input" />
          <div className="file-preview-container">
            {previews.map((src, idx) => (
              <div key={idx} className="file-preview-item">
                <img src={src} alt={`Превью ${idx + 1}`} />
                <button type="button" className="remove-file-btn" onClick={() => removeFile(idx)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Отправка...' : 'ОТПРАВИТЬ ДАННЫЕ'}
        </button>
      </form>
    </div>
  );
}
