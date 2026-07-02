import React, { useState, useEffect, useRef } from 'react'
import api from '../api/client'
import { useAuth } from '../App'

export default function Profile() {
  const { user, setUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [theme, setTheme] = useState(localStorage.getItem('ph-theme')||'dark')
  const avatarRef = useRef()
  const [form, setForm] = useState({ reminder_email:'', bio:'' })

  useEffect(() => {
    Promise.all([api.get('auth/profile/'), api.get('auth/stats/')])
      .then(([p, s]) => {
        setProfile(p.data); setStats(s.data)
        setForm({ reminder_email: p.data.reminder_email||'', bio: p.data.bio||'' })
        const t = p.data.theme || 'dark'
        setTheme(t); applyTheme(t)
      })
      .finally(() => setLoading(false))
  }, [])

  const applyTheme = (t) => {
    localStorage.setItem('ph-theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next); applyTheme(next)
    api.patch('auth/profile/', { theme: next }).catch(()=>{})
  }

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('')
    try {
      await api.patch('auth/profile/', form)
      setMsg('Saved!')
    } catch { setMsg('Error saving.') }
    finally { setSaving(false) }
  }

  const uploadAvatar = async (file) => {
    if (!file) return
    setAvatarUploading(true)
    const fd = new FormData(); fd.append('avatar', file)
    try {
      const r = await api.post('auth/avatar/', fd, { headers:{'Content-Type':'multipart/form-data'} })
      setProfile(p => ({ ...p, avatar_url: r.data.avatar_url }))
    } catch { setMsg('Avatar upload failed.') }
    finally { setAvatarUploading(false) }
  }

  const downloadExport = async (type) => {
    const r = await api.get(`export/${type}/`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a'); a.href = url; a.download = `${type}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  if (loading) return <div className="spinner" />

  const statItems = [
    { label: 'Tasks Done',       value: stats?.tasks_done,         color: 'var(--green)', icon: '✅' },
    { label: 'Active Tasks',     value: stats?.tasks_active,        color: 'var(--accent)', icon: '📋' },
    { label: 'Habits Completed', value: stats?.habits_completed,    color: 'var(--cyan)', icon: '🔁' },
    { label: 'Notes',            value: stats?.notes,               color: 'var(--yellow)', icon: '📝' },
    { label: 'Files',            value: stats?.files,               color: 'var(--orange)', icon: '📁' },
    { label: 'Transactions',     value: stats?.transactions,        color: 'var(--pink)', icon: '💰' },
  ]

  return (
    <div className="page">
      <h1 className="page-title">⚙️ <span className="title-text">Profile</span></h1>

      {/* Avatar + name */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div onClick={() => avatarRef.current?.click()} style={{
              width: 80, height: 80, borderRadius: '50%', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, overflow: 'hidden',
              border: '2px solid rgba(124,106,247,0.4)',
              boxShadow: '0 0 20px rgba(124,106,247,0.3)',
            }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : (profile?.username?.[0]?.toUpperCase() || '👤')
              }
            </div>
            {avatarUploading && (
              <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div className="spinner" style={{ width:20, height:20, margin:0 }} />
              </div>
            )}
            <input ref={avatarRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => uploadAvatar(e.target.files?.[0])} />
            <div style={{ position:'absolute', bottom:0, right:0, background:'var(--accent)', borderRadius:'50%', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, cursor:'pointer', border:'2px solid var(--bg)' }}
              onClick={() => avatarRef.current?.click()}>✏️</div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif" }}>{profile?.username}</div>
            <div style={{ color: 'var(--text3)', fontSize: 13 }}>{profile?.email || 'No email set'}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span className={`badge ${profile?.is_approved ? 'badge-green' : 'badge-yellow'}`}>
                {profile?.is_approved ? '✓ Approved' : '⏳ Pending'}
              </span>
            </div>
          </div>

          {/* Theme toggle */}
          <button onClick={toggleTheme} style={{
            padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border2)',
            background: 'var(--surface2)', color: 'var(--text)', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
          }}>
            {theme === 'dark' ? '☀️' : '🌙'}
            <span style={{ fontSize: 12 }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
          {statItems.map(s => (
            <div key={s.label} className="stat-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value ?? 0}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Profile form */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Account Settings</div>
        <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label>Reminder Email</label>
            <input type="email" placeholder="Email for task & routine reminders"
              value={form.reminder_email} onChange={e => setForm(p => ({ ...p, reminder_email: e.target.value }))} />
          </div>
          <div>
            <label>Bio</label>
            <textarea placeholder="A short bio about yourself…" value={form.bio} rows={3}
              style={{ resize: 'vertical' }} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
          </div>
          {msg && <p className={msg.includes('Error') ? 'msg-error' : 'msg-success'}>{msg}</p>}
          <button className="btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Export */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Export Data</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => downloadExport('tasks')}>⬇️ Tasks CSV</button>
          <button className="btn-secondary" onClick={() => downloadExport('transactions')}>⬇️ Transactions CSV</button>
          <button className="btn-secondary" onClick={() => downloadExport('notes')}>⬇️ Notes CSV</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>Download all your data as CSV files.</p>
      </div>
    </div>
  )
}