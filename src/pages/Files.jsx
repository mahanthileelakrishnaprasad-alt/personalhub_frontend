import React, { useState, useEffect, useRef, useCallback } from 'react'
import api from '../api/client'

function fmtSize(b) {
  if (!b) return '0 B'
  if (b < 1024) return b + ' B'
  if (b < 1024*1024) return (b/1024).toFixed(1)+' KB'
  return (b/1024/1024).toFixed(2)+' MB'
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

  const typeIcon = (t) => ({image:'🖼️',pdf:'📄',text:'📝',other:'📎'}[t]||'📎')

  // For Cloudinary-hosted files, append fl_attachment to force correct serving.
  // Images open inline; PDFs/text/other are fetched as blob so browser gets
  // the right content-type regardless of how Cloudinary stored them.
  const blobOpen = async (f, forceDownload = false) => {
    try {
      const res = await fetch(f.file_url)
      const blob = await res.blob()
      const mimeMap = {
        image: blob.type || 'image/jpeg',
        pdf: 'application/pdf',
        text: 'text/plain',
        other: blob.type || 'application/octet-stream',
      }
      const typed = new Blob([blob], { type: mimeMap[f.file_type] || blob.type })
      const url = URL.createObjectURL(typed)
      if (forceDownload) {
        const a = document.createElement('a')
        a.href = url; a.download = f.name
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
      } else {
        window.open(url, '_blank')
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      // Fallback: open directly
      window.open(f.file_url, '_blank', 'noreferrer')
    }
  }

  const openFile = (f) => {
    if (!f.file_url) return
    if (f.file_type === 'image') {
      window.open(f.file_url, '_blank', 'noreferrer')
    } else {
      blobOpen(f, false)
    }
  }

  const downloadFile = (f) => {
    if (!f.file_url) return
    blobOpen(f, true)
  }

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
          <input placeholder="Note heading…" value={noteForm.heading} onChange={e => setNoteForm({...noteForm,heading:e.target.value})} required />
          <textarea placeholder="Body (optional)…" value={noteForm.body} onChange={e => setNoteForm({...noteForm,body:e.target.value})} rows={3} style={{ resize: 'vertical' }} />
          <button className="btn-primary" style={{ alignSelf: 'flex-start' }}>+ Add Note</button>
        </form>

        {notes.length === 0 && <div className="empty" style={{ padding: '16px 0' }}>No notes yet.</div>}

        {notes.map(n => (
          <div key={n.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
            {editNoteId === n.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={editNoteForm.heading} onChange={e => setEditNoteForm({...editNoteForm,heading:e.target.value})} />
                <textarea value={editNoteForm.body} onChange={e => setEditNoteForm({...editNoteForm,body:e.target.value})} rows={4} style={{ resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-success btn-sm" onClick={() => saveEditNote(n.id)}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={() => setEditNoteId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <strong style={{ fontSize: 15, flex: 1 }}>{n.heading}</strong>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button className="btn-icon btn-sm" title="Copy heading" onClick={() => copy(n.heading)}>📋</button>
                    <button className="btn-icon btn-sm" onClick={() => { setEditNoteId(n.id); setEditNoteForm({heading:n.heading,body:n.body}) }}>✏️</button>
                    <button className="btn-icon btn-sm" onClick={() => deleteNote(n.id)}>🗑️</button>
                  </div>
                </div>
                {n.body && (
                  <div style={{ position: 'relative', marginTop: 6 }}>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, paddingRight: 32 }}>{n.body}</pre>
                    <button
                      className="btn-icon btn-sm"
                      title="Copy body"
                      onClick={() => copy(n.body)}
                      style={{ position: 'absolute', top: 0, right: 0 }}
                    >📋</button>
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                  {new Date(n.updated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}