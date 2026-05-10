import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

const PEOPLES = ['Якуты', 'Эвенки', 'Эвены', 'Юкагиры', 'Долганы', 'Чукчи', 'Другое'];

export default function ContributePage() {
  const [title, setTitle] = useState('');
  const [people, setPeople] = useState(PEOPLES[0]);
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  // drag‑and‑drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  // Отправка
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('form-name', 'contribute');
    formData.append('title', title);
    formData.append('people', people);
    formData.append('description', description);
    formData.append('region', region);
    if (file) formData.append('attachment', file);

    try {
      await fetch('/', { method: 'POST', body: formData });
      setSubmitted(true);
    } catch (err) {
      console.error('Ошибка отправки:', err);
      alert('Что‑то пошло не так. Попробуйте позже.');
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

      <form
        method="POST"
        data-netlify="true"
        name="contribute"
        onSubmit={handleSubmit}
        className="contribute-form"
        encType="multipart/form-data"
      >
        <input type="hidden" name="form-name" value="contribute" />

        <div className="form-group">
          <label>Название праздника *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Например: Праздник оленевода" />
        </div>

        <div className="form-group">
          <label>Народ *</label>
          <select value={people} onChange={(e) => setPeople(e.target.value)} required>
            {PEOPLES.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </div>

        <div className="form-group">
          <label>Описание, обряды, история *</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={6} placeholder="Расскажите о празднике подробнее..." />
        </div>

        <div className="form-group">
          <label>Регион (улус, местность)</label>
          <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Например: Оленёкский улус" />
        </div>

        {/* Drag‑and‑drop файла */}
        <div className="form-group">
          <label>Изображение или документ</label>
          <div
            className={`file-drop-area ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            {file ? <p>✅ {file.name}</p> : <p>Перетащите файл сюда или кликните для выбора</p>}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx" />
          </div>
        </div>

        <button type="submit" className="btn" style={{ width: '100%' }}>
          ОТПРАВИТЬ ДАННЫЕ
        </button>
      </form>
    </div>
  );
}