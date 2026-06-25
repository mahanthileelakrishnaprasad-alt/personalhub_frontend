import React, { useState, useEffect } from 'react'
import api from '../api/client'
import { useAuth } from '../App'
import { Navigate } from 'react-router-dom'

export default function AdminUsers() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  if (!user?.is_superuser) return <Navigate to="/" />

  const load = () => api.get('admin/users/').then(r => { setData(r.data); setLoading(false) })
  useEffect(() => { load() }, [])

  const action = async (pk, act) => {
    await api.post('admin/users/', { pk, action: act })
    load()
  }

  if (loading) return <div className="spinner" />

  const { users, total_usage_display, total_usage_pct, quota_display } = data

  const pending = users.filter(u => !u.is_superuser && u.profile && !u.profile.is_approved)
  const approved = users.filter(u => !pending.includes(u))

  return (
    <div className="page">
      <h1 className="page-title">👥 Users</h1>

      {/* Overall usage */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>Total DB Usage (approx.)</span>
          <span style={{ fontSize: 13 }}>{total_usage_display} / {quota_display} ({total_usage_pct}%)</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.min(total_usage_pct, 100)}%` }} />
        </div>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--yellow)' }}>⏳ Pending Approval ({pending.length})</div>
          {pending.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ flex: 1 }}>{u.username}</span>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                {u.profile?.requested_at ? new Date(u.profile.requested_at).toLocaleDateString('en-IN') : ''}
              </span>
              <button className="btn-success btn-sm" onClick={() => action(u.id, 'approve')}>✓ Approve</button>
              <button className="btn-danger btn-sm" onClick={() => action(u.id, 'reject')}>✗ Reject</button>
            </div>
          ))}
        </div>
      )}

      {/* All users */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>All Users</div>
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Status</th>
              <th>Storage (approx.)</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {approved.map(u => (
              <tr key={u.id}>
                <td>
                  {u.username}
                  {u.is_superuser && <span className="badge badge-purple" style={{ marginLeft: 6 }}>admin</span>}
                </td>
                <td>
                  {u.is_active
                    ? <span className="badge badge-green">Active</span>
                    : <span className="badge badge-red">Inactive</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 80, height: 6, background: 'var(--surface2)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(u.storage.pct_of_quota * 100, 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{u.storage.display}</span>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {new Date(u.date_joined).toLocaleDateString('en-IN')}
                </td>
                <td>
                  {!u.is_superuser && (
                    u.is_active
                      ? <button className="btn-secondary btn-sm" onClick={() => action(u.id, 'deactivate')}>Deactivate</button>
                      : <button className="btn-success btn-sm" onClick={() => action(u.id, 'activate')}>Activate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
