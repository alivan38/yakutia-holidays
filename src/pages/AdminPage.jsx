import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PEOPLES } from '../constants';

const ADMIN_KEY = 'sp123';
const BASE_URL  = 'http://localhost:5000/api/proposals';
const TRASH_URL = 'http://localhost:5000/api/trash';
const SERVER_URL = 'http://localhost:5000';

const EMPTY_FORM = { title: '', people: PEOPLES[0], date: '', description: '', region: '' };

function parseEditImages(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.startsWith('{'))
    return raw.slice(1, -1).split(',').map(s => s.replace(/^"|"$/g, '')).filter(Boolean);
  return [];
}

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const key = searchParams.get('key');

  const [proposals, setProposals] = useState([]);
  const [trash, setTrash]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showTrash, setShowTrash] = useState(false);

  // Редактирование — всё в одном объекте вместо 7 отдельных useState
  const [editingId, setEditingId]     = useState(null);
  const [editForm, setEditForm]       = useState(EMPTY_FORM);
  const [editImages, setEditImages]   = useState([]);
  const [newFiles, setNewFiles]       = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const fileInputRef = useRef(null);

  const setField = field => e => setEditForm(f => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    if (key !== ADMIN_KEY) { setLoading(false); return; }
    loadProposals();
    loadTrash();
  }, [key]);

  async function apiCall(url, opts = {}) {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error((await res.json())?.error || 'Ошибка');
    return res.json();
  }

  const loadProposals = () =>
    apiCall(BASE_URL)
      .then(setProposals)
      .catch(() => setError('Ошибка загрузки данных'))
      .finally(() => setLoading(false));

  const loadTrash = () =>
    apiCall(`${TRASH_URL}?key=${key}`).then(setTrash).catch(console.error);

  const startEdit = p => {
    setEditingId(p.id);
    setEditForm({ title: p.title, people: p.people, date: p.date || '', description: p.description, region: p.region || '' });
    setEditImages(parseEditImages(p.images));
    setNewFiles([]);
    setNewPreviews([]);
  };

  const cancelEdit = () => {
    newPreviews.forEach(URL.revokeObjectURL);
    setEditingId(null);
    setNewFiles([]);
    setNewPreviews([]);
  };

  const handleNewFiles = e => {
    const selected = Array.from(e.target.files);
    if (editImages.length + newFiles.length + selected.length > 5) { alert('Максимум 5 изображений'); return; }
    setNewFiles(f => [...f, ...selected]);
    setNewPreviews(p => [...p, ...selected.map(URL.createObjectURL)]);
  };

  const saveEdit = async () => {
    if (!editForm.title || !editForm.people || !editForm.description) { alert('Заполните обязательные поля'); return; }
    try {
      let uploadedPaths = [];
      if (newFiles.length > 0) {
        const form = new FormData();
        newFiles.forEach(f => form.append('images', f));
        const data = await apiCall(`${BASE_URL}/upload?key=${key}`, { method: 'POST', body: form });
        uploadedPaths = data.images;
      }
      const finalImages = [...editImages, ...uploadedPaths];
      await apiCall(`${BASE_URL}/${editingId}?key=${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, images: finalImages }),
      });
      setProposals(prev => prev.map(p => p.id === editingId ? { ...p, ...editForm, images: finalImages } : p));
      cancelEdit();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Удалить запись? Она попадёт в корзину.')) return;
    try {
      await apiCall(`${BASE_URL}/${id}?key=${key}`, { method: 'DELETE' });
      setProposals(prev => prev.filter(p => p.id !== id));
      loadTrash();
    } catch { alert('Ошибка удаления'); }
  };

  const handleToggleApprove = async (id, approved) => {
    try {
      await apiCall(`${BASE_URL}/${id}/approve?key=${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      setProposals(prev => prev.map(p => p.id === id ? { ...p, approved } : p));
    } catch { alert('Ошибка обновления'); }
  };

  const restoreFromTrash = async id => {
    try { await apiCall(`${TRASH_URL}/restore/${id}?key=${key}`, { method: 'POST' }); loadTrash(); loadProposals(); }
    catch { alert('Ошибка восстановления'); }
  };

  const deleteFromTrash = async id => {
    if (!window.confirm('Удалить навсегда?')) return;
    try { await apiCall(`${TRASH_URL}/${id}?key=${key}`, { method: 'DELETE' }); loadTrash(); }
    catch { alert('Ошибка удаления'); }
  };

  const clearTrash = async () => {
    if (!window.confirm('Очистить корзину полностью?')) return;
    try { await apiCall(`${TRASH_URL}/clear/all?key=${key}`, { method: 'DELETE' }); loadTrash(); }
    catch { alert('Ошибка очистки'); }
  };

  if (key !== ADMIN_KEY) return (
    <div className="page">
      <h2>Доступ запрещён</h2>
      <p>Укажите правильный ключ в URL: ?key=sp123</p>
    </div>
  );

  if (loading) return <div className="page">Загрузка...</div>;
  if (error)   return <div className="page error">{error}</div>;

  return (
    <div className="page admin-page">
      <h1>Управление предложениями</h1>

      {/* Корзина */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button className="btn small-btn" onClick={() => setShowTrash(v => !v)}>
          Корзина ({trash.length})
        </button>
        {trash.length > 0 && showTrash && (
          <button className="btn small-btn btn-delete" onClick={clearTrash}>Очистить корзину</button>
        )}
      </div>

      {showTrash && (
        <div className="trash-panel">
          {trash.length === 0 ? <p>Корзина пуста</p> : (
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
                    <button className="btn small-btn btn-delete"  onClick={() => deleteFromTrash(item.id)}>Удал.</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Форма редактирования */}
      {editingId && (
        <div className="edit-panel">
          <h2>Редактировать предложение #{editingId}</h2>
          {[['title', 'Название *', 'input'], ['description', 'Описание *', 'textarea'], ['region', 'Регион', 'input']].map(([field, label, tag]) => (
            <div key={field} className="note-section">
              <label className="note-label">{label}</label>
              {tag === 'textarea'
                ? <textarea className="note-textarea" rows={6} value={editForm[field]} onChange={setField(field)} />
                : <input type="text" className="note-title-input" value={editForm[field]} onChange={setField(field)} />}
            </div>
          ))}
          <div className="note-section">
            <label className="note-label">Народ *</label>
            <select className="note-title-input" value={editForm.people} onChange={setField('people')}>
              {PEOPLES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="note-section">
            <label className="note-label">Дата празднования</label>
            <input type="date" className="note-title-input" value={editForm.date} onChange={setField('date')} />
          </div>
          <div className="note-section">
            <label className="note-label">Изображения (макс. 5)</label>
            <div className="edit-images-preview">
              {editImages.map((url, idx) => (
                <div key={idx} className="image-thumb">
                  <img src={`${SERVER_URL}${url}`} alt="" />
                  <button type="button" onClick={() => setEditImages(p => p.filter((_, i) => i !== idx))}>×</button>
                </div>
              ))}
              {newPreviews.map((src, idx) => (
                <div key={`new-${idx}`} className="image-thumb">
                  <img src={src} alt="" />
                  <button type="button" onClick={() => {
                    URL.revokeObjectURL(newPreviews[idx]);
                    setNewFiles(f => f.filter((_, i) => i !== idx));
                    setNewPreviews(p => p.filter((_, i) => i !== idx));
                  }}>×</button>
                </div>
              ))}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleNewFiles} className="file-input" />
            <small>Текущие: {editImages.length}, добавлено: {newFiles.length}, всего: {editImages.length + newFiles.length}/5</small>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="btn" onClick={saveEdit}>Сохранить</button>
            <button className="btn" style={{ background: '#888' }} onClick={cancelEdit}>Отмена</button>
          </div>
        </div>
      )}

      {/* Таблица */}
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
                <button className="btn small-btn btn-edit"   onClick={() => startEdit(p)}>Ред.</button>
                <button className={`btn small-btn ${p.approved ? 'btn-undo' : 'btn-approve'}`} onClick={() => handleToggleApprove(p.id, !p.approved)}>
                  {p.approved ? 'Отм.' : 'Одоб.'}
                </button>
                <button className="btn small-btn btn-delete"  onClick={() => handleDelete(p.id)}>Удал.</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
