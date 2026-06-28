import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '', password2: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await api.post('auth/register/', form)
      navigate('/login')
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Registration failed.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
      <div style={{ position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 300, background: 'radial-gradient(ellipse, rgba(124,106,247,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, rgba(124,106,247,0.2), rgba(91,142,248,0.2))',
            border: '1px solid rgba(124,106,247,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: '0 0 30px rgba(124,106,247,0.25)',
          }}>🏠</div>
          <h1 style={{
            fontSize: 30, fontWeight: 800,
            background: 'linear-gradient(135deg, #a78bfa 0%, #6ee7f7 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-.04em', fontFamily: "'Space Grotesk', sans-serif",
            filter: 'drop-shadow(0 0 20px rgba(124,106,247,0.4))',
          }}>PersonalHub</h1>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,106,247,0.1)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, fontFamily: "'Space Grotesk', sans-serif" }}>Create Account</h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 22 }}>Admin approval required after signup</p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label>Username</label>
              <input autoFocus value={form.username} onChange={e => setForm({...form, username: e.target.value})} required /></div>
            <div><label>Password</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>
            <div><label>Confirm Password</label>
              <input type="password" value={form.password2} onChange={e => setForm({...form, password2: e.target.value})} required /></div>
            {error && <p className="msg-error">⚠ {error}</p>}
            <button className="btn-primary" disabled={loading}
              style={{ marginTop: 4, padding: '13px 0', fontSize: 15, borderRadius: 10 }}>
              {loading ? 'Registering…' : 'Create Account →'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text3)' }}>
          Have an account? <Link to="/login" style={{ color: 'var(--accent3)', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
