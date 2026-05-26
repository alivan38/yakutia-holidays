import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

const ADMIN_KEY = 'sp123';
const BASE_URL = 'http://localhost:5000/api/proposals';
const TRASH_URL = 'http://localhost:5000/api/trash';
const PEOPLES = ['Якуты', 'Эвенки', 'Эвены', 'Юкагиры', 'Долганы', 'Чукчи', 'Другое'];
const SERVER_URL = 'http://localhost:5000';

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const key = searchParams.get('key');
  const [proposals, setProposals] = useState([]);
  const [trash, setTrash] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPeople, setEditPeople] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRegion, setEditRegion] = useState('');

  const [editImages, setEditImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const fileInputRef = useRef(null);

  const [showTrash, setShowTrash] = useState(false);

  useEffect(() => {
    if (key !== ADMIN_KEY) {
      setLoading(false);
      return;
    }
    loadProposals();
    loadTrash();
  }, [key]);

  const loadProposals = async () => {
    try {
      const res = await fetch(BASE_URL);
      const data = await res.json();
      setProposals(data);
    } catch (err) {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const loadTrash = async () => {
    try {
      const res = await fetch(`${TRASH_URL}?key=${key}`);
      const data = await res.json();
      setTrash(data);
    } catch (err) {
      console.error('Ошибка загрузки корзины');
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditPeople(p.people);
    setEditDate(p.date || '');
    setEditDescription(p.description);
    setEditRegion(p.region || '');

    let imgs = [];
    if (p.images) {
      if (Array.isArray(p.images)) {
        imgs = p.images;
      } else if (typeof p.images === 'string' && p.images.startsWith('{')) {
        imgs = p.images.slice(1, -1).split(',').map(s => s.replace(/^"|"$/g, '')).filter(Boolean);
      }
    }
    setEditImages(imgs);
    setNewFiles([]);
    setNewPreviews([]);
  };

  const handleNewFiles = (e) => {
    const selected = Array.from(e.target.files);
    if (editImages.length + newFiles.length + selected.length > 5) {
      alert('Максимум 5 изображений');
      return;
    }
    setNewFiles(prev => [...prev, ...selected]);
    const previews = selected.map(file => URL.createObjectURL(file));
    setNewPreviews(prev => [...prev, ...previews]);
  };

  const removeEditImage = (index) => {
    setEditImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const saveEdit = async () => {
    if (!editTitle || !editPeople || !editDescription) {
      alert('Заполните обязательные поля');
      return;
    }
    try {
      let uploadedPaths = [];
      if (newFiles.length > 0) {
        const formData = new FormData();
        newFiles.forEach(file => formData.append('images', file));
        const uploadRes = await fetch(`${BASE_URL}/upload?key=${key}`, {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || 'Ошибка загрузки фото');
        }
        const data = await uploadRes.json();
        uploadedPaths = data.images;
      }

      const finalImages = [...editImages, ...uploadedPaths];

      const res = await fetch(`${BASE_URL}/${editingId}?key=${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          people: editPeople,
          date: editDate,
          description: editDescription,
          region: editRegion,
          images: finalImages,
        }),
      });

      if (!res.ok) throw new Error('Ошибка сохранения');

      setProposals(proposals.map(p =>
        p.id === editingId
          ? { ...p, title: editTitle, people: editPeople, date: editDate, description: editDescription, region: editRegion, images: finalImages }
          : p
      ));
      setEditingId(null);
      newPreviews.forEach(url => URL.revokeObjectURL(url));
      setNewFiles([]);
      setNewPreviews([]);
    } catch (err) {
      alert(err.message);
    }
  };

  const cancelEdit = () => {
    newPreviews.forEach(url => URL.revokeObjectURL(url));
    setEditingId(null);
    setNewFiles([]);
    setNewPreviews([]);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить запись? Она попадёт в корзину.')) return;
    try {
      const res = await fetch(`${BASE_URL}/${id}?key=${key}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setProposals(proposals.filter(p => p.id !== id));
      loadTrash();
    } catch {
      alert('Ошибка удаления');
    }
  };

  const handleToggleApprove = async (id, approved) => {
    try {
      const res = await fetch(`${BASE_URL}/${id}/approve?key=${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      if (!res.ok) throw new Error();
      setProposals(proposals.map(p => p.id === id ? { ...p, approved } : p));
    } catch {
      alert('Ошибка обновления');
    }
  };

  const restoreFromTrash = async (id) => {
    try {
      await fetch(`${TRASH_URL}/restore/${id}?key=${key}`, { method: 'POST' });
      loadTrash();
      loadProposals();
    } catch {
      alert('Ошибка восстановления');
    }
  };

  const deleteFromTrash = async (id) => {
    if (!window.confirm('Удалить навсегда?')) return;
    try {
      await fetch(`${TRASH_URL}/${id}?key=${key}`, { method: 'DELETE' });
      loadTrash();
    } catch {
      alert('Ошибка удаления');
    }
  };

  const clearTrash = async () => {
    if (!window.confirm('Очистить корзину полностью?')) return;
    try {
      await fetch(`${TRASH_URL}/clear/all?key=${key}`, { method: 'DELETE' });
      loadTrash();
    } catch {
      alert('Ошибка очистки');
    }
  };

  if (key !== ADMIN_KEY) {
    return (
      <div className="page">
        <h2>Доступ запрещён</h2>
        <p>Укажите правильный ключ в URL: ?key=sp123</p>
      </div>
    );
  }

  if (loading) return <div className="page">Загрузка...</div>;
  if (error) return <div className="page error">{error}</div>;

  return (
    <div className="page admin-page">
      <h1>Управление предложениями</h1>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button className="btn small-btn" onClick={() => setShowTrash(!showTrash)}>
          Корзина ({trash.length})
        </button>
        {trash.length > 0 && showTrash && (
          <button className="btn small-btn btn-delete" onClick={clearTrash}>
            Очистить корзину
          </button>
        )}
      </div>

      {showTrash && (
        <div className="trash-panel">
          {trash.length === 0 ? (
            <p>Корзина пуста</p>
          ) : (
            <ul className="trash-list">
              {trash.map(item => (
                <li key={item.id} className="trash-item">
                  <div className="trash-item-info">
                    <strong>{item.title}</strong> — {item.people}
                    <br />
                    <small>Удалено {new Date(item.deleted_at).toLocaleString('ru-RU')}</small>
                  </div>
                  <div className="trash-item-actions">
                    <button className="btn small-btn btn-approve" onClick={() => restoreFromTrash(item.id)}>Восст.</button>
                    <button className="btn small-btn btn-delete" onClick={() => deleteFromTrash(item.id)}>Удал.</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editingId && (
        <div className="edit-panel">
          <h2>Редактировать предложение #{editingId}</h2>
          <div className="note-section">
            <label className="note-label">Название *</label>
            <input type="text" className="note-title-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div className="note-section">
            <label className="note-label">Народ *</label>
            <select value={editPeople} onChange={(e) => setEditPeople(e.target.value)} className="note-title-input">
              {PEOPLES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="note-section">
            <label className="note-label">Дата празднования</label>
            <input
              type="date"
              className="note-title-input"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />
          </div>
          <div className="note-section">
            <label className="note-label">Описание *</label>
            <textarea className="note-textarea" rows={6} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
          </div>
          <div className="note-section">
            <label className="note-label">Регион</label>
            <input type="text" className="note-title-input" value={editRegion} onChange={(e) => setEditRegion(e.target.value)} />
          </div>

          <div className="note-section">
            <label className="note-label">Изображения (макс. 5)</label>
            <div className="edit-images-preview">
              {editImages.map((url, idx) => (
                <div key={idx} className="image-thumb">
                  <img src={`${SERVER_URL}${url}`} alt="" />
                  <button type="button" onClick={() => removeEditImage(idx)}>×</button>
                </div>
              ))}
              {newPreviews.map((src, idx) => (
                <div key={`new-${idx}`} className="image-thumb">
                  <img src={src} alt="" />
                  <button type="button" onClick={() => removeNewImage(idx)}>×</button>
                </div>
              ))}
            </div>
            <input type="file" accept="image/*" multiple onChange={handleNewFiles} className="file-input" />
            <small>Текущие: {editImages.length}, добавлено: {newFiles.length}, всего: {editImages.length + newFiles.length}/5</small>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="button" className="btn" onClick={saveEdit}>Сохранить</button>
            <button type="button" className="btn" style={{ background: '#888' }} onClick={cancelEdit}>Отмена</button>
          </div>
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th><th>Название</th><th>Народ</th><th>Дата</th><th>Описание</th><th>Регион</th><th>Одобрено</th><th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {proposals.map(p => (
            <tr key={p.id} className={`${p.approved ? 'approved' : ''} ${p.id === editingId ? 'editing-row' : ''}`}>
              <td>{p.id}</td>
              <td>{p.title}</td>
              <td>{p.people}</td>
              <td>{p.date || '—'}</td>
              <td>{p.description}</td>
              <td>{p.region || '—'}</td>
              <td>{p.approved ? 'Да' : 'Нет'}</td>
              <td>
                <button className="btn small-btn btn-edit" onClick={() => startEdit(p)}>Ред.</button>
                <button className={`btn small-btn ${p.approved ? 'btn-undo' : 'btn-approve'}`} onClick={() => handleToggleApprove(p.id, !p.approved)}>
                  {p.approved ? 'Отм.' : 'Одоб.'}
                </button>
                <button className="btn small-btn btn-delete" onClick={() => handleDelete(p.id)}>Удал.</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
