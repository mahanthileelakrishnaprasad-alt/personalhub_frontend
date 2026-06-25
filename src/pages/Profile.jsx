import React, { useState } from 'react'
import { useAuth } from '../App'
import api from '../api/client'

export default function Profile() {
  const { user } = useAuth()
  const profile = user?.profile || {}
  const [email, setEmail] = useState(profile.reminder_email || '')
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  const save = async (e) => {
    e.preventDefault()
    setSaved(false); setErr('')
    try {
      await api.patch('auth/profile/', { reminder_email: email })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { setErr('Could not save.') }
  }

  return (
    <div className="page">
      <h1 className="page-title">👤 Profile</h1>
      <div className="card" style={{ maxWidth: 440 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>Username</div>
          <div style={{ fontWeight: 600, marginTop: 2 }}>{user?.username}</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>Account Type</div>
          <div style={{ marginTop: 4 }}>
            {user?.is_superuser
              ? <span className="badge badge-purple">Superuser</span>
              : <span className="badge badge-green">User</span>}
          </div>
        </div>
        <form onSubmit={save}>
          <label>Reminder Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ marginBottom: 12, marginTop: 4 }}
          />
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
            Task and routine reminders will be sent to this address via Brevo.
          </p>
          {saved && <p className="msg-success">✅ Saved!</p>}
          {err && <p className="msg-error">{err}</p>}
          <button className="btn-primary" style={{ marginTop: 8 }}>Save</button>
        </form>
      </div>
    </div>
  )
}
