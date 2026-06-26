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
      display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', padding:16, background:'radial-gradient(ellipse at 50% 0%, rgba(108,99,255,.12) 0%, transparent 60%)',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign:'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🏠</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, background:'linear-gradient(135deg,#6c63ff,#4f8ef7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>PersonalHub</h1>
          <p style={{ color:'var(--text2)', fontSize: 14, marginTop: 4 }}>Your personal productivity space</p>
        </div>
        <div className="card" style={{ boxShadow: '0 8px 40px rgba(0,0,0,.5)' }}>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap: 14 }}>
            <div>
              <label>Username</label>
              <input autoFocus value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required placeholder="Enter username" />
            </div>
            <div>
              <label>Password</label>
              <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required placeholder="Enter password" />
            </div>
            {error && <p className="msg-error">{error}</p>}
            <button className="btn-primary" disabled={loading} style={{ marginTop: 2, padding: '11px 0', fontSize: 15 }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>
        <p style={{ textAlign:'center', marginTop: 16, fontSize: 13, color:'var(--text2)' }}>
          No account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  )
}
