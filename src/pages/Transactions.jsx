import React, { useState, useEffect } from 'react'
import api from '../api/client'

// ── Calculator-style Amount Input ─────────────────────────────────────────────
// Operator buttons styled like a compact calculator row
function AmountInput({ value, onChange, placeholder = '0.00' }) {
  const [op, setOp] = useState(null)
  const [base, setBase] = useState(null)
  const [display, setDisplay] = useState(value || '')

  useEffect(() => {
    if (op === null) setDisplay(value || '')
  }, [value])

  const ops = [
    { sym: '+', label: '+' },
    { sym: '-', label: '−' },
    { sym: '*', label: '×' },
    { sym: '/', label: '÷' },
  ]

  const applyCalc = (curBase, curOp, curDisplay) => {
    const operand = parseFloat(curDisplay) || 0
    let result = curBase
    if (curOp === '+') result = curBase + operand
    if (curOp === '-') result = curBase - operand
    if (curOp === '*') result = curBase * operand
    if (curOp === '/' && operand !== 0) result = curBase / operand
    return String(Math.round(result * 100) / 100)
  }

  const selectOp = (sym) => {
    if (op === null) {
      const cur = parseFloat(display) || 0
      setBase(cur); setOp(sym); setDisplay('')
    } else {
      if (display !== '') {
        const result = applyCalc(base, op, display)
        setBase(parseFloat(result) || 0); setOp(sym); setDisplay('')
        onChange(result)
      } else {
        setOp(sym)
      }
    }
  }

  const finishCalc = () => {
    if (op === null || display === '') return
    const final = applyCalc(base, op, display)
    setOp(null); setBase(null); setDisplay(final)
    onChange(final)
  }

  const handleChange = (v) => {
    setDisplay(v)
    if (op === null) onChange(v)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && op !== null) { e.preventDefault(); finishCalc() }
  }

  return (
    <div>
      {/* Pending expression indicator */}
      {op && (
        <div style={{
          fontSize: 12, color: 'var(--accent)', marginBottom: 6, fontWeight: 600,
          background: 'var(--accent-glow)', padding: '4px 10px', borderRadius: 6,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <span>{base}</span>
          <span style={{ fontSize: 16 }}>{ops.find(o => o.sym === op)?.label}</span>
          <span style={{ color: 'var(--text2)' }}>?</span>
          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>↵ or = to apply</span>
        </div>
      )}

      {/* Calculator row: [operator buttons] [number input] [= button] */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
        {/* Operator pad */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2,
          background: 'var(--bg2)', borderRadius: 8, padding: 3, border: '1px solid var(--border)',
        }}>
          {ops.map(o => (
            <button
              key={o.sym}
              type="button"
              onClick={() => selectOp(o.sym)}
              style={{
                width: 32, height: 32,
                background: op === o.sym ? 'var(--accent)' : 'var(--bg)',
                color: op === o.sym ? '#fff' : 'var(--accent)',
                border: `1.5px solid ${op === o.sym ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 6,
                fontWeight: 700, fontSize: 16,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
                lineHeight: 1,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Number input */}
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder={op ? 'second number…' : placeholder}
          value={display}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1, textAlign: 'right', fontWeight: 600, fontSize: 16 }}
        />

        {/* = button — only visible when op is active */}
        {op && (
          <button
            type="button"
            onClick={finishCalc}
            style={{
              width: 38, height: 38,
              background: 'var(--green, #22c55e)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700, fontSize: 18,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            =
          </button>
        )}
      </div>
    </div>
  )
}

export default function Transactions() {
  const [data, setData] = useState({ transactions: [], total_income: 0, total_expense: 0, balance: 0 })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('')

  // When catFilter is a numeric category id, auto-select it for new transactions
  const emptyForm = (catId = '') => ({
    title: '', amount: '', transaction_type: 'expense', note: '',
    category: catId, new_category: ''
  })
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [editCatId, setEditCatId] = useState(null)
  const [editCatName, setEditCatName] = useState('')

  const load = async (filter = catFilter) => {
    const params = filter && filter !== 'none' ? `?category=${filter}` : filter === 'none' ? '?category=none' : ''
    const [t, c] = await Promise.all([api.get(`transactions/${params}`), api.get('transactions/categories/')])
    setData(t.data); setCategories(c.data); setLoading(false)
  }

  useEffect(() => { load() }, [])

  // When filter changes to a specific category, auto-fill form category
  const applyFilter = (v) => {
    setCatFilter(v)
    load(v)
    // Auto-fill category on form if a real category is selected
    const numId = parseInt(v)
    if (!isNaN(numId) && numId > 0) {
      setForm(f => ({ ...f, category: String(numId) }))
    } else {
      setForm(f => ({ ...f, category: '' }))
    }
  }

  const addTx = async (e) => {
    e.preventDefault()
    const payload = { ...form }
    if (form.category === '__new__' && form.new_category) {
      const r = await api.post('transactions/categories/', { name: form.new_category })
      payload.category = r.data.id
    } else if (!form.category) payload.category = null
    delete payload.new_category
    await api.post('transactions/', payload)
    // Keep category auto-fill after add
    const numId = parseInt(catFilter)
    setForm(emptyForm(!isNaN(numId) && numId > 0 ? String(numId) : ''))
    load()
  }

  const saveTx = async (id) => {
    const payload = { ...editForm }
    if (editForm.category === '__new__' && editForm.new_category) {
      const r = await api.post('transactions/categories/', { name: editForm.new_category })
      payload.category = r.data.id
    } else if (!editForm.category) payload.category = null
    delete payload.new_category
    await api.patch(`transactions/${id}/`, payload)
    setEditId(null); load()
  }

  const deleteTx = async (id) => {
    if (!confirm('Delete this transaction?')) return
    await api.delete(`transactions/${id}/`); load()
  }

  const deleteAll = async () => {
    if (!confirm('Delete ALL transactions?')) return
    await api.delete('transactions/delete-all/'); load()
  }

  const addCat = async (e) => {
    e.preventDefault()
    await api.post('transactions/categories/', { name: newCatName })
    setNewCatName(''); load()
  }
  const saveCat = async (id) => { await api.patch(`transactions/categories/${id}/`, { name: editCatName }); setEditCatId(null); load() }
  const deleteCat = async (id) => { if (!confirm('Delete? Txns become Uncategorized.')) return; await api.delete(`transactions/categories/${id}/`); load() }

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })

  const CatSelect = ({ value, onChange }) => (
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Uncategorized</option>
      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      <option value="__new__">+ New category…</option>
    </select>
  )

  if (loading) return <div className="spinner" />

  return (
    <div className="page">
      <h1 className="page-title">💰 Transactions</h1>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div className="stat-card"><div className="stat-label">Income</div><div className="stat-value income-amount">{fmt(data.total_income)}</div></div>
        <div className="stat-card"><div className="stat-label">Expenses</div><div className="stat-value expense-amount">{fmt(data.total_expense)}</div></div>
        <div className="stat-card">
          <div className="stat-label">Balance</div>
          <div className="stat-value" style={{ color: data.balance >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(data.balance)}</div>
        </div>
      </div>

      {/* Add transaction */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Add Transaction</div>
        <form onSubmit={addTx}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Title (e.g. Grocery)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
            <div>
              <label>Amount (₹) — use +−×÷ for quick math</label>
              <AmountInput value={form.amount} onChange={v => setForm({...form, amount: v})} />
            </div>
            <div className="form-row">
              <div>
                <label>Type</label>
                <select value={form.transaction_type} onChange={e => setForm({...form, transaction_type: e.target.value})}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label>Category</label>
                <CatSelect value={form.category} onChange={v => setForm({...form, category: v, new_category: ''})} />
              </div>
            </div>
            {form.category === '__new__' && <input placeholder="New category name" value={form.new_category} onChange={e => setForm({...form, new_category: e.target.value})} />}
            <input placeholder="Note (optional)" value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
            <button className="btn-primary" style={{alignSelf:'flex-start'}} disabled={!form.title||!form.amount}>+ Add Transaction</button>
          </div>
        </form>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Filter:</span>
        <button className={`btn-xs ${catFilter===''?'btn-primary':'btn-secondary'}`} onClick={()=>applyFilter('')}>All</button>
        <button className={`btn-xs ${catFilter==='none'?'btn-primary':'btn-secondary'}`} onClick={()=>applyFilter('none')}>Uncat.</button>
        {categories.map(c => (
          <button key={c.id} className={`btn-xs ${catFilter===String(c.id)?'btn-primary':'btn-secondary'}`} onClick={()=>applyFilter(String(c.id))}>{c.name}</button>
        ))}
        <button className="btn-secondary btn-xs" style={{marginLeft:'auto'}} onClick={()=>setShowCatModal(true)}>⚙️ Categories</button>
      </div>

      {/* List */}
      {data.transactions.length === 0 ? <div className="empty">No transactions yet.</div> : (
        <div className="card">
          <div style={{overflowX:'auto'}}>
            <table className="table">
              <thead><tr><th>Title</th><th>Amount</th><th>Cat.</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {data.transactions.map(t => (
                  <tr key={t.id}>
                    {editId === t.id ? (
                      <td colSpan={5}>
                        <div style={{display:'flex',flexDirection:'column',gap:8,padding:'4px 0'}}>
                          <input value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} placeholder="Title" />
                          <div>
                            <label>Amount</label>
                            <AmountInput value={editForm.amount} onChange={v=>setEditForm({...editForm,amount:v})} />
                          </div>
                          <div className="form-row">
                            <select value={editForm.transaction_type} onChange={e=>setEditForm({...editForm,transaction_type:e.target.value})}>
                              <option value="expense">Expense</option>
                              <option value="income">Income</option>
                            </select>
                            <CatSelect value={editForm.category||''} onChange={v=>setEditForm({...editForm,category:v,new_category:''})} />
                          </div>
                          {editForm.category==='__new__' && <input placeholder="New category" value={editForm.new_category||''} onChange={e=>setEditForm({...editForm,new_category:e.target.value})} />}
                          <input value={editForm.note||''} onChange={e=>setEditForm({...editForm,note:e.target.value})} placeholder="Note" />
                          <div style={{display:'flex',gap:8}}>
                            <button className="btn-success btn-sm" onClick={()=>saveTx(t.id)}>Save</button>
                            <button className="btn-secondary btn-sm" onClick={()=>setEditId(null)}>Cancel</button>
                          </div>
                        </div>
                      </td>
                    ) : (<>
                      <td style={{fontWeight:500}}>{t.title}{t.note && <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{t.note}</div>}</td>
                      <td><span className={t.transaction_type==='income'?'income-amount':'expense-amount'}>{t.transaction_type==='income'?'+':'-'}{fmt(t.amount)}</span></td>
                      <td><span className="tag">{t.category_name||'—'}</span></td>
                      <td style={{color:'var(--text2)',fontSize:12,whiteSpace:'nowrap'}}>{new Date(t.created_at).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div style={{display:'flex',gap:2}}>
                          <button className="btn-icon btn-sm" onClick={()=>{setEditId(t.id);setEditForm({title:t.title,amount:t.amount,transaction_type:t.transaction_type,note:t.note,category:t.category||''})}}>✏️</button>
                          <button className="btn-icon btn-sm" onClick={()=>deleteTx(t.id)}>🗑️</button>
                        </div>
                      </td>
                    </>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:12,textAlign:'right'}}>
            <button className="btn-danger btn-sm" onClick={deleteAll}>Delete All</button>
          </div>
        </div>
      )}

      {/* Categories modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowCatModal(false)}}>
          <div className="modal">
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <div className="modal-title" style={{margin:0}}>Manage Categories</div>
              <button className="btn-icon" onClick={()=>setShowCatModal(false)}>✕</button>
            </div>
            <form onSubmit={addCat} style={{display:'flex',gap:8,marginBottom:14}}>
              <input placeholder="New category" value={newCatName} onChange={e=>setNewCatName(e.target.value)} required />
              <button className="btn-primary btn-sm" style={{flexShrink:0}}>+ Add</button>
            </form>
            {categories.map(c => (
              <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderTop:'1px solid var(--border)'}}>
                {editCatId===c.id ? (
                  <><input value={editCatName} onChange={e=>setEditCatName(e.target.value)} style={{flex:1}} />
                  <button className="btn-success btn-sm" onClick={()=>saveCat(c.id)}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={()=>setEditCatId(null)}>✕</button></>
                ) : (
                  <><span style={{flex:1}}>{c.name}</span>
                  <button className="btn-icon btn-sm" onClick={()=>{setEditCatId(c.id);setEditCatName(c.name)}}>✏️</button>
                  <button className="btn-icon btn-sm" onClick={()=>deleteCat(c.id)}>🗑️</button></>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}