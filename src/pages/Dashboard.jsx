import React, { useState, useEffect, useRef, useCallback } from 'react'
import api from '../api/client'

function fmtDate(s) {
  if (!s) return ''
  return new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}
function fmtDue(s) {
  if (!s) return null
  const d = new Date(s), now = new Date()
  const diff = d - now
  const overdue = diff < 0
  const abs = Math.abs(diff)
  const mins = Math.floor(abs/60000), hrs = Math.floor(abs/3600000), days = Math.floor(abs/86400000)
  let label = days > 0 ? `${days}d` : hrs > 0 ? `${hrs}h` : `${mins}m`
  return { label: overdue ? `${label} overdue` : `due in ${label}`, overdue }
}

const DEFAULT_CATS = ['Personal','Family','Study','Work','Health','Shopping']
const DAYS_MASK = 127

export default function Dashboard() {
  const [tasks, setTasks]           = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [catFilter, setCatFilter]   = useState('none')
  const [expandedSubs, setExpandedSubs] = useState({})
  const [subtasks, setSubtasks]     = useState({})  // {taskId: [...]}
  const [showSearch, setShowSearch] = useState(false)
  const [searchQ, setSearchQ]       = useState('')
  const [searchRes, setSearchRes]   = useState(null)
  const [searching, setSearching]   = useState(false)
  const searchRef = useRef()
  const searchTimer = useRef()

  const emptyForm = (catId='') => ({ title:'', note:'', reminder_at:'', category:catId, due_date:'', is_recurring:false, recur_days:1 })
  const [form, setForm]         = useState(emptyForm())
  const [editId, setEditId]     = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showTreasure, setShowTreasure] = useState(false)
  const [showAddForm, setShowAddForm]   = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCatName, setNewCatName]     = useState('')
  const [editCatId, setEditCatId]       = useState(null)
  const [editCatName, setEditCatName]   = useState('')
  const [draggingIdx, setDraggingIdx]   = useState(null)
  const dragIdx  = useRef(null)
  const dragOver = useRef(null)

  const load = async (filter = catFilter) => {
    const params = filter === 'none' ? '?category=none' : filter ? `?category=${filter}` : ''
    const [t, c] = await Promise.all([api.get(`tasks/${params}`), api.get('tasks/categories/')])
    setTasks(t.data); setCategories(c.data); setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'n' || e.key === 'N') setShowAddForm(v => !v)
      if (e.key === '/') { e.preventDefault(); setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 50) }
      if (e.key === 'Escape') { setShowSearch(false); setShowAddForm(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!showSearch || !searchQ.trim()) { setSearchRes(null); return }
    clearTimeout(searchTimer.current)
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try { const r = await api.get(`search/?q=${encodeURIComponent(searchQ)}`); setSearchRes(r.data) }
      catch {} finally { setSearching(false) }
    }, 350)
  }, [searchQ, showSearch])

  const applyFilter = (v) => {
    setCatFilter(v); load(v)
    const numId = parseInt(v)
    setForm(f => ({ ...f, category: !isNaN(numId) && numId > 0 ? String(numId) : '' }))
  }

  const active   = tasks.filter(t => !t.completed && !t.parent)
  const treasure = tasks.filter(t =>  t.completed && !t.parent)

  const handleDragStart = (i) => { dragIdx.current = i; setDraggingIdx(i) }
  const handleDragEnter = (i) => { dragOver.current = i }
  const handleDragEnd   = async () => {
    setDraggingIdx(null)
    if (dragIdx.current === null || dragOver.current === null || dragIdx.current === dragOver.current) {
      dragIdx.current = dragOver.current = null; return
    }
    const next = [...active]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(dragOver.current, 0, moved)
    dragIdx.current = dragOver.current = null
    setTasks([...next, ...treasure])
    await api.post('tasks/reorder/', { ordered_ids: next.map(t => t.id) })
  }

  const addTask = async (e) => {
    e.preventDefault()
    await api.post('tasks/', {
      ...form,
      reminder_at: form.reminder_at || null,
      category: form.category || null,
      due_date: form.due_date || null,
      recur_days: form.is_recurring ? form.recur_days : 0,
    })
    const numId = parseInt(catFilter)
    setForm(emptyForm(!isNaN(numId) && numId > 0 ? String(numId) : ''))
    setShowAddForm(false); load()
  }

  const addSubtask = async (parentId, title) => {
    await api.post(`tasks/${parentId}/subtasks/`, { title })
    loadSubtasks(parentId)
  }

  const loadSubtasks = async (id) => {
    const r = await api.get(`tasks/${id}/subtasks/`)
    setSubtasks(p => ({ ...p, [id]: r.data }))
  }

  const toggleSubExpand = async (id) => {
    const next = !expandedSubs[id]
    setExpandedSubs(p => ({ ...p, [id]: next }))
    if (next && !subtasks[id]) loadSubtasks(id)
  }

  const complete = async (id) => { await api.post(`tasks/${id}/complete/`); load() }
  const restore  = async (id) => { await api.post(`tasks/${id}/restore/`); load() }
  const del      = async (id) => { if (!confirm('Delete task?')) return; await api.delete(`tasks/${id}/`); load() }
  const delAllTreasure = async () => { if (!confirm('Delete all?')) return; await api.delete('tasks/treasure/delete-all/'); load() }

  const startEdit = (t) => {
    setEditId(t.id)
    setEditForm({
      title: t.title, note: t.note||'', reminder_at: t.reminder_at?t.reminder_at.slice(0,16):'',
      category: t.category?String(t.category):'',
      due_date: t.due_date?t.due_date.slice(0,16):'',
      is_recurring: t.is_recurring||false, recur_days: t.recur_days||1,
    })
  }
  const saveEdit = async (id) => {
    await api.patch(`tasks/${id}/`, { ...editForm, reminder_at: editForm.reminder_at||null, category: editForm.category||null, due_date: editForm.due_date||null })
    setEditId(null); load()
  }

  const downloadExport = async (type) => {
    const r = await api.get(`export/${type}/`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a'); a.href = url; a.download = `${type}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const addCat = async (e) => { e.preventDefault(); await api.post('tasks/categories/', { name: newCatName }); setNewCatName(''); load() }
  const saveCat = async (id) => { await api.patch(`tasks/categories/${id}/`, { name: editCatName }); setEditCatId(null); load() }
  const deleteCat = async (id) => { if (!confirm('Delete?')) return; await api.delete(`tasks/categories/${id}/`); load() }
  const seedCats = async () => { for (const n of DEFAULT_CATS) { try { await api.post('tasks/categories/', { name:n }) } catch {} } load() }

  const CatSelect = ({ value, onChange }) => (
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Uncategorized</option>
      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  )

  if (loading) return <div className="spinner" />

  return (
    <div className="page">
      {/* Search Modal */}
      {showSearch && (
        <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) setShowSearch(false) }} style={{alignItems:'flex-start',paddingTop:80}}>
          <div className="modal" style={{maxWidth:540}}>
            <input ref={searchRef} placeholder="Search tasks, notes, files, transactions…"
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              style={{fontSize:16,padding:'12px 16px'}} autoFocus />
            {searching && <div style={{color:'var(--text3)',fontSize:13,marginTop:10}}>Searching…</div>}
            {searchRes && (
              <div style={{marginTop:12,maxHeight:400,overflowY:'auto'}}>
                {['tasks','notes','files','transactions'].map(k => searchRes[k]?.length > 0 && (
                  <div key={k} style={{marginBottom:14}}>
                    <div style={{fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6,fontWeight:700}}>{k}</div>
                    {searchRes[k].map(item => (
                      <div key={item.id} style={{padding:'8px 10px',borderRadius:8,background:'var(--surface2)',marginBottom:4,fontSize:13}}>
                        {item.title||item.heading||item.name}
                      </div>
                    ))}
                  </div>
                ))}
                {Object.values(searchRes).every(a=>a.length===0) && (
                  <div style={{color:'var(--text3)',textAlign:'center',padding:'20px 0'}}>No results for "{searchQ}"</div>
                )}
              </div>
            )}
            <div style={{fontSize:11,color:'var(--text4)',marginTop:12}}>Press Esc to close</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,marginBottom:2}}>✅ <span className="title-text">Tasks</span></h1>
          <div style={{fontSize:13,color:'var(--accent)',fontWeight:600}}>
            {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </div>
          <div style={{fontSize:11,color:'var(--text4)',marginTop:2}}>Press N to add · / to search</div>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
          <button className="btn-secondary btn-sm" onClick={()=>{setShowSearch(true);setTimeout(()=>searchRef.current?.focus(),50)}}>🔍</button>
          <button className="btn-secondary btn-sm" onClick={()=>downloadExport('tasks')}>⬇️ CSV</button>
          <button className="btn-primary btn-sm" onClick={()=>setShowAddForm(v=>!v)}>
            {showAddForm?'✕ Close':'+ Add Task'}
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14,alignItems:'center'}}>
        <button className={`btn-xs ${catFilter===''?'btn-primary':'btn-secondary'}`} onClick={()=>applyFilter('')}>All</button>
        <button className={`btn-xs ${catFilter==='none'?'btn-primary':'btn-secondary'}`} onClick={()=>applyFilter('none')}>Uncat.</button>
        {categories.map(c=>(
          <button key={c.id} className={`btn-xs ${catFilter===String(c.id)?'btn-primary':'btn-secondary'}`}
            onClick={()=>applyFilter(String(c.id))}>{c.name}</button>
        ))}
        <button className="btn-secondary btn-xs" style={{marginLeft:'auto'}} onClick={()=>setShowCatModal(true)}>⚙️</button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="card" style={{marginBottom:16,borderLeft:'3px solid var(--accent)'}}>
          <form onSubmit={addTask}>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <input autoFocus placeholder="Task title…" value={form.title}
                onChange={e=>setForm(p=>({...p,title:e.target.value}))} required />
              <textarea placeholder="Note (optional)" value={form.note} rows={2} style={{resize:'vertical'}}
                onChange={e=>setForm(p=>({...p,note:e.target.value}))} />
              <div className="form-row">
                <div><label>Category</label><CatSelect value={form.category} onChange={v=>setForm(p=>({...p,category:v}))}/></div>
                <div><label>Due date</label>
                  <input type="datetime-local" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))}/>
                </div>
              </div>
              <div className="form-row">
                <div><label>Reminder</label>
                  <input type="datetime-local" value={form.reminder_at} onChange={e=>setForm(p=>({...p,reminder_at:e.target.value}))}/>
                </div>
                <div>
                  <label>Recurring</label>
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 0'}}>
                    <input type="checkbox" checked={form.is_recurring} onChange={e=>setForm(p=>({...p,is_recurring:e.target.checked}))} style={{width:'auto'}}/>
                    {form.is_recurring && (
                      <span style={{display:'flex',alignItems:'center',gap:4,fontSize:13}}>
                        every <input type="number" min={1} max={365} value={form.recur_days}
                          onChange={e=>setForm(p=>({...p,recur_days:parseInt(e.target.value)||1}))}
                          style={{width:52}}/> days
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button className="btn-primary" style={{alignSelf:'flex-start'}}>+ Add Task</button>
            </div>
          </form>
        </div>
      )}

      {/* Active tasks */}
      {active.length===0 ? (
        <div className="empty">No tasks! Press N to add one 🎯</div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {active.map((t,idx)=>{
            const due = fmtDue(t.due_date)
            const hasSubs = (subtasks[t.id]?.length||0) > 0 || true
            return (
              <div key={t.id}
                draggable={editId!==t.id}
                onDragStart={()=>handleDragStart(idx)}
                onDragEnter={()=>handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={e=>e.preventDefault()}
                className="task-card"
                style={{opacity:draggingIdx===idx?0.35:1,transition:'opacity .15s'}}
              >
                {editId===t.id ? (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <input value={editForm.title} onChange={e=>setEditForm(p=>({...p,title:e.target.value}))}/>
                    <textarea value={editForm.note} rows={2} style={{resize:'vertical'}} onChange={e=>setEditForm(p=>({...p,note:e.target.value}))}/>
                    <div className="form-row">
                      <div><label>Category</label><CatSelect value={editForm.category} onChange={v=>setEditForm(p=>({...p,category:v}))}/></div>
                      <div><label>Due date</label><input type="datetime-local" value={editForm.due_date} onChange={e=>setEditForm(p=>({...p,due_date:e.target.value}))}/></div>
                    </div>
                    <div className="form-row">
                      <div><label>Reminder</label><input type="datetime-local" value={editForm.reminder_at} onChange={e=>setEditForm(p=>({...p,reminder_at:e.target.value}))}/></div>
                      <div><label style={{display:'flex',alignItems:'center',gap:6}}>
                        <input type="checkbox" checked={editForm.is_recurring||false} onChange={e=>setEditForm(p=>({...p,is_recurring:e.target.checked}))} style={{width:'auto'}}/>
                        Recurring every
                        <input type="number" min={1} value={editForm.recur_days||1} onChange={e=>setEditForm(p=>({...p,recur_days:parseInt(e.target.value)||1}))} style={{width:52}}/>
                        days
                      </label></div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button className="btn-success btn-sm" onClick={()=>saveEdit(t.id)}>Save</button>
                      <button className="btn-secondary btn-sm" onClick={()=>setEditId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                      <span className="drag-handle">≡</span>
                      <div style={{minWidth:22,height:22,borderRadius:6,background:'var(--surface3)',color:'var(--text3)',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>{idx+1}</div>
                      <button className="check-circle" onClick={()=>complete(t.id)} title="Mark complete"/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:500,wordBreak:'break-word'}}>{t.title}</div>
                        {t.note && <div style={{color:'var(--text2)',fontSize:13,marginTop:2}}>{t.note}</div>}
                        <div style={{display:'flex',gap:6,marginTop:5,flexWrap:'wrap',alignItems:'center'}}>
                          {t.category_name && <span className="tag" style={{fontSize:11}}>{t.category_name}</span>}
                          {due && <span className={`badge ${due.overdue?'badge-red':'badge-yellow'}`} style={{fontSize:11}}>⏰ {due.label}</span>}
                          {t.is_recurring && <span className="badge badge-purple" style={{fontSize:11}}>🔁 every {t.recur_days}d</span>}
                          {t.reminder_at && !due && <span style={{fontSize:11,color:'var(--text3)'}}>⏰ {fmtDate(t.reminder_at)}</span>}
                        </div>
                      </div>
                      <div style={{display:'flex',gap:2,flexShrink:0}}>
                        <button className="btn-icon btn-sm" title="Subtasks" onClick={()=>toggleSubExpand(t.id)}>
                          {expandedSubs[t.id]?'▾':'▸'}
                        </button>
                        <button className="btn-icon btn-sm" onClick={()=>startEdit(t)}>✏️</button>
                        <button className="btn-icon btn-sm" onClick={()=>del(t.id)}>🗑️</button>
                      </div>
                    </div>

                    {/* Subtasks panel */}
                    {expandedSubs[t.id] && (
                      <div style={{marginTop:10,paddingLeft:44}}>
                        {(subtasks[t.id]||[]).map(s=>(
                          <div key={s.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                            <button className={`check-circle${s.completed?' done':''}`} style={{width:18,height:18,fontSize:10}}
                              onClick={async()=>{await api.post(`tasks/${s.id}/complete/`);loadSubtasks(t.id)}}>{s.completed?'✓':''}</button>
                            <span style={{fontSize:13,color:s.completed?'var(--text3)':'var(--text)',textDecoration:s.completed?'line-through':'none',flex:1}}>{s.title}</span>
                            <button className="btn-icon btn-sm" style={{padding:'2px 6px'}} onClick={async()=>{await api.delete(`tasks/${s.id}/`);loadSubtasks(t.id)}}>🗑️</button>
                          </div>
                        ))}
                        <SubtaskInput onAdd={title=>addSubtask(t.id,title)}/>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Treasure Box */}
      {treasure.length>0 && (
        <div style={{marginTop:24}}>
          <button className="btn-secondary" style={{width:'100%',marginBottom:10,textAlign:'left',fontWeight:600}}
            onClick={()=>setShowTreasure(v=>!v)}>
            {showTreasure?'▾':'▸'} 💎 Treasure Box ({treasure.length})
          </button>
          {showTreasure && (<>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {treasure.map(t=>(
                <div key={t.id} className="task-card completed" style={{padding:'11px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span>✅</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{textDecoration:'line-through',color:'var(--text2)',wordBreak:'break-word'}}>{t.title}</div>
                      <div style={{display:'flex',gap:6,marginTop:2,flexWrap:'wrap'}}>
                        {t.category_name && <span className="tag" style={{fontSize:10}}>{t.category_name}</span>}
                        {t.completed_at && <span style={{fontSize:11,color:'var(--text3)'}}>Done {fmtDate(t.completed_at)}</span>}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:2}}>
                      <button className="btn-icon btn-sm" onClick={()=>restore(t.id)}>↩️</button>
                      <button className="btn-icon btn-sm" onClick={()=>del(t.id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-danger btn-sm" style={{marginTop:10}} onClick={delAllTreasure}>Delete All</button>
          </>)}
        </div>
      )}

      {/* Categories modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowCatModal(false)}}>
          <div className="modal">
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div className="modal-title" style={{margin:0}}>Task Categories</div>
              <button className="btn-icon" onClick={()=>setShowCatModal(false)}>✕</button>
            </div>
            <form onSubmit={addCat} style={{display:'flex',gap:8,marginBottom:14}}>
              <input placeholder="New category" value={newCatName} onChange={e=>setNewCatName(e.target.value)} required/>
              <button className="btn-primary btn-sm" style={{flexShrink:0}}>+ Add</button>
            </form>
            {categories.length===0 && <button className="btn-secondary btn-sm" onClick={seedCats} style={{marginBottom:12}}>✨ Add defaults</button>}
            {categories.map(c=>(
              <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderTop:'1px solid var(--border)'}}>
                {editCatId===c.id
                  ? <><input value={editCatName} onChange={e=>setEditCatName(e.target.value)} style={{flex:1}}/>
                      <button className="btn-success btn-sm" onClick={()=>saveCat(c.id)}>Save</button>
                      <button className="btn-secondary btn-sm" onClick={()=>setEditCatId(null)}>✕</button></>
                  : <><span style={{flex:1}}>{c.name}</span>
                      <button className="btn-icon btn-sm" onClick={()=>{setEditCatId(c.id);setEditCatName(c.name)}}>✏️</button>
                      <button className="btn-icon btn-sm" onClick={()=>deleteCat(c.id)}>🗑️</button></>
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SubtaskInput({ onAdd }) {
  const [val, setVal] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!val.trim()) return
    onAdd(val.trim()); setVal('')
  }
  return (
    <form onSubmit={submit} style={{display:'flex',gap:6,marginTop:6}}>
      <input placeholder="Add subtask…" value={val} onChange={e=>setVal(e.target.value)}
        style={{fontSize:12,padding:'6px 10px'}}/>
      <button className="btn-primary btn-sm" disabled={!val.trim()}>+</button>
    </form>
  )
}