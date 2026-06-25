import React, { useState, useEffect } from 'react'
import api from '../api/client'

function fmtDate(s) {
  if (!s) return ''
  return new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', note: '', reminder_at: '' })
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showTreasure, setShowTreasure] = useState(false)
  const [err, setErr] = useState('')

  const load = () => api.get('tasks/').then(r => { setTasks(r.data); setLoading(false) })
  useEffect(() => { load() }, [])

  const active = tasks.filter(t => !t.completed)
  const treasure = tasks.filter(t => t.completed)

  const addTask = async (e) => {
    e.preventDefault(); setErr('')
    if (!form.title.trim()) return
    try {
      await api.post('tasks/', { ...form, reminder_at: form.reminder_at || null })
      setForm({ title: '', note: '', reminder_at: '' })
      load()
    } catch (e) { setErr('Could not add task.') }
  }

  const complete = async (id) => {
    await api.post(`tasks/${id}/complete/`)
    load()
  }

  const restore = async (id) => {
    await api.post(`tasks/${id}/restore/`)
    load()
  }

  const del = async (id) => {
    if (!confirm('Delete this task?')) return
    await api.delete(`tasks/${id}/`)
    load()
  }

  const delAllTreasure = async () => {
    if (!confirm('Permanently delete all completed tasks?')) return
    await api.delete('tasks/treasure/delete-all/')
    load()
  }

  const startEdit = (t) => {
    setEditId(t.id)
    setEditForm({
      title: t.title,
      note: t.note || '',
      reminder_at: t.reminder_at ? t.reminder_at.slice(0, 16) : '',
    })
  }

  const saveEdit = async (id) => {
    await api.patch(`tasks/${id}/`, { ...editForm, reminder_at: editForm.reminder_at || null })
    setEditId(null)
    load()
  }

  if (loading) return <div className="spinner" />

  return (
    <div className="page">
      <h1 className="page-title">📋 Tasks</h1>

      {/* Add form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={addTask}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              placeholder="Add a new task…"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
            />
            <textarea
              placeholder="Note (optional)"
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              rows={2}
              style={{ resize: 'vertical' }}
            />
            <div className="form-row" style={{ alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label>Reminder (optional)</label>
                <input
                  type="datetime-local"
                  value={form.reminder_at}
                  onChange={e => setForm({ ...form, reminder_at: e.target.value })}
                />
              </div>
              <button className="btn-primary" style={{ alignSelf: 'flex-end', whiteSpace: 'nowrap' }}>
                + Add Task
              </button>
            </div>
          </div>
          {err && <p className="msg-error">{err}</p>}
        </form>
      </div>

      {/* Active tasks */}
      {active.length === 0 ? (
        <div className="empty">No active tasks. Add one above! ✅</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {active.map(t => (
            <div key={t.id} className="card">
              {editId === t.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                  <textarea value={editForm.note} onChange={e => setEditForm({ ...editForm, note: e.target.value })} rows={2} style={{ resize: 'vertical' }} />
                  <div className="form-row">
                    <div style={{ flex: 1 }}>
                      <label>Reminder</label>
                      <input type="datetime-local" value={editForm.reminder_at} onChange={e => setEditForm({ ...editForm, reminder_at: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-success btn-sm" onClick={() => saveEdit(t.id)}>Save</button>
                    <button className="btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <input
                    type="checkbox"
                    style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                    onChange={() => complete(t.id)}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{t.title}</div>
                    {t.note && <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>{t.note}</div>}
                    {t.reminder_at && (
                      <div style={{ fontSize: 12, color: 'var(--yellow)', marginTop: 4 }}>
                        ⏰ {fmtDate(t.reminder_at)}
                        {t.reminder_sent && <span style={{ color: 'var(--green)', marginLeft: 6 }}>✓ sent</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
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
        <div style={{ marginTop: 28 }}>
          <button
            className="btn-secondary"
            style={{ width: '100%', textAlign: 'left', marginBottom: 10 }}
            onClick={() => setShowTreasure(v => !v)}
          >
            {showTreasure ? '▾' : '▸'} 💎 Treasure Box ({treasure.length})
          </button>
          {showTreasure && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {treasure.map(t => (
                  <div key={t.id} className="card" style={{ opacity: 0.7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 16 }}>✅</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ textDecoration: 'line-through', color: 'var(--text2)' }}>{t.title}</div>
                        {t.completed_at && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Done {fmtDate(t.completed_at)}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon btn-sm" title="Restore" onClick={() => restore(t.id)}>↩️</button>
                        <button className="btn-icon btn-sm" onClick={() => del(t.id)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-danger btn-sm" style={{ marginTop: 10 }} onClick={delAllTreasure}>
                Delete All Treasure
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
