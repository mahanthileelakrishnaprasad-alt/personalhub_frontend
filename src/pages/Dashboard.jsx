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
  const [showAddForm, setShowAddForm] = useState(false)
  const [err, setErr] = useState('')

  const load = () => api.get('tasks/').then(r => { setTasks(r.data); setLoading(false) })
  useEffect(() => { load() }, [])

  const active = tasks.filter(t => !t.completed)
  const treasure = tasks.filter(t => t.completed)

  const addTask = async (e) => {
    e.preventDefault(); setErr('')
    try {
      await api.post('tasks/', { ...form, reminder_at: form.reminder_at || null })
      setForm({ title: '', note: '', reminder_at: '' }); setShowAddForm(false); load()
    } catch { setErr('Could not add task.') }
  }

  const complete = async (id) => { await api.post(`tasks/${id}/complete/`); load() }
  const restore  = async (id) => { await api.post(`tasks/${id}/restore/`); load() }
  const del      = async (id) => { if (!confirm('Delete task?')) return; await api.delete(`tasks/${id}/`); load() }

  const delAllTreasure = async () => {
    if (!confirm('Permanently delete all completed tasks?')) return
    await api.delete('tasks/treasure/delete-all/'); load()
  }

  const startEdit = (t) => {
    setEditId(t.id)
    setEditForm({ title: t.title, note: t.note || '', reminder_at: t.reminder_at ? t.reminder_at.slice(0,16) : '' })
  }

  const saveEdit = async (id) => {
    await api.patch(`tasks/${id}/`, { ...editForm, reminder_at: editForm.reminder_at || null })
    setEditId(null); load()
  }

  if (loading) return <div className="spinner" />

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>✅ Tasks</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{active.length} active</span>
          <button className="btn-primary btn-sm" onClick={() => setShowAddForm(v => !v)}>
            {showAddForm ? '✕ Close' : '+ Add Task'}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--accent)' }}>
          <form onSubmit={addTask}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input autoFocus placeholder="Task title…" value={form.title}
                onChange={e => setForm({...form, title: e.target.value})} required />
              <textarea placeholder="Note (optional)" value={form.note} rows={2} style={{ resize: 'vertical' }}
                onChange={e => setForm({...form, note: e.target.value})} />
              <div>
                <label>Reminder (optional)</label>
                <input type="datetime-local" value={form.reminder_at}
                  onChange={e => setForm({...form, reminder_at: e.target.value})} />
              </div>
              {err && <p className="msg-error">{err}</p>}
              <button className="btn-primary" style={{ alignSelf: 'flex-start' }}>+ Add Task</button>
            </div>
          </form>
        </div>
      )}

      {/* Active tasks */}
      {active.length === 0 ? (
        <div className="empty">No active tasks! Click "+ Add Task" to start. 🎯</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {active.map(t => (
            <div key={t.id} className="card" style={{ padding: '13px 15px' }}>
              {editId === t.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={editForm.title} onChange={e => setEditForm({...editForm,title:e.target.value})} />
                  <textarea value={editForm.note} rows={2} style={{ resize: 'vertical' }} onChange={e => setEditForm({...editForm,note:e.target.value})} />
                  <div><label>Reminder</label>
                    <input type="datetime-local" value={editForm.reminder_at} onChange={e => setEditForm({...editForm,reminder_at:e.target.value})} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-success btn-sm" onClick={() => saveEdit(t.id)}>Save</button>
                    <button className="btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div onClick={() => complete(t.id)} style={{
                    width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border)',
                    cursor: 'pointer', flexShrink: 0, marginTop: 1, transition: 'all .15s',
                    background: 'var(--surface3)',
                  }} title="Mark complete" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{t.title}</div>
                    {t.note && <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>{t.note}</div>}
                    {t.reminder_at && (
                      <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        ⏰ {fmtDate(t.reminder_at)}
                        {t.reminder_sent && <span className="badge badge-green" style={{fontSize:10}}>sent</span>}
                      </div>
                    )}
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
                        {t.completed_at && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Done {fmtDate(t.completed_at)}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
