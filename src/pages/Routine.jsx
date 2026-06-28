import React, { useState, useEffect, useRef } from 'react'
import api from '../api/client'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const ALL_DAYS = 127

function dayBit(i) { return 1 << i }
function bitmaskFromArr(arr) { return arr.reduce((acc, i) => acc | dayBit(i), 0) }
function arrFromBitmask(mask) { return DAYS.map((_, i) => i).filter(i => mask & dayBit(i)) }
function fmtDays(mask) {
  if (!mask || mask === ALL_DAYS) return 'Every day'
  if (mask === 0) return 'No days'
  return arrFromBitmask(mask).map(i => DAYS[i]).join(', ')
}

function DayPicker({ value, onChange }) {
  const selected = arrFromBitmask(value)
  const toggle = (i) => {
    const next = new Set(selected)
    next.has(i) ? next.delete(i) : next.add(i)
    onChange(bitmaskFromArr([...next]) || 0)
  }
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {DAYS.map((d, i) => (
        <button key={d} type="button" onClick={() => toggle(i)} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: selected.includes(i) ? 'var(--accent)' : 'var(--bg2)',
          color: selected.includes(i) ? '#fff' : 'var(--text2)',
          border: `2px solid ${selected.includes(i) ? 'var(--accent)' : 'var(--border)'}`,
          fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all .15s',
        }}>{d}</button>
      ))}
      <button type="button" onClick={() => onChange(value === ALL_DAYS ? 0 : ALL_DAYS)} style={{
        padding: '0 10px', height: 36, borderRadius: 8,
        background: value === ALL_DAYS ? 'var(--accent)' : 'var(--bg2)',
        color: value === ALL_DAYS ? '#fff' : 'var(--text2)',
        border: `2px solid ${value === ALL_DAYS ? 'var(--accent)' : 'var(--border)'}`,
        fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all .15s',
      }}>All</button>
    </div>
  )
}

function PieChart({ pct, size = 110, stroke = 13, color = '#6c63ff', label }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const filled = (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg2)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round" style={{ transition: 'stroke-dasharray .6s ease' }} />
      </svg>
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{pct}%</div>
        {label && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>{label}</div>}
      </div>
    </div>
  )
}

// Format date string "2026-06-27" → "Friday, 27 Jun"
function fmtHistoryDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
}

export default function Routine() {
  const [data, setData] = useState(null)
  const [routineTasks, setRoutineTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [addForm, setAddForm] = useState({ title: '', reminder_time: '', active_days: ALL_DAYS })
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showManage, setShowManage] = useState(false)
  const [draggingRt, setDraggingRt] = useState(null)
  const dragIdx = useRef(null)
  const dragOver = useRef(null)

  const handleRtDragEnd = async () => {
    setDraggingRt(null)
    if (dragIdx.current === null || dragOver.current === null || dragIdx.current === dragOver.current) {
      dragIdx.current = dragOver.current = null; return
    }
    const next = [...routineTasks]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(dragOver.current, 0, moved)
    dragIdx.current = dragOver.current = null
    setRoutineTasks(next)
    await api.post('routine/reorder/', { ordered_ids: next.map(t => t.id) })
  }
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedDates, setExpandedDates] = useState({})

  const loadToday = () => api.get('routine/today/').then(r => setData(r.data))
  const loadTasks = () => api.get('routine/tasks/').then(r => setRoutineTasks(r.data))

  useEffect(() => {
    Promise.all([loadToday(), loadTasks()]).finally(() => setLoading(false))
  }, [])

  const openHistory = async () => {
    setShowHistory(true)
    setHistoryLoading(true)
    try {
      const r = await api.get('routine/history/')
      setHistory(r.data)
    } finally {
      setHistoryLoading(false)
    }
  }

  const addRoutine = async (e) => {
    e.preventDefault()
    if (!addForm.title.trim()) return
    await api.post('routine/tasks/', { ...addForm, reminder_time: addForm.reminder_time || null })
    setAddForm({ title: '', reminder_time: '', active_days: ALL_DAYS })
    await Promise.all([loadToday(), loadTasks()])
  }

  const toggle = async (logId) => { await api.post(`routine/logs/${logId}/toggle/`); loadToday() }

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
    if (!confirm("Delete all past history? Today's logs stay.")) return
    await api.delete('routine/history/delete/')
    setHistory([]); loadToday()
  }

  // Today's display — day + date
  const now = new Date()
  const todayLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return <div className="spinner" />

  return (
    <div className="page">
      {/* Header with day/date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>🔁 Daily Routine</h1>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{todayLabel}</div>
        </div>
        <button className="btn-secondary btn-sm" onClick={openHistory} style={{ flexShrink: 0, marginTop: 4 }}>
          📅 History
        </button>
      </div>

      {/* Progress */}
      {data && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <PieChart pct={data.today_pct} label="Today" color="#6c63ff" />
            <PieChart pct={data.week_pct} label="This Week" color="#4f8ef7" />
            <PieChart pct={data.month_pct} label="This Month" color="#3ecf8e" />
          </div>
          <div style={{ textAlign: 'center', marginTop: 10, color: 'var(--text2)', fontSize: 13 }}>
            {data.done_today} / {data.total_today} completed today
          </div>
        </div>
      )}

      {/* Today checklist */}
      {data && data.logs.length === 0 ? (
        <div className="empty">No habits for today! Add some below 👇</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {data?.logs.map(log => (
            <div key={log.id} className="card" style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderLeft: `3px solid ${log.completed ? 'var(--green)' : 'var(--border)'}`,
              transition: 'border-color .2s',
            }}>
              <div onClick={() => toggle(log.id)} style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                background: log.completed ? 'var(--green)' : 'var(--surface3)',
                border: log.completed ? 'none' : '2px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .2s', fontSize: 13, color: '#fff',
              }}>{log.completed && '✓'}</div>
              <span style={{
                flex: 1, fontWeight: 500,
                textDecoration: log.completed ? 'line-through' : 'none',
                color: log.completed ? 'var(--text2)' : 'var(--text)',
              }}>{log.routine_task_title}</span>
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
          {/* Add form */}
          <form onSubmit={addRoutine} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <input placeholder="New habit (e.g. Go to temple)" value={addForm.title}
              onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))} required />
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Active days</label>
              <DayPicker value={addForm.active_days} onChange={v => setAddForm(p => ({ ...p, active_days: v }))} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="time" value={addForm.reminder_time}
                onChange={e => setAddForm(p => ({ ...p, reminder_time: e.target.value }))}
                style={{ width: 130 }} title="Reminder time" />
              <button className="btn-primary" disabled={!addForm.title.trim() || addForm.active_days === 0}>
                + Add Habit
              </button>
            </div>
          </form>

          {routineTasks.length === 0 && <div className="empty" style={{ padding: '12px 0' }}>No habits yet.</div>}

          {routineTasks.map((rt, idx) => (
            <div key={rt.id}
              draggable={editId !== rt.id}
              onDragStart={() => { dragIdx.current = idx; setDraggingRt(idx) }}
              onDragEnter={() => { dragOver.current = idx }}
              onDragEnd={handleRtDragEnd}
              onDragOver={e => e.preventDefault()}
              style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10, opacity: draggingRt === idx ? 0.4 : 1, transition: 'opacity .15s' }}
            >
              {editId === rt.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Active days</label>
                    <DayPicker value={editForm.active_days ?? ALL_DAYS} onChange={v => setEditForm(p => ({ ...p, active_days: v }))} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="time" value={editForm.reminder_time}
                      onChange={e => setEditForm(p => ({ ...p, reminder_time: e.target.value }))} style={{ width: 130 }} />
                    <button className="btn-success btn-sm" onClick={() => saveEdit(rt.id)}>Save</button>
                    <button className="btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, color: 'var(--text3)', cursor: 'grab', userSelect: 'none', flexShrink: 0 }} title="Drag to reorder">≡</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{rt.title}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                      <span className="tag" style={{ fontSize: 11 }}>{fmtDays(rt.active_days ?? ALL_DAYS)}</span>
                      {rt.reminder_time && <span className="tag" style={{ fontSize: 11 }}>⏰ {rt.reminder_time}</span>}
                    </div>
                  </div>
                  <button className="btn-icon btn-sm" onClick={() => {
                    setEditId(rt.id)
                    setEditForm({ title: rt.title, reminder_time: rt.reminder_time || '', active_days: rt.active_days ?? ALL_DAYS })
                  }}>✏️</button>
                  <button className="btn-icon btn-sm" onClick={() => deleteRoutine(rt.id)}>🗑️</button>
                </div>
              )}
            </div>
          ))}

          {routineTasks.length > 0 && (
            <button className="btn-danger btn-sm" style={{ marginTop: 14 }} onClick={deleteHistory}>
              🗑️ Clear All History
            </button>
          )}
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowHistory(false) }}>
          <div className="modal" style={{ maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
              <div className="modal-title" style={{ margin: 0 }}>📅 Habit History</div>
              <button className="btn-icon" onClick={() => setShowHistory(false)}>✕</button>
            </div>

            {historyLoading ? (
              <div className="spinner" style={{ margin: '20px auto' }} />
            ) : history.length === 0 ? (
              <div className="empty">No history yet — complete some habits first!</div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {history.map(day => {
                  const expanded = expandedDates[day.date]
                  return (
                    <div key={day.date} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
                      {/* Date row */}
                      <div
                        onClick={() => setExpandedDates(p => ({ ...p, [day.date]: !p[day.date] }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 0' }}
                      >
                        <span style={{ fontSize: 13 }}>{expanded ? '▼' : '▶'}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{fmtHistoryDate(day.date)}</span>
                        </div>
                        {/* Mini progress bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <div style={{ width: 60, height: 6, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${day.pct}%`, height: '100%', background: day.pct === 100 ? 'var(--green)' : 'var(--accent)', borderRadius: 3, transition: 'width .4s' }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                            {day.done}/{day.total}
                          </span>
                        </div>
                      </div>

                      {/* Expanded log entries */}
                      {expanded && (
                        <div style={{ paddingLeft: 20, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {day.logs.map(log => (
                            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                              <span style={{ fontSize: 15 }}>{log.completed ? '✅' : '⬜'}</span>
                              <span style={{
                                color: log.completed ? 'var(--text)' : 'var(--text3)',
                                textDecoration: log.completed ? 'none' : 'line-through',
                              }}>{log.routine_task_title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}