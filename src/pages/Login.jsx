import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const data = await login(form.username, form.password)
      navigate(data.approved ? '/' : '/pending')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 20,
    }}>
      {/* Ambient orbs */}
      <div style={{ position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 300, background: 'radial-gradient(ellipse, rgba(124,106,247,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '20%', left: '20%', width: 300, height: 300, background: 'radial-gradient(ellipse, rgba(91,142,248,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
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
            textShadow: 'none', filter: 'drop-shadow(0 0 20px rgba(124,106,247,0.4))',
          }}>PersonalHub</h1>
          <p style={{ color: 'var(--text3)', fontSize: 14, marginTop: 6 }}>Your personal productivity space</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, padding: 28,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,106,247,0.1), 0 0 40px rgba(124,106,247,0.05)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 22, color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>Sign in</h2>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label>Username</label>
              <input autoFocus value={form.username}
                onChange={e => setForm({...form, username: e.target.value})}
                required placeholder="Enter username" />
            </div>
            <div>
              <label>Password</label>
              <input type="password" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                required placeholder="Enter password" />
            </div>
            {error && <p className="msg-error">⚠ {error}</p>}
            <button className="btn-primary" disabled={loading}
              style={{ marginTop: 4, padding: '13px 0', fontSize: 15, borderRadius: 10, letterSpacing: '.02em' }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text3)' }}>
          No account? <Link to="/register" style={{ color: 'var(--accent3)', fontWeight: 500 }}>Register here</Link>
        </p>
      </div>
    </div>
  )
}
