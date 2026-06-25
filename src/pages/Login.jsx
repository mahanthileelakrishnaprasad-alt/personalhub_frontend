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
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const data = await login(form.username, form.password)
      if (!data.approved) { navigate('/pending'); return }
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',padding:16}}>
      <div className="card" style={{width:'100%',maxWidth:360}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:28,marginBottom:4}}>🏠</div>
          <h1 style={{fontSize:22,fontWeight:700}}>PersonalHub</h1>
          <p style={{color:'var(--text2)',fontSize:14,marginTop:4}}>Sign in to your account</p>
        </div>
        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div>
            <label>Username</label>
            <input autoFocus value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required />
          </div>
          <div>
            <label>Password</label>
            <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required />
          </div>
          {error && <p className="msg-error">{error}</p>}
          <button className="btn-primary" disabled={loading} style={{marginTop:4}}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p style={{textAlign:'center',marginTop:16,fontSize:13,color:'var(--text2)'}}>
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  )
}
