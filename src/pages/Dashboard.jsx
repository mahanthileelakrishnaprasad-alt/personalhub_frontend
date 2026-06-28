import React, { useState, useEffect, useRef } from 'react'
import api from '../api/client'

function fmtDate(s) {
  if (!s) return ''
  return new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

const DEFAULT_CATS = ['Personal', 'Family', 'Study', 'Work', 'Health', 'Shopping']

// ── Drag-handle sortable list ─────────────────────────────────────────────────
function useDragSort(items, onReorder) {
  const dragIdx = useRef(null)
  const dragOver = useRef(null)

  const onDragStart = (i) => { dragIdx.current = i }
  const onDragEnter = (i) => { dragOver.current = i }
  const onDragEnd   = () => {
    if (dragIdx.current === null || dragOver.current === null || dragIdx.current === dragOver.current) {
      dragIdx.current = dragOver.current = null; return
    }
    const next = [...items]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(dragOver.current, 0, moved)
    dragIdx.current = dragOver.current = null
    onReorder(next)
  }
  return { onDragStart, onDragEnter, onDragEnd }
}

export default function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('')
  const emptyForm = (catId = '') => ({ title: '', note: '', reminder_at: '', category: catId })
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showTreasure, setShowTreasure] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [editCatId, setEditCatId] = useState(null)
  const [editCatName, setEditCatName] = useState('')
  const [err, setErr] = useState('')
  const [draggingIdx, setDraggingIdx] = useState(null)

  const load = async (filter = catFilter) => {
    const params = filter === 'none' ? '?category=none' : filter ? `?category=${filter}` : ''
    const [t, c] = await Promise.all([api.get(`tasks/${params}`), api.get('tasks/categories/')])
    setTasks(t.data); setCategories(c.data); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const applyFilter = (v) => {
    setCatFilter(v); load(v)
    const numId = parseInt(v)
    setForm(f => ({ ...f, category: !isNaN(numId) && numId > 0 ? String(numId) : '' }))
  }

  const active  = tasks.filter(t => !t.completed)
  const treasure = tasks.filter(t => t.completed)

  // Drag-to-reorder for active tasks
  const dragIdx  = useRef(null)
  const dragOver = useRef(null)

  const handleDragStart = (i) => { dragIdx.current = i; setDraggingIdx(i) }
  const handleDragEnter = (i) => { dragOver.current = i }
  const handleDragEnd   = async () => {
    setDraggingIdx(null)
    if (dragIdx.current === null || dragOver.current === null || dragIdx.current === dragOver.current) {
      dragIdx.current = dragOver.current = null; return
    }
    const next = [...active]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(dragOver.current, 0, moved)
    dragIdx.current = dragOver.current = null
    setTasks([...next, ...treasure])
    await api.post('tasks/reorder/', { ordered_ids: next.map(t => t.id) })
  }

  const addTask = async (e) => {
    e.preventDefault(); setErr('')
    try {
      await api.post('tasks/', { ...form, reminder_at: form.reminder_at || null, category: form.category || null })
      const numId = parseInt(catFilter)
      setForm(emptyForm(!isNaN(numId) && numId > 0 ? String(numId) : ''))
      setShowAddForm(false); load()
    } catch { setErr('Could not add task.') }
  }

  const complete = async (id) => { await api.post(`tasks/${id}/complete/`); load() }
  const restore  = async (id) => { await api.post(`tasks/${id}/restore/`); load() }
  const del      = async (id) => { if (!confirm('Delete task?')) return; await api.delete(`tasks/${id}/`); load() }
  const delAllTreasure = async () => { if (!confirm('Delete all completed tasks?')) return; await api.delete('tasks/treasure/delete-all/'); load() }

  const startEdit = (t) => {
    setEditId(t.id)
    setEditForm({ title: t.title, note: t.note || '', reminder_at: t.reminder_at ? t.reminder_at.slice(0,16) : '', category: t.category ? String(t.category) : '' })
  }
  const saveEdit = async (id) => {
    await api.patch(`tasks/${id}/`, { ...editForm, reminder_at: editForm.reminder_at || null, category: editForm.category || null })
    setEditId(null); load()
  }

  const addCat = async (e) => { e.preventDefault(); await api.post('tasks/categories/', { name: newCatName }); setNewCatName(''); load() }
  const saveCat = async (id) => { await api.patch(`tasks/categories/${id}/`, { name: editCatName }); setEditCatId(null); load() }
  const deleteCat = async (id) => { if (!confirm('Delete? Tasks become Uncategorized.')) return; await api.delete(`tasks/categories/${id}/`); load() }
  const seedDefaultCats = async () => { for (const name of DEFAULT_CATS) { try { await api.post('tasks/categories/', { name }) } catch {} } load() }

  const CatSelect = ({ value, onChange }) => (
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Uncategorized</option>
      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  )

  if (loading) return <div className="spinner" />

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>✅ Tasks</h1>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{active.length} active</span>
          <button className="btn-primary btn-sm" onClick={() => setShowAddForm(v => !v)}>
            {showAddForm ? '✕ Close' : '+ Add Task'}
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <button className={`btn-xs ${catFilter === '' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => applyFilter('')}>All</button>
        <button className={`btn-xs ${catFilter === 'none' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => applyFilter('none')}>Uncat.</button>
        {categories.map(c => (
          <button key={c.id} className={`btn-xs ${catFilter === String(c.id) ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => applyFilter(String(c.id))}>{c.name}</button>
        ))}
        <button className="btn-secondary btn-xs" style={{ marginLeft: 'auto' }} onClick={() => setShowCatModal(true)}>⚙️ Categories</button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--accent)' }}>
          <form onSubmit={addTask}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input autoFocus placeholder="Task title…" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
              <textarea placeholder="Note (optional)" value={form.note} rows={2} style={{ resize: 'vertical' }}
                onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
              <div className="form-row">
                <div><label>Category</label><CatSelect value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} /></div>
                <div><label>Reminder</label>
                  <input type="datetime-local" value={form.reminder_at} onChange={e => setForm(p => ({ ...p, reminder_at: e.target.value }))} />
                </div>
              </div>
              {err && <p className="msg-error">{err}</p>}
              <button className="btn-primary" style={{ alignSelf: 'flex-start' }}>+ Add Task</button>
            </div>
          </form>
        </div>
      )}

      {/* Active tasks — draggable */}
      {active.length === 0 ? (
        <div className="empty">No active tasks! Click "+ Add Task" to start. 🎯</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {active.map((t, idx) => (
            <div key={t.id}
              draggable={editId !== t.id}
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              className="card"
              style={{
                padding: '13px 15px',
                opacity: draggingIdx === idx ? 0.45 : 1,
                transition: 'opacity .15s',
                cursor: 'default',
              }}
            >
              {editId === t.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                  <textarea value={editForm.note} rows={2} style={{ resize: 'vertical' }}
                    onChange={e => setEditForm(p => ({ ...p, note: e.target.value }))} />
                  <div className="form-row">
                    <div><label>Category</label><CatSelect value={editForm.category} onChange={v => setEditForm(p => ({ ...p, category: v }))} /></div>
                    <div><label>Reminder</label>
                      <input type="datetime-local" value={editForm.reminder_at} onChange={e => setEditForm(p => ({ ...p, reminder_at: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-success btn-sm" onClick={() => saveEdit(t.id)}>Save</button>
                    <button className="btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {/* Drag handle */}
                  <span
                    style={{ fontSize: 18, color: 'var(--text3)', cursor: 'grab', flexShrink: 0, marginTop: 1, userSelect: 'none', touchAction: 'none' }}
                    title="Drag to reorder"
                  >≡</span>
                  {/* Number */}
                  <div style={{
                    minWidth: 22, height: 22, borderRadius: 6, background: 'var(--bg2)',
                    color: 'var(--text3)', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                  }}>{idx + 1}</div>
                  {/* Complete */}
                  <div onClick={() => complete(t.id)} style={{
                    width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border)',
                    cursor: 'pointer', flexShrink: 0, marginTop: 1, background: 'var(--surface3)',
                  }} title="Mark complete" />
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{t.title}</div>
                    {t.note && <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>{t.note}</div>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {t.category_name && <span className="tag" style={{ fontSize: 11 }}>{t.category_name}</span>}
                      {t.reminder_at && (
                        <span style={{ fontSize: 11, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          ⏰ {fmtDate(t.reminder_at)}
                          {t.reminder_sent && <span className="badge badge-green" style={{ fontSize: 10 }}>sent</span>}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button className="btn-icon btn-sm" onClick={() => startEdit(t)}>✏️</button>
                    <button className="btn-icon btn-sm" onClick={() => del(t.id)}>🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Treasure Box */}
      {treasure.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button className="btn-secondary" style={{ width: '100%', marginBottom: 10, textAlign: 'left', fontWeight: 600 }}
            onClick={() => setShowTreasure(v => !v)}>
            {showTreasure ? '▾' : '▸'} 💎 Treasure Box ({treasure.length})
          </button>
          {showTreasure && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {treasure.map(t => (
                  <div key={t.id} className="card" style={{ opacity: 0.68, padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 15 }}>✅</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ textDecoration: 'line-through', color: 'var(--text2)', wordBreak: 'break-word' }}>{t.title}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                          {t.category_name && <span className="tag" style={{ fontSize: 10 }}>{t.category_name}</span>}
                          {t.completed_at && <span style={{ fontSize: 11, color: 'var(--text3)' }}>Done {fmtDate(t.completed_at)}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button className="btn-icon btn-sm" onClick={() => restore(t.id)}>↩️</button>
                        <button className="btn-icon btn-sm" onClick={() => del(t.id)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-danger btn-sm" style={{ marginTop: 10 }} onClick={delAllTreasure}>Delete All Treasure</button>
            </>
          )}
        </div>
      )}

      {/* Categories modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCatModal(false) }}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="modal-title" style={{ margin: 0 }}>Task Categories</div>
              <button className="btn-icon" onClick={() => setShowCatModal(false)}>✕</button>
            </div>
            <form onSubmit={addCat} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input placeholder="New category name" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
              <button className="btn-primary btn-sm" style={{ flexShrink: 0 }}>+ Add</button>
            </form>
            {categories.length === 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 8 }}>No categories yet.</p>
                <button className="btn-secondary btn-sm" onClick={seedDefaultCats}>✨ Add defaults</button>
              </div>
            )}
            {categories.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                {editCatId === c.id ? (
                  <><input value={editCatName} onChange={e => setEditCatName(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn-success btn-sm" onClick={() => saveCat(c.id)}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={() => setEditCatId(null)}>✕</button></>
                ) : (
                  <><span style={{ flex: 1 }}>{c.name}</span>
                  <button className="btn-icon btn-sm" onClick={() => { setEditCatId(c.id); setEditCatName(c.name) }}>✏️</button>
                  <button className="btn-icon btn-sm" onClick={() => deleteCat(c.id)}>🗑️</button></>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}