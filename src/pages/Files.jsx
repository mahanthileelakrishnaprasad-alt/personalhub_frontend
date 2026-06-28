import React, { useState, useEffect, useRef, useCallback } from 'react'
import api from '../api/client'

function fmtSize(b) {
  if (!b) return '0 B'
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b/1024).toFixed(1)+' KB'
  return (b/1048576).toFixed(2)+' MB'
}

// Render body text with clickable links and emoji support
function RichText({ text }) {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return (
    <span>
      {parts.map((p, i) =>
        urlRegex.test(p)
          ? <a key={i} href={p} target="_blank" rel="noreferrer"
              style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>{p}</a>
          : <span key={i}>{p}</span>
      )}
    </span>
  )
}

export default function Files() {
  const [files, setFiles] = useState([])
  const [notes, setNotes] = useState([])
  const [fileFolders, setFileFolders] = useState([])
  const [noteFolders, setNoteFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [uploadOk, setUploadOk] = useState('')
  const [drag, setDrag] = useState(false)
  const fileRef = useRef()

  // Navigation state
  const [fileFolder, setFileFolder] = useState('none')   // 'none'=Uncategorized, null=All, id=inside folder
  const [noteFolder, setNoteFolder] = useState('none')

  // Note form
  const [noteForm, setNoteForm] = useState({ heading: '', body: '', folder: null })
  const noteBodyRef = useRef('')
  const [expandedNotes, setExpandedNotes] = useState({})
  const [editNoteId, setEditNoteId] = useState(null)
  const [editNoteForm, setEditNoteForm] = useState({})

  // Folder modals
  const [showFileFolderModal, setShowFileFolderModal] = useState(false)
  const [showNoteFolderModal, setShowNoteFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editFolderId, setEditFolderId] = useState(null)
  const [editFolderName, setEditFolderName] = useState('')

  // Move file/note to folder
  const [moveFile, setMoveFile] = useState(null)
  const [moveNote, setMoveNote] = useState(null)

  const load = async () => {
    const fileParam = fileFolder === null ? '' : (fileFolder === 'none' ? '?folder=none' : `?folder=${fileFolder}`)
    const noteParam = noteFolder === null ? '' : (noteFolder === 'none' ? '?folder=none' : `?folder=${noteFolder}`)
    const [f, n, ff, nf] = await Promise.all([
      api.get(`files/${fileParam}`),
      api.get(`notes/${noteParam}`),
      api.get('files/folders/'),
      api.get('notes/folders/'),
    ])
    setFiles(f.data); setNotes(n.data)
    setFileFolders(ff.data); setNoteFolders(nf.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [fileFolder, noteFolder])

  const uploadFile = async (file) => {
    if (!file) return
    setUploadErr(''); setUploadOk(''); setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    try {
      const r = await api.post('files/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      // Move into current folder if inside one
      if (fileFolder && fileFolder !== 'none') {
        await api.patch(`files/${r.data.id}/`, { folder: fileFolder })
      }
      setUploadOk(`"${file.name}" uploaded!`)
      if (fileRef.current) fileRef.current.value = ''
      load()
    } catch (err) {
      setUploadErr(err.response?.data?.detail || 'Upload failed.')
    } finally { setUploading(false) }
  }

  const handleDrop = useCallback((e) => { e.preventDefault(); setDrag(false); uploadFile(e.dataTransfer.files?.[0]) }, [fileFolder])
  const handleDragOver = (e) => { e.preventDefault(); setDrag(true) }
  const handleDragLeave = () => setDrag(false)
  const deleteFile = async (id) => { if (!confirm('Delete file?')) return; await api.delete(`files/${id}/`); load() }

  const addNote = async (e) => {
    e.preventDefault()
    if (!noteForm.heading.trim()) return
    const payload = { heading: noteForm.heading, body: noteBodyRef.current, folder: noteFolder && noteFolder !== 'none' ? noteFolder : null }
    await api.post('notes/', payload)
    noteBodyRef.current = ''; setNoteForm({ heading: '', body: '', folder: null }); load()
  }
  const saveEditNote = async (id) => { await api.patch(`notes/${id}/`, editNoteForm); setEditNoteId(null); load() }
  const deleteNote = async (id) => { if (!confirm('Delete note?')) return; await api.delete(`notes/${id}/`); load() }
  const copy = (text) => navigator.clipboard.writeText(text).catch(() => {})
  const toggleNote = (id) => setExpandedNotes(p => ({ ...p, [id]: !p[id] }))

  // Folder CRUD — files
  const addFileFolder = async (e) => { e.preventDefault(); await api.post('files/folders/', { name: newFolderName }); setNewFolderName(''); load() }
  const saveFileFolder = async (id) => { await api.patch(`files/folders/${id}/`, { name: editFolderName }); setEditFolderId(null); load() }
  const deleteFileFolder = async (id) => { if (!confirm('Delete folder? Files become Uncategorized.')) return; await api.delete(`files/folders/${id}/`); load() }

  // Folder CRUD — notes
  const addNoteFolder = async (e) => { e.preventDefault(); await api.post('notes/folders/', { name: newFolderName }); setNewFolderName(''); load() }
  const saveNoteFolder = async (id) => { await api.patch(`notes/folders/${id}/`, { name: editFolderName }); setEditFolderId(null); load() }
  const deleteNoteFolder = async (id) => { if (!confirm('Delete folder? Notes become Uncategorized.')) return; await api.delete(`notes/folders/${id}/`); load() }

  // Move file/note to folder
  const doMoveFile = async (folderId) => { await api.patch(`files/${moveFile}/`, { folder: folderId }); setMoveFile(null); load() }
  const doMoveNote = async (folderId) => { await api.patch(`notes/${moveNote}/`, { folder: folderId }); setMoveNote(null); load() }

  const BASE = import.meta.env.VITE_API_BASE || ''
  const token = localStorage.getItem('token') || ''
  const proxyUrl = (f, dl = false) => `${BASE}/api/files/${f.id}/proxy/?token=${token}${dl ? '&download=1' : ''}`
  const openFile = (f) => f.file_type === 'image' ? window.open(f.file_url, '_blank', 'noreferrer') : window.open(proxyUrl(f), '_blank', 'noreferrer')
  const downloadFile = (f) => { const a = document.createElement('a'); a.href = proxyUrl(f, true); a.download = f.name; document.body.appendChild(a); a.click(); document.body.removeChild(a) }
  const typeIcon = (t) => ({ image: '🖼️', pdf: '📄', text: '📝', other: '📎' }[t] || '📎')

  const currentFileFolderName = fileFolders.find(f => String(f.id) === String(fileFolder))?.name
  const currentNoteFolderName = noteFolders.find(f => String(f.id) === String(noteFolder))?.name

  if (loading) return <div className="spinner" />

  return (
    <div className="page">
      <h1 className="page-title">📁 Files & Notes</h1>

      {/* ══ FILES SECTION ══ */}
      <div className="card" style={{ marginBottom: 18 }}>
        {/* Breadcrumb + controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>📁 Files</span>
          {fileFolder && fileFolder !== 'none' && (
            <>
              <span style={{ color: 'var(--text3)' }}>›</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{currentFileFolderName || 'Folder'}</span>
              <button className="btn-secondary btn-xs" onClick={() => setFileFolder('none')}>← Back</button>
            </>
          )}
          {(!fileFolder || fileFolder === 'none') && (
            <>
              <button className={`btn-xs ${fileFolder === null ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFileFolder(null)}>All</button>
              <button className={`btn-xs ${fileFolder === 'none' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFileFolder('none')}>Uncategorized</button>
              <button className="btn-secondary btn-xs" onClick={() => setShowFileFolderModal(true)}>⚙️ Folders</button>
            </>
          )}
        </div>

        {/* Folders grid — show on root and uncategorized view */}
        {(fileFolder === null || fileFolder === 'none') && fileFolders.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {fileFolders.map(f => (
              <div key={f.id} onClick={() => setFileFolder(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                  background: 'var(--bg2)', borderRadius: 10, cursor: 'pointer',
                  border: '1.5px solid var(--border)', transition: 'all .15s',
                }}>
                <span style={{ fontSize: 20 }}>📂</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{f.file_count} file{f.file_count !== 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload zone */}
        <div className={`upload-zone${drag ? ' drag-over' : ''}`}
          onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileRef.current?.click()}
          style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{uploading ? '⏳' : '📤'}</div>
          <div style={{ color: 'var(--text2)', fontSize: 13 }}>
            {uploading ? 'Uploading…' : `Click or drag & drop${fileFolder && fileFolder !== 'none' && typeof fileFolder === 'number' ? ` into ${currentFileFolderName}` : ''}`}
          </div>
          <input ref={fileRef} type="file" onChange={e => uploadFile(e.target.files?.[0])} disabled={uploading} style={{ display: 'none' }} />
        </div>
        {uploadErr && <p className="msg-error">{uploadErr}</p>}
        {uploadOk && <p className="msg-success">✅ {uploadOk}</p>}

        {/* Files list */}
        {files.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table className="table">
              <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {files.map(f => (
                  <tr key={f.id}>
                    <td>
                      <span style={{ marginRight: 5 }}>{typeIcon(f.file_type)}</span>
                      <span onClick={() => openFile(f)} style={{ cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline', wordBreak: 'break-all' }}>{f.name}</span>
                    </td>
                    <td><span className="tag">{f.file_type}</span></td>
                    <td style={{ color: 'var(--text2)', fontSize: 12 }}>{fmtSize(f.size)}</td>
                    <td style={{ color: 'var(--text2)', fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(f.uploaded_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <button className="btn-icon btn-sm" title="Move to folder" onClick={() => setMoveFile(f.id)}>📂</button>
                        <button className="btn-icon btn-sm" title="Download" onClick={() => downloadFile(f)}>⬇️</button>
                        <button className="btn-icon btn-sm" onClick={() => deleteFile(f.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {files.length === 0 && <div className="empty" style={{ padding: '10px 0' }}>No files here.</div>}
        <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 8 }}>Stored on Cloudinary. Supports images, PDF, text, and more.</p>
      </div>

      {/* ══ NOTES SECTION ══ */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>📝 Text Notes</span>
          {noteFolder && noteFolder !== 'none' && (
            <>
              <span style={{ color: 'var(--text3)' }}>›</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{currentNoteFolderName || 'Folder'}</span>
              <button className="btn-secondary btn-xs" onClick={() => setNoteFolder('none')}>← Back</button>
            </>
          )}
          {(!noteFolder || noteFolder === 'none') && (
            <>
              <button className={`btn-xs ${noteFolder === null ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setNoteFolder(null)}>All</button>
              <button className={`btn-xs ${noteFolder === 'none' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setNoteFolder('none')}>Uncategorized</button>
              <button className="btn-secondary btn-xs" onClick={() => setShowNoteFolderModal(true)}>⚙️ Folders</button>
            </>
          )}
        </div>

        {/* Note folders grid */}
        {(noteFolder === null || noteFolder === 'none') && noteFolders.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {noteFolders.map(f => (
              <div key={f.id} onClick={() => setNoteFolder(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                  background: 'var(--bg2)', borderRadius: 10, cursor: 'pointer',
                  border: '1.5px solid var(--border)', transition: 'all .15s',
                }}>
                <span style={{ fontSize: 20 }}>📂</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{f.note_count} note{f.note_count !== 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add note form */}
        <form onSubmit={addNote} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <input placeholder="Note heading (title)…" value={noteForm.heading}
            onChange={e => { const v = e.target.value; setNoteForm(p => ({ ...p, heading: v })) }} required />
          <div style={{ position: 'relative' }}>
            <textarea
              placeholder="Body (supports emoji 😊, links https://..., 1000+ words)…"
              value={noteForm.body}
              onChange={e => { const v = e.target.value; noteBodyRef.current = v; setNoteForm(p => ({ ...p, body: v })) }}
              style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box', padding: '10px 12px 28px', minHeight: 120, fontFamily: 'inherit', fontSize: 14, lineHeight: 1.7 }}
            />
            <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 11, color: 'var(--text3)' }}>
              {noteForm.body.trim().split(/\s+/).filter(Boolean).length} words
            </div>
          </div>
          <button className="btn-primary" style={{ alignSelf: 'flex-start' }}>+ Add Note</button>
        </form>

        {/* Notes list — ALL notes always collapsed, expand on tap */}
        {notes.length === 0 && <div className="empty">No notes here.</div>}
        {notes.map(n => {
          const expanded = expandedNotes[n.id]
          return (
            <div key={n.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
              {editNoteId === n.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={editNoteForm.heading} onChange={e => setEditNoteForm(p => ({ ...p, heading: e.target.value }))} />
                  <textarea value={editNoteForm.body} onChange={e => setEditNoteForm(p => ({ ...p, body: e.target.value }))}
                    rows={8} style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 14 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-success btn-sm" onClick={() => saveEditNote(n.id)}>Save</button>
                    <button className="btn-secondary btn-sm" onClick={() => setEditNoteId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Heading row — always clickable to expand */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                    onClick={() => toggleNote(n.id)}>
                    <span style={{ fontSize: 13, color: 'var(--accent)', flexShrink: 0 }}>{expanded ? '▼' : '▶'}</span>
                    <strong style={{ flex: 1, fontSize: 14, wordBreak: 'break-word' }}>{n.heading}</strong>
                    {!expanded && n.folder_name && <span className="tag" style={{ fontSize: 10, flexShrink: 0 }}>{n.folder_name}</span>}
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button className="btn-icon btn-sm" title="Copy heading" onClick={() => copy(n.heading)}>📋</button>
                      <button className="btn-icon btn-sm" title="Move to folder" onClick={() => setMoveNote(n.id)}>📂</button>
                      <button className="btn-icon btn-sm" onClick={() => { setEditNoteId(n.id); setEditNoteForm({ heading: n.heading, body: n.body }) }}>✏️</button>
                      <button className="btn-icon btn-sm" onClick={() => deleteNote(n.id)}>🗑️</button>
                    </div>
                  </div>

                  {/* Body — only shown when expanded */}
                  {expanded && (
                    <div style={{ marginTop: 10 }}>
                      {n.body ? (
                        <pre style={{
                          whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13,
                          color: 'var(--text2)', lineHeight: 1.75, background: 'var(--bg2)',
                          borderRadius: 8, padding: '10px 12px', maxHeight: '60vh', overflowY: 'auto'
                        }}>
                          <RichText text={n.body} />
                        </pre>
                      ) : (
                        <div style={{ color: 'var(--text3)', fontSize: 13, fontStyle: 'italic' }}>No body.</div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        {n.body && <button className="btn-secondary btn-xs" onClick={() => copy(n.body)}>📄 Copy body</button>}
                        <button className="btn-secondary btn-xs" onClick={() => toggleNote(n.id)}>▲ Collapse</button>
                      </div>
                    </div>
                  )}

                  {/* Preview line when collapsed */}
                  {!expanded && n.body && (
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, fontStyle: 'italic', cursor: 'pointer' }}
                      onClick={() => toggleNote(n.id)}>
                      {n.body.slice(0, 60).trim()}{n.body.length > 60 ? '…' : ''}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>
                    {new Date(n.updated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ══ FILE FOLDERS MODAL ══ */}
      {showFileFolderModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowFileFolderModal(false) }}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="modal-title" style={{ margin: 0 }}>📁 File Folders</div>
              <button className="btn-icon" onClick={() => setShowFileFolderModal(false)}>✕</button>
            </div>
            <form onSubmit={addFileFolder} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input placeholder="New folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} required />
              <button className="btn-primary btn-sm" style={{ flexShrink: 0 }}>+ Add</button>
            </form>
            {fileFolders.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                {editFolderId === f.id ? (
                  <><input value={editFolderName} onChange={e => setEditFolderName(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn-success btn-sm" onClick={() => saveFileFolder(f.id)}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={() => setEditFolderId(null)}>✕</button></>
                ) : (
                  <><span style={{ flex: 1 }}>📂 {f.name} <span style={{ color: 'var(--text3)', fontSize: 12 }}>({f.file_count})</span></span>
                  <button className="btn-icon btn-sm" onClick={() => { setEditFolderId(f.id); setEditFolderName(f.name) }}>✏️</button>
                  <button className="btn-icon btn-sm" onClick={() => deleteFileFolder(f.id)}>🗑️</button></>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ NOTE FOLDERS MODAL ══ */}
      {showNoteFolderModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowNoteFolderModal(false) }}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="modal-title" style={{ margin: 0 }}>📝 Note Folders</div>
              <button className="btn-icon" onClick={() => setShowNoteFolderModal(false)}>✕</button>
            </div>
            <form onSubmit={addNoteFolder} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input placeholder="New folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} required />
              <button className="btn-primary btn-sm" style={{ flexShrink: 0 }}>+ Add</button>
            </form>
            {noteFolders.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                {editFolderId === f.id ? (
                  <><input value={editFolderName} onChange={e => setEditFolderName(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn-success btn-sm" onClick={() => saveNoteFolder(f.id)}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={() => setEditFolderId(null)}>✕</button></>
                ) : (
                  <><span style={{ flex: 1 }}>📂 {f.name} <span style={{ color: 'var(--text3)', fontSize: 12 }}>({f.note_count})</span></span>
                  <button className="btn-icon btn-sm" onClick={() => { setEditFolderId(f.id); setEditFolderName(f.name) }}>✏️</button>
                  <button className="btn-icon btn-sm" onClick={() => deleteNoteFolder(f.id)}>🗑️</button></>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ MOVE FILE MODAL ══ */}
      {moveFile && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setMoveFile(null) }}>
          <div className="modal" style={{ maxWidth: 320 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="modal-title" style={{ margin: 0 }}>Move to folder</div>
              <button className="btn-icon" onClick={() => setMoveFile(null)}>✕</button>
            </div>
            <button className="btn-secondary" style={{ width: '100%', marginBottom: 8 }} onClick={() => doMoveFile(null)}>
              📂 Uncategorized (root)
            </button>
            {fileFolders.map(f => (
              <button key={f.id} className="btn-secondary" style={{ width: '100%', marginBottom: 6 }} onClick={() => doMoveFile(f.id)}>
                📂 {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══ MOVE NOTE MODAL ══ */}
      {moveNote && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setMoveNote(null) }}>
          <div className="modal" style={{ maxWidth: 320 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="modal-title" style={{ margin: 0 }}>Move note to folder</div>
              <button className="btn-icon" onClick={() => setMoveNote(null)}>✕</button>
            </div>
            <button className="btn-secondary" style={{ width: '100%', marginBottom: 8 }} onClick={() => doMoveNote(null)}>
              📝 Uncategorized (root)
            </button>
            {noteFolders.map(f => (
              <button key={f.id} className="btn-secondary" style={{ width: '100%', marginBottom: 6 }} onClick={() => doMoveNote(f.id)}>
                📂 {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}