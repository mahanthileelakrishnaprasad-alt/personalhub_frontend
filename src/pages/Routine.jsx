import React, { useState, useEffect, useRef } from 'react'
import api from '../api/client'

// Pie chart SVG for a single percentage
function PieChart({ pct, size = 120, stroke = 14, color = '#6c63ff', label }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const filled = (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#252535" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round" style={{ transition: 'stroke-dasharray .6s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        textAlign: 'center', lineHeight: 1.1,
      }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: '#e2e2f0' }}>{pct}%</div>
        {label && <div style={{ fontSize: 10, color: '#8585a8', marginTop: 2 }}>{label}</div>}
      </div>
    </div>
  )
}

export default function Routine() {
  const [data, setData] = useState(null)
  const [routineTasks, setRoutineTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [addForm, setAddForm] = useState({ title: '', reminder_time: '' })
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showManage, setShowManage] = useState(false)

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
    if (!confirm('Delete this habit? All history will be removed.')) return
    await api.delete(`routine/tasks/${id}/`)
    await Promise.all([loadToday(), loadTasks()])
  }

  const saveEdit = async (id) => {
    await api.patch(`routine/tasks/${id}/`, { ...editForm, reminder_time: editForm.reminder_time || null })
    setEditId(null)
    await Promise.all([loadToday(), loadTasks()])
  }

  const deleteHistory = async () => {
    if (!confirm('Delete all past history? Today\'s logs stay.')) return
    await api.delete('routine/history/delete/')
    loadToday()
  }

  if (loading) return <div className="spinner" />

  return (
    <div className="page">
      <h1 className="page-title">🔁 Daily Routine</h1>

      {/* Progress — 3 pie charts */}
      {data && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 16, padding: '4px 0' }}>
            <PieChart pct={data.today_pct} label="Today" color="#6c63ff" />
            <PieChart pct={data.week_pct} label="Week" color="#4f8ef7" />
            <PieChart pct={data.month_pct} label="Month" color="#3ecf8e" />
          </div>
          <div style={{ textAlign: 'center', marginTop: 10, color: 'var(--text2)', fontSize: 13 }}>
            {data.done_today} / {data.total_today} completed today
          </div>
        </div>
      )}

      {/* Today checklist */}
      {data && data.logs.length === 0 ? (
        <div className="empty">No habits yet — add some below! 👇</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {data?.logs.map(log => (
            <div key={log.id} className="card" style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderLeft: log.completed ? '3px solid var(--green)' : '3px solid var(--border)',
              transition: 'border-color .2s',
            }}>
              <div onClick={() => toggle(log.id)} style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                background: log.completed ? 'var(--green)' : 'var(--surface3)',
                border: log.completed ? 'none' : '2px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .2s', fontSize: 13,
              }}>
                {log.completed && '✓'}
              </div>
              <span style={{
                flex: 1, fontWeight: 500,
                textDecoration: log.completed ? 'line-through' : 'none',
                color: log.completed ? 'var(--text2)' : 'var(--text)',
              }}>
                {log.routine_task_title}
              </span>
              {log.completed && <span style={{ color: 'var(--green)', fontSize: 16 }}>✅</span>}
            </div>
          ))}
        </div>
      )}

      {/* Manage toggle */}
      <button className="btn-secondary" style={{ width: '100%', marginBottom: 12 }}
        onClick={() => setShowManage(v => !v)}>
        {showManage ? '▾ Hide Habits Manager' : '▸ Manage Habits'}
      </button>

      {showManage && (
        <div className="card" style={{ marginBottom: 14 }}>
          <form onSubmit={addRoutine} style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <input placeholder="New habit (e.g. Drink 2L water)" value={addForm.title}
              onChange={e => setAddForm({ ...addForm, title: e.target.value })} style={{ flex: 1, minWidth: 160 }} required />
            <input type="time" value={addForm.reminder_time}
              onChange={e => setAddForm({ ...addForm, reminder_time: e.target.value })}
              style={{ width: 120 }} title="Email reminder time" />
            <button className="btn-primary">+ Add</button>
          </form>

          {routineTasks.length === 0 && <div className="empty" style={{ padding: '12px 0' }}>No habits yet.</div>}

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
                  <span style={{ flex: 1, fontSize: 14 }}>{rt.title}</span>
                  {rt.reminder_time && <span className="tag">⏰ {rt.reminder_time}</span>}
                  <button className="btn-icon btn-sm" onClick={() => { setEditId(rt.id); setEditForm({ title: rt.title, reminder_time: rt.reminder_time || '' }) }}>✏️</button>
                  <button className="btn-icon btn-sm" onClick={() => deleteRoutine(rt.id)}>🗑️</button>
                </div>
              )}
            </div>
          ))}

          {routineTasks.length > 0 && (
            <button className="btn-secondary btn-sm" style={{ marginTop: 14 }} onClick={deleteHistory}>
              Clear Past History
            </button>
          )}
        </div>
      )}
    </div>
  )
}
