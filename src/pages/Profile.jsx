import React, { useState } from 'react'
import { useAuth } from '../App'
import api from '../api/client'

const ADMIN_PHONE = '917013842905'
const ADMIN_NAME  = 'M Leela Krishna Prasad'

export default function Profile() {
  const { user } = useAuth()
  const profile = user?.profile || {}
  const [email, setEmail] = useState(profile.reminder_email || '')
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  // WhatsApp contact form
  const [waForm, setWaForm] = useState({ name: '', issue: '', details: '' })

  const saveProfile = async (e) => {
    e.preventDefault(); setSaved(false); setErr('')
    try {
      await api.patch('auth/profile/', { reminder_email: email })
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch { setErr('Could not save.') }
  }

  const openWhatsApp = (e) => {
    e.preventDefault()
    if (!waForm.name || !waForm.issue) return
    const msg = encodeURIComponent(
      `Hello ${ADMIN_NAME},\n\nName: ${waForm.name}\nIssue: ${waForm.issue}${waForm.details ? '\nDetails: '+waForm.details : ''}\n\nPlease help me with PersonalHub.`
    )
    window.open(`https://wa.me/${ADMIN_PHONE}?text=${msg}`, '_blank')
  }

  return (
    <div className="page">
      <h1 className="page-title">⚙️ Profile</h1>

      {/* User info */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-glow)',
            border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: 'var(--accent)',
          }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.username}</div>
            <div style={{ marginTop: 4 }}>
              {user?.is_superuser
                ? <span className="badge badge-purple">Superuser</span>
                : <span className="badge badge-green">User</span>}
            </div>
          </div>
        </div>

        <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label>Reminder Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>
            Task and routine reminders are sent to this address via Brevo. Leave blank to disable.
          </p>
          {saved && <p className="msg-success">✅ Saved!</p>}
          {err && <p className="msg-error">{err}</p>}
          <button className="btn-primary" style={{ alignSelf: 'flex-start' }}>Save Email</button>
        </form>
      </div>

      {/* Contact admin via WhatsApp */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>💬 Contact Admin</div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
          Need access, changes, or have an issue? Fill the form and message the admin directly on WhatsApp.
        </p>

        <form onSubmit={openWhatsApp} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label>Your Name *</label>
            <input placeholder="e.g. Ravi Kumar" value={waForm.name}
              onChange={e => setWaForm({...waForm, name: e.target.value})} required />
          </div>
          <div>
            <label>Issue / Request *</label>
            <input placeholder="e.g. Request account access, Reset password, Bug report…"
              value={waForm.issue} onChange={e => setWaForm({...waForm, issue: e.target.value})} required />
          </div>
          <div>
            <label>Additional Details (optional)</label>
            <textarea placeholder="Describe in detail…" rows={3} style={{ resize: 'vertical' }}
              value={waForm.details} onChange={e => setWaForm({...waForm, details: e.target.value})} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            <button type="submit" className="wa-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Contact via WhatsApp
            </button>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>
              Admin: <strong style={{ color: 'var(--text)' }}>{ADMIN_NAME}</strong>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
