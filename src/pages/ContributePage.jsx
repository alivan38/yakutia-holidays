import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api/proposals';
const PEOPLES = ['Якуты', 'Эвенки', 'Эвены', 'Юкагиры', 'Долганы', 'Чукчи', 'Другое'];

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
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    if (files.length + selected.length > 5) {
      setError('Максимум 5 изображений');
      return;
    }
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
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка отправки');
      }
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
        <div className="form-group">
          <label>Дата празднования</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="дд.мм.гггг"
          />
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
