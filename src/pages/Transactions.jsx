import React, { useState, useEffect, useRef, useCallback } from 'react'
import api from '../api/client'

function fmtSize(b) {
  if (!b) return '0 B'
  if (b < 1024) return b + ' B'
  if (b < 1024*1024) return (b/1024).toFixed(1)+' KB'
  return (b/1024/1024).toFixed(2)+' MB'
}

const BODY_WORD_LIMIT = 150

function countWords(str) {
  return str ? str.trim().split(/\s+/).filter(Boolean).length : 0
}

export default function Files() {
  const [files, setFiles] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [uploadOk, setUploadOk] = useState('')
  const [drag, setDrag] = useState(false)
  const fileRef = useRef()
  const [noteForm, setNoteForm] = useState({ heading: '', body: '' })
  const [editNoteId, setEditNoteId] = useState(null)
  const [editNoteForm, setEditNoteForm] = useState({})
  // Track which notes have their body expanded
  const [expandedNotes, setExpandedNotes] = useState({})

  const load = async () => {
    const [f, n] = await Promise.all([api.get('files/'), api.get('notes/')])
    setFiles(f.data); setNotes(n.data); setLoading(false)
  }
  useEffect(() => { load() }, [])

  // ── RELIABLE UPLOAD ───────────────────────────────────────────────────
  const uploadFile = async (file) => {
    if (!file) return
    setUploadErr(''); setUploadOk(''); setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      await api.post('files/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setUploadOk(`"${file.name}" uploaded!`)
      if (fileRef.current) fileRef.current.value = ''
      load()
    } catch (err) {
      setUploadErr(err.response?.data?.detail || 'Upload failed. Please try again.')
    } finally { setUploading(false) }
  }

  const handleInputChange = (e) => uploadFile(e.target.files?.[0])

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false)
    uploadFile(e.dataTransfer.files?.[0])
  }, [])

  const handleDragOver = (e) => { e.preventDefault(); setDrag(true) }
  const handleDragLeave = () => setDrag(false)

  const deleteFile = async (id) => {
    if (!confirm('Delete this file?')) return
    await api.delete(`files/${id}/`); load()
  }

  const addNote = async (e) => {
    e.preventDefault()
    await api.post('notes/', noteForm)
    setNoteForm({ heading: '', body: '' }); load()
  }

  const saveEditNote = async (id) => {
    await api.patch(`notes/${id}/`, editNoteForm)
    setEditNoteId(null); load()
  }

  const deleteNote = async (id) => {
    if (!confirm('Delete note?')) return
    await api.delete(`notes/${id}/`); load()
  }

  const copy = (text) => navigator.clipboard.writeText(text).catch(()=>{})

  const toggleExpand = (id) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const typeIcon = (t) => ({image:'🖼️',pdf:'📄',text:'📝',other:'📎'}[t]||'📎')

  // Build proxy URL — includes token as query param since window.open
  // doesn't go through axios interceptors (no Authorization header).
  const BASE = import.meta.env.VITE_API_BASE || ''
  const token = localStorage.getItem('token') || ''

  const proxyUrl = (f, download = false) => {
    const params = new URLSearchParams({ token })
    if (download) params.set('download', '1')
    return `${BASE}/api/files/${f.id}/proxy/?${params}`
  }

  const openFile = (f) => {
    if (!f.id) return
    if (f.file_type === 'image') {
      window.open(f.file_url, '_blank', 'noreferrer')
    } else {
      window.open(proxyUrl(f), '_blank', 'noreferrer')
    }
  }

  const downloadFile = (f) => {
    if (!f.id) return
    if (f.file_type === 'image') {
      const a = document.createElement('a')
      a.href = f.file_url; a.download = f.name; a.target = '_blank'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    } else {
      const a = document.createElement('a')
      a.href = proxyUrl(f, true); a.download = f.name
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    }
  }

  const noteBodyWordCount = countWords(noteForm.body)
  const isBodyTooLong = noteBodyWordCount > BODY_WORD_LIMIT

  if (loading) return <div className="spinner" />

  return (
    <div className="page">
      <h1 className="page-title">📁 Files & Notes</h1>

      {/* Upload zone */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Upload File</div>
        <div
          className={`upload-zone${drag?' drag-over':''}`}
          onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileRef.current?.click()}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>{uploading ? '⏳' : '📤'}</div>
          <div style={{ color: 'var(--text2)', fontSize: 14 }}>
            {uploading ? 'Uploading…' : 'Click or drag & drop a file here'}
          </div>
          <input ref={fileRef} type="file" onChange={handleInputChange} disabled={uploading} style={{ display: 'none' }} />
        </div>
        {uploadErr && <p className="msg-error" style={{ marginTop: 10 }}>❌ {uploadErr}</p>}
        {uploadOk  && <p className="msg-success" style={{ marginTop: 10 }}>✅ {uploadOk}</p>}
        <p style={{ color: 'var(--text2)', fontSize: 11, marginTop: 8 }}>
          Files stored on Cloudinary. Supported: images, PDF, text, and more.
        </p>
      </div>

      {/* Files list */}
      {files.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Files ({files.length})</div>
          <div style={{overflowX:'auto'}}>
            <table className="table">
              <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {files.map(f => (
                  <tr key={f.id}>
                    <td>
                      <span style={{ marginRight: 6 }}>{typeIcon(f.file_type)}</span>
                      {f.file_url
                        ? <span
                            onClick={() => openFile(f)}
                            style={{ wordBreak: 'break-all', cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline' }}
                          >{f.name}</span>
                        : <span style={{ color: 'var(--red)', fontSize: 12 }}>{f.name} (missing)</span>}
                    </td>
                    <td><span className="tag">{f.file_type}</span></td>
                    <td style={{ color: 'var(--text2)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtSize(f.size)}</td>
                    <td style={{ color: 'var(--text2)', fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(f.uploaded_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {f.file_url && <button className="btn-icon btn-sm" title="Download" onClick={() => downloadFile(f)}>⬇️</button>}
                        <button className="btn-icon btn-sm" onClick={() => deleteFile(f.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Text Notes</div>
        <form onSubmit={addNote} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <input
            placeholder="Note heading (title)…"
            value={noteForm.heading}
            onChange={e => setNoteForm({...noteForm, heading: e.target.value})}
            required
          />
          <div style={{ position: 'relative' }}>
            <textarea
              placeholder="Body (optional — supports 1000+ words)…"
              value={noteForm.body}
              onChange={e => setNoteForm({...noteForm, body: e.target.value})}
              rows={8}
              style={{
                resize: 'vertical',
                width: '100%',
                boxSizing: 'border-box',
                paddingBottom: 24,
                minHeight: 160,
                fontFamily: 'inherit',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            />
            <div style={{
              position: 'absolute', bottom: 6, right: 8,
              fontSize: 11,
              color: isBodyTooLong ? 'var(--accent)' : 'var(--text3)'
            }}>
              {noteBodyWordCount} words
            </div>
          </div>
          {isBodyTooLong && (
            <p style={{ fontSize: 12, color: 'var(--accent)', margin: '-4px 0 0' }}>
              💡 Long note — heading will show as a collapsed card; tap to expand body.
            </p>
          )}
          <button className="btn-primary" style={{ alignSelf: 'flex-start' }}>+ Add Note</button>
        </form>

        {notes.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>No notes yet.</div>}

        {notes.map(n => {
          const isLong = countWords(n.body) > BODY_WORD_LIMIT
          const isExpanded = expandedNotes[n.id]

          return (
            <div key={n.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
              {editNoteId === n.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={editNoteForm.heading} onChange={e => setEditNoteForm({...editNoteForm, heading: e.target.value})} />
                  <textarea value={editNoteForm.body} onChange={e => setEditNoteForm({...editNoteForm, body: e.target.value})} rows={6} style={{ resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-success btn-sm" onClick={() => saveEditNote(n.id)}>Save</button>
                    <button className="btn-secondary btn-sm" onClick={() => setEditNoteId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Heading row — always visible, clickable to expand if long body */}
                  <div
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
                      cursor: isLong ? 'pointer' : 'default',
                    }}
                    onClick={isLong ? () => toggleExpand(n.id) : undefined}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                      {isLong && (
                        <span style={{ fontSize: 13, color: 'var(--accent)', flexShrink: 0 }}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      )}
                      <strong style={{ fontSize: 15, flex: 1, wordBreak: 'break-word' }}>{n.heading}</strong>
                      {isLong && !isExpanded && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {countWords(n.body)} words
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button className="btn-icon btn-sm" title="Copy heading" onClick={() => copy(n.heading)}>📋</button>
                      {(!isLong || isExpanded) && n.body && (
                        <button className="btn-icon btn-sm" title="Copy body" onClick={() => copy(n.body)}>📄</button>
                      )}
                      <button className="btn-icon btn-sm" onClick={() => { setEditNoteId(n.id); setEditNoteForm({heading: n.heading, body: n.body}) }}>✏️</button>
                      <button className="btn-icon btn-sm" onClick={() => deleteNote(n.id)}>🗑️</button>
                    </div>
                  </div>

                  {/* Body — always show if short; show/hide if long */}
                  {n.body && (!isLong || isExpanded) && (
                    <div style={{ position: 'relative', marginTop: 8 }}>
                      <pre style={{
                        whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13,
                        color: 'var(--text2)', lineHeight: 1.7, paddingRight: 8,
                        maxHeight: isLong ? '60vh' : 'none',
                        overflowY: isLong ? 'auto' : 'visible',
                        background: 'var(--bg2)', borderRadius: 8, padding: '10px 12px',
                      }}>
                        {n.body}
                      </pre>
                      {isLong && (
                        <button
                          className="btn-secondary btn-sm"
                          style={{ marginTop: 6, width: '100%' }}
                          onClick={() => toggleExpand(n.id)}
                        >
                          ▲ Collapse
                        </button>
                      )}
                    </div>
                  )}

                  {/* Short preview for collapsed long notes */}
                  {n.body && isLong && !isExpanded && (
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, fontStyle: 'italic' }}>
                      {n.body.slice(0, 80).trim()}…
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                    {new Date(n.updated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}