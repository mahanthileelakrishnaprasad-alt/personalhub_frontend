import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '', password2: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await api.post('auth/register/', form)
      navigate('/login')
    } catch (err) {
      const d = err.response?.data
      if (typeof d === 'object') {
        const msgs = Object.values(d).flat().join(' ')
        setError(msgs)
      } else setError('Registration failed.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',padding:16}}>
      <div className="card" style={{width:'100%',maxWidth:360}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:28,marginBottom:4}}>🏠</div>
          <h1 style={{fontSize:22,fontWeight:700}}>Create Account</h1>
          <p style={{color:'var(--text2)',fontSize:14,marginTop:4}}>Admin approval required after signup</p>
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
          <div>
            <label>Confirm Password</label>
            <input type="password" value={form.password2} onChange={e=>setForm({...form,password2:e.target.value})} required />
          </div>
          {error && <p className="msg-error">{error}</p>}
          <button className="btn-primary" disabled={loading} style={{marginTop:4}}>
            {loading ? 'Registering…' : 'Register'}
          </button>
        </form>
        <p style={{textAlign:'center',marginTop:16,fontSize:13,color:'var(--text2)'}}>
          Have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
