import React, { useState, useEffect, useRef } from 'react'
import api from '../api/client'

function fmtSize(b) {
  if (!b) return '0 B'
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1024 / 1024).toFixed(2) + ' MB'
}

export default function Files() {
  const [files, setFiles] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [uploadOk, setUploadOk] = useState('')
  const fileRef = useRef()

  // Notes form
  const [noteForm, setNoteForm] = useState({ heading: '', body: '' })
  const [editNoteId, setEditNoteId] = useState(null)
  const [editNoteForm, setEditNoteForm] = useState({})

  const load = async () => {
    const [f, n] = await Promise.all([api.get('files/'), api.get('notes/')])
    setFiles(f.data)
    setNotes(n.data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // ── File upload: the bug fix ──────────────────────────────────────────────
  // Original Django app used request.FILES which requires multipart/form-data.
  // Using FormData + axios lets us upload correctly every time.
  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadErr(''); setUploadOk(''); setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      // axios automatically sets Content-Type: multipart/form-data with boundary
      await api.post('files/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadOk(`"${file.name}" uploaded successfully.`)
      if (fileRef.current) fileRef.current.value = ''
      load()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Upload failed. Please try again.'
      setUploadErr(msg)
    } finally { setUploading(false) }
  }

  const deleteFile = async (id) => {
    if (!confirm('Delete this file?')) return
    await api.delete(`files/${id}/`)
    load()
  }

  const addNote = async (e) => {
    e.preventDefault()
    if (!noteForm.heading.trim()) return
    await api.post('notes/', noteForm)
    setNoteForm({ heading: '', body: '' })
    load()
  }

  const saveEditNote = async (id) => {
    await api.patch(`notes/${id}/`, editNoteForm)
    setEditNoteId(null)
    load()
  }

  const deleteNote = async (id) => {
    if (!confirm('Delete this note?')) return
    await api.delete(`notes/${id}/`)
    load()
  }

  const copyText = (text) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  if (loading) return <div className="spinner" />

  const fileTypeIcon = (type) => ({ image: '🖼️', pdf: '📄', text: '📝', other: '📎' }[type] || '📎')

  return (
    <div className="page">
      <h1 className="page-title">📁 Files & Notes</h1>

      {/* Upload */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Upload File</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={fileRef}
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            style={{ flex: 1, minWidth: 200 }}
          />
          {uploading && <span style={{ color: 'var(--text2)', fontSize: 13 }}>Uploading…</span>}
        </div>
        {uploadErr && <p className="msg-error" style={{ marginTop: 8 }}>{uploadErr}</p>}
        {uploadOk && <p className="msg-success" style={{ marginTop: 8 }}>✅ {uploadOk}</p>}
        <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 8 }}>
          Files stored on Cloudinary — survive redeploys. Max recommended: 10 MB per file.
        </p>
      </div>

      {/* Files list */}
      {files.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Uploaded Files ({files.length})</div>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {files.map(f => (
                <tr key={f.id}>
                  <td>
                    <span style={{ marginRight: 6 }}>{fileTypeIcon(f.file_type)}</span>
                    {f.file_url
                      ? <a href={f.file_url} target="_blank" rel="noreferrer">{f.name}</a>
                      : <span style={{ color: 'var(--red)' }}>{f.name} (missing — re-upload)</span>
                    }
                  </td>
                  <td><span className="tag">{f.file_type}</span></td>
                  <td style={{ color: 'var(--text2)', fontSize: 13 }}>{fmtSize(f.size)}</td>
                  <td style={{ color: 'var(--text2)', fontSize: 12 }}>
                    {new Date(f.uploaded_at).toLocaleDateString('en-IN')}
                  </td>
                  <td>
                    <button className="btn-icon btn-sm" onClick={() => deleteFile(f.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Text Notes */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Text Notes</div>

        {/* Add note */}
        <form onSubmit={addNote} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <input
            placeholder="Note heading…"
            value={noteForm.heading}
            onChange={e => setNoteForm({ ...noteForm, heading: e.target.value })}
            required
          />
          <textarea
            placeholder="Note body (optional)…"
            value={noteForm.body}
            onChange={e => setNoteForm({ ...noteForm, body: e.target.value })}
            rows={3}
            style={{ resize: 'vertical' }}
          />
          <button className="btn-primary" style={{ alignSelf: 'flex-start' }}>+ Add Note</button>
        </form>

        {notes.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>No notes yet.</div>}

        {notes.map(n => (
          <div key={n.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
            {editNoteId === n.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={editNoteForm.heading} onChange={e => setEditNoteForm({ ...editNoteForm, heading: e.target.value })} />
                <textarea value={editNoteForm.body} onChange={e => setEditNoteForm({ ...editNoteForm, body: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-success btn-sm" onClick={() => saveEditNote(n.id)}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={() => setEditNoteId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: 15 }}>{n.heading}</strong>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-icon btn-sm" title="Copy heading" onClick={() => copyText(n.heading)}>📋</button>
                    <button className="btn-icon btn-sm" onClick={() => { setEditNoteId(n.id); setEditNoteForm({ heading: n.heading, body: n.body }) }}>✏️</button>
                    <button className="btn-icon btn-sm" onClick={() => deleteNote(n.id)}>🗑️</button>
                  </div>
                </div>
                {n.body && (
                  <div style={{ marginTop: 6, position: 'relative' }}>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, color: 'var(--text2)' }}>{n.body}</pre>
                    <button className="btn-icon btn-sm" style={{ position: 'absolute', top: 0, right: 0 }} title="Copy body" onClick={() => copyText(n.body)}>📋</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
