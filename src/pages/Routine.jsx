import React, { useState, useEffect } from 'react'
import api from '../api/client'

export default function Routine() {
  const [data, setData] = useState(null)
  const [routineTasks, setRoutineTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [addForm, setAddForm] = useState({ title: '', reminder_time: '' })
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const loadToday = () => api.get('routine/today/').then(r => setData(r.data))
  const loadTasks = () => api.get('routine/tasks/').then(r => setRoutineTasks(r.data))

  useEffect(() => {
    Promise.all([loadToday(), loadTasks()]).finally(() => setLoading(false))
  }, [])

  const addRoutine = async (e) => {
    e.preventDefault()
    if (!addForm.title.trim()) return
    await api.post('routine/tasks/', { ...addForm, reminder_time: addForm.reminder_time || null })
    setAddForm({ title: '', reminder_time: '' })
    await Promise.all([loadToday(), loadTasks()])
  }

  const toggle = async (logId) => {
    await api.post(`routine/logs/${logId}/toggle/`)
    loadToday()
  }

  const deleteRoutine = async (id) => {
    if (!confirm('Delete this routine task? All its logs will be removed too.')) return
    await api.delete(`routine/tasks/${id}/`)
    await Promise.all([loadToday(), loadTasks()])
  }

  const saveEdit = async (id) => {
    await api.patch(`routine/tasks/${id}/`, { ...editForm, reminder_time: editForm.reminder_time || null })
    setEditId(null)
    await Promise.all([loadToday(), loadTasks()])
  }

  const deleteHistory = async () => {
    if (!confirm('Delete all past routine history (keeps today)?')) return
    await api.delete('routine/history/delete/')
    loadToday()
  }

  if (loading) return <div className="spinner" />

  const pct = (v, label) => (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{v}%</span>
      </div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${v}%` }} /></div>
    </div>
  )

  return (
    <div className="page">
      <h1 className="page-title">🔁 Daily Routine</h1>

      {/* Progress */}
      {data && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span style={{ fontWeight: 600 }}>{data.done_today}/{data.total_today}</span>
            <span style={{ color: 'var(--text2)', fontSize: 14 }}>completed today</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pct(data.today_pct, 'Today')}
            {pct(data.week_pct, 'This Week')}
            {pct(data.month_pct, 'This Month')}
          </div>
        </div>
      )}

      {/* Today's checklist */}
      {data && data.logs.length === 0 ? (
        <div className="empty">No routine tasks yet. Add some below!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {data?.logs.map(log => (
            <div key={log.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="checkbox"
                checked={log.completed}
                onChange={() => toggle(log.id)}
                style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{
                flex: 1,
                textDecoration: log.completed ? 'line-through' : 'none',
                color: log.completed ? 'var(--text2)' : 'var(--text)',
                fontWeight: 500,
              }}>
                {log.routine_task_title}
              </span>
              {log.completed && <span style={{ fontSize: 16 }}>✅</span>}
            </div>
          ))}
        </div>
      )}

      {/* Manage routine tasks */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Manage Habits</div>
        <form onSubmit={addRoutine} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            placeholder="New habit name…"
            value={addForm.title}
            onChange={e => setAddForm({ ...addForm, title: e.target.value })}
            style={{ flex: 1, minWidth: 160 }}
            required
          />
          <input
            type="time"
            value={addForm.reminder_time}
            onChange={e => setAddForm({ ...addForm, reminder_time: e.target.value })}
            style={{ width: 120 }}
            title="Daily reminder time (optional)"
          />
          <button className="btn-primary">+ Add</button>
        </form>

        {routineTasks.map(rt => (
          <div key={rt.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
            {editId === rt.id ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} style={{ flex: 1 }} />
                <input type="time" value={editForm.reminder_time} onChange={e => setEditForm({ ...editForm, reminder_time: e.target.value })} style={{ width: 120 }} />
                <button className="btn-success btn-sm" onClick={() => saveEdit(rt.id)}>Save</button>
                <button className="btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1 }}>{rt.title}</span>
                {rt.reminder_time && <span className="tag">⏰ {rt.reminder_time}</span>}
                <button className="btn-icon btn-sm" onClick={() => { setEditId(rt.id); setEditForm({ title: rt.title, reminder_time: rt.reminder_time || '' }) }}>✏️</button>
                <button className="btn-icon btn-sm" onClick={() => deleteRoutine(rt.id)}>🗑️</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="btn-secondary btn-sm" onClick={deleteHistory}>Clear History (keep today)</button>
    </div>
  )
}
