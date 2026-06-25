import React, { createContext, useContext, useState, useEffect } from 'react'
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import api from './api/client'
import Login from './pages/Login'
import Register from './pages/Register'
import Pending from './pages/Pending'
import Dashboard from './pages/Dashboard'
import Routine from './pages/Routine'
import Files from './pages/Files'
import Transactions from './pages/Transactions'
import Profile from './pages/Profile'
import AdminUsers from './pages/AdminUsers'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function Nav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <nav className="nav">
      <span className="nav-brand">PersonalHub</span>
      <div className="nav-links">
        <NavLink className={({isActive})=>'nav-link'+(isActive?' active':'')} to="/">Tasks</NavLink>
        <NavLink className={({isActive})=>'nav-link'+(isActive?' active':'')} to="/routine">Routine</NavLink>
        <NavLink className={({isActive})=>'nav-link'+(isActive?' active':'')} to="/files">Files</NavLink>
        <NavLink className={({isActive})=>'nav-link'+(isActive?' active':'')} to="/transactions">Transactions</NavLink>
        {user?.is_superuser && (
          <NavLink className={({isActive})=>'nav-link'+(isActive?' active':'')} to="/admin/users">Users</NavLink>
        )}
      </div>
      <div className="nav-right">
        <NavLink className={({isActive})=>'nav-link'+(isActive?' active':'')} to="/profile">Profile</NavLink>
        <button className="btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}

function RequireAuth({ children }) {
  const { user, loading, approved } = useAuth()
  if (loading) return <div className="spinner" />
  if (!user) return <Navigate to="/login" replace />
  if (!approved) return <Navigate to="/pending" replace />
  return children
}

export default function App() {
  const [user, setUser] = useState(null)
  const [approved, setApproved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    api.get('auth/me/').then(r => {
      setUser(r.data.user)
      setApproved(r.data.approved)
    }).catch(() => {
      localStorage.removeItem('token')
    }).finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const r = await api.post('auth/login/', { username, password })
    localStorage.setItem('token', r.data.token)
    setUser(r.data.user)
    setApproved(r.data.approved)
    return r.data
  }

  const logout = async () => {
    try { await api.post('auth/logout/') } catch {}
    localStorage.removeItem('token')
    setUser(null)
    setApproved(false)
  }

  if (loading) return <div className="spinner" style={{marginTop:80}} />

  return (
    <AuthContext.Provider value={{ user, approved, loading, login, logout, setUser, setApproved }}>
      {user && approved && <Nav />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/pending" element={<Pending />} />
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/routine" element={<RequireAuth><Routine /></RequireAuth>} />
        <Route path="/files" element={<RequireAuth><Files /></RequireAuth>} />
        <Route path="/transactions" element={<RequireAuth><Transactions /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/admin/users" element={<RequireAuth><AdminUsers /></RequireAuth>} />
      </Routes>
    </AuthContext.Provider>
  )
}
