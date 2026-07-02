import React, { useState, useEffect, useRef } from 'react'
import api from '../api/client'

// ── Calculator Keyboard ───────────────────────────────────────────────────────
function CalcKeyboard({ value, onChange, onClose }) {
  const [expr, setExpr] = useState(value ? String(value) : '')
  const inputRef = useRef()

  const evaluate = (e) => {
    try {
      // Safe eval: only allow digits, operators, dot, parens
      const safe = e.replace(/[^0-9+\-*/().]/g, '')
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${safe})`)()
      if (isFinite(result)) return String(Math.round(result * 100) / 100)
    } catch {}
    return e
  }

  const press = (key) => {
    if (key === 'DEL') { setExpr(p => p.slice(0, -1)); return }
    if (key === 'CLR') { setExpr(''); return }
    if (key === '=') {
      const result = evaluate(expr)
      setExpr(result)
      onChange(result)
      return
    }
    if (key === '±') { setExpr(p => p.startsWith('-') ? p.slice(1) : '-' + p); return }
    setExpr(p => p + key)
  }

  const rows = [
    ['7','8','9','DEL'],
    ['4','5','6','*'],
    ['1','2','3','-'],
    ['0','.','±','+'],
    ['(',')','/','='],
  ]

  const keyStyle = (k) => {
    const isOp = ['+','-','*','/','(',')','±'].includes(k)
    const isDel = k === 'DEL' || k === 'CLR'
    const isEq  = k === '='
    return {
      height: 48, borderRadius: 10, border: 'none', cursor: 'pointer',
      fontWeight: 700, fontSize: 16,
      background: isEq ? 'var(--accent)' : isDel ? 'var(--red,#ef4444)' : isOp ? 'var(--bg2)' : 'var(--surface)',
      color: isEq || isDel ? '#fff' : isOp ? 'var(--accent)' : 'var(--text)',
      transition: 'opacity .1s',
    }
  }

  return (
    <div className="calc-overlay">
      {/* Expression display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          flex: 1, background: 'var(--bg2)', borderRadius: 10, padding: '10px 14px',
          fontSize: 18, fontWeight: 700, textAlign: 'right', minHeight: 44,
          color: 'var(--text)', wordBreak: 'break-all', letterSpacing: 1,
        }}>{expr || '0'}</div>
        <button onClick={() => { onChange(evaluate(expr)); onClose() }}
          style={{ padding: '10px 18px', background: 'var(--green,#22c55e)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Done ✓
        </button>
      </div>
      {/* Key grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
        {rows.flat().map((k, i) => (
          <button key={i} style={keyStyle(k)} onClick={() => press(k)}>{k}</button>
        ))}
      </div>
    </div>
  )
}

export default function Transactions() {
  const [data, setData] = useState({ transactions: [], total_income: 0, total_expense: 0, balance: 0 })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('')
  const [showCharts, setShowCharts] = useState(false)
  const [charts, setCharts] = useState(null)
  const [showCalc, setShowCalc] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const emptyForm = (catId = '') => ({ title: '', amount: '', transaction_type: 'expense', note: '', category: catId, new_category: '' })
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatBudget, setNewCatBudget] = useState('')
  const [editCatId, setEditCatId] = useState(null)
  const [editCatName, setEditCatName] = useState('')

  const load = async (filter = catFilter) => {
    const params = filter && filter !== 'none' ? `?category=${filter}` : filter === 'none' ? '?category=none' : ''
    const [t, c] = await Promise.all([api.get(`transactions/${params}`), api.get('transactions/categories/')])
    setData(t.data); setCategories(c.data); setLoading(false)
  }

  useEffect(() => { load() }, [])

  const applyFilter = (v) => {
    setCatFilter(v); load(v)
    const numId = parseInt(v)
    if (!isNaN(numId) && numId > 0) setForm(f => ({ ...f, category: String(numId) }))
    else setForm(f => ({ ...f, category: '' }))
  }

  const openCharts = async () => {
    setShowCharts(true)
    try { const r = await api.get('transactions/charts/'); setCharts(r.data) } catch {}
  }

  const openHistory = async () => {
    setShowHistory(true); setHistoryLoading(true)
    try { const r = await api.get('transactions/history/'); setHistory(r.data) }
    finally { setHistoryLoading(false) }
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
    if (!confirm('Move to history? (recoverable for 30 days)')) return
    await api.delete(`transactions/${id}/`); load()
  }

  const deleteAll = async () => {
    if (!confirm('Move ALL transactions to history?')) return
    await api.delete('transactions/delete-all/'); load()
  }

  const restoreTx = async (id) => { await api.post(`transactions/${id}/restore/`); openHistory(); load() }
  const permanentDelete = async (id) => { if (!confirm('Permanently delete? Cannot undo.')) return; await api.delete(`transactions/${id}/permanent/`); openHistory() }

  const addCat = async (e) => { e.preventDefault(); await api.post('transactions/categories/', { name: newCatName, monthly_budget: newCatBudget||null }); setNewCatName(''); setNewCatBudget(''); load() }
  const saveCat = async (id) => { await api.patch(`transactions/categories/${id}/`, { name: editCatName }); setEditCatId(null); load() }
  const deleteCat = async (id) => { if (!confirm('Delete category?')) return; await api.delete(`transactions/categories/${id}/`); load() }

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })
  const fmtDate = (s) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  const CatSelect = ({ value, onChange }) => (
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Uncategorized</option>
      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      <option value="__new__">+ New category…</option>
    </select>
  )

  if (loading) return <div className="spinner" />

  return (
    <div className="page" style={{ paddingBottom: showCalc ? 320 : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h1 className="page-title" style={{ margin: 0 }}>💰 <span className="title-text">Transactions</span></h1>
        <div style={{display:'flex',gap:6}}>
          <button className="btn-secondary btn-sm" onClick={openCharts}>📊 Charts</button>
          <button className="btn-secondary btn-sm" onClick={openHistory}>🗑️ History</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div className="stat-card"><div className="stat-label">Income</div><div className="stat-value income-amount">{fmt(data.total_income)}</div></div>
        <div className="stat-card"><div className="stat-label">Expenses</div><div className="stat-value expense-amount">{fmt(data.total_expense)}</div></div>
        <div className="stat-card">
          <div className="stat-label">Balance</div>
          <div className="stat-value" style={{ color: data.balance >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(data.balance)}</div>
        </div>
      </div>

      {/* Add form */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Add Transaction</div>
        <form onSubmit={addTx}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Title (e.g. Grocery)" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
            {/* Amount field — tapping opens calculator */}
            <div>
              <label>Amount (₹) — tap to open calculator</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text" inputMode="none" readOnly
                  placeholder="Tap 🧮 to enter amount"
                  value={form.amount}
                  onClick={() => setShowCalc(true)}
                  style={{ flex: 1, cursor: 'pointer', caretColor: 'transparent' }}
                />
                <button type="button" onClick={() => setShowCalc(true)}
                  style={{ padding: '8px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>
                  🧮
                </button>
              </div>
            </div>
            <div className="form-row">
              <div>
                <label>Type</label>
                <select value={form.transaction_type} onChange={e => setForm(p => ({ ...p, transaction_type: e.target.value }))}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label>Category</label>
                <CatSelect value={form.category} onChange={v => setForm(p => ({ ...p, category: v, new_category: '' }))} />
              </div>
            </div>
            {form.category === '__new__' && <input placeholder="New category name" value={form.new_category} onChange={e => setForm(p => ({ ...p, new_category: e.target.value }))} />}
            <input placeholder="Note (optional)" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
            <button className="btn-primary" style={{ alignSelf: 'flex-start' }} disabled={!form.title || !form.amount}>+ Add</button>
          </div>
        </form>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className={`btn-xs ${catFilter === '' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => applyFilter('')}>All</button>
        <button className={`btn-xs ${catFilter === 'none' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => applyFilter('none')}>Uncat.</button>
        {categories.map(c => (
          <div key={c.id} style={{display:'flex',flexDirection:'column',gap:2}}>
            <button className={`btn-xs ${catFilter === String(c.id) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => applyFilter(String(c.id))}>{c.name}</button>
            {c.monthly_budget && (
              <div style={{width:'100%',height:2,background:'var(--surface3)',borderRadius:2}}>
                <div style={{height:'100%',borderRadius:2,background:c.spent_this_month>=c.monthly_budget?'var(--red)':'var(--green)',width:`${Math.min(100,(c.spent_this_month/c.monthly_budget)*100)}%`}}/>
              </div>
            )}
          </div>
        ))}
        <button className="btn-secondary btn-xs" style={{ marginLeft: 'auto' }} onClick={() => setShowCatModal(true)}>⚙️ Categories</button>
      </div>

      {/* List */}
      {data.transactions.length === 0 ? <div className="empty">No transactions yet.</div> : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Title</th><th>Amount</th><th>Cat.</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {data.transactions.map(t => (
                  <tr key={t.id}>
                    {editId === t.id ? (
                      <td colSpan={5}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
                          <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                          <input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))} />
                          <div className="form-row">
                            <select value={editForm.transaction_type} onChange={e => setEditForm(p => ({ ...p, transaction_type: e.target.value }))}>
                              <option value="expense">Expense</option>
                              <option value="income">Income</option>
                            </select>
                            <CatSelect value={editForm.category || ''} onChange={v => setEditForm(p => ({ ...p, category: v }))} />
                          </div>
                          <input value={editForm.note || ''} onChange={e => setEditForm(p => ({ ...p, note: e.target.value }))} placeholder="Note" />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-success btn-sm" onClick={() => saveTx(t.id)}>Save</button>
                            <button className="btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                          </div>
                        </div>
                      </td>
                    ) : (<>
                      <td style={{ fontWeight: 500 }}>{t.title}{t.note && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{t.note}</div>}</td>
                      <td><span className={t.transaction_type === 'income' ? 'income-amount' : 'expense-amount'}>{t.transaction_type === 'income' ? '+' : '-'}{fmt(t.amount)}</span></td>
                      <td><span className="tag">{t.category_name || '—'}</span></td>
                      <td style={{ color: 'var(--text2)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(t.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button className="btn-icon btn-sm" onClick={() => { setEditId(t.id); setEditForm({ title: t.title, amount: t.amount, transaction_type: t.transaction_type, note: t.note, category: t.category || '' }) }}>✏️</button>
                          <button className="btn-icon btn-sm" onClick={() => deleteTx(t.id)}>🗑️</button>
                        </div>
                      </td>
                    </>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <button className="btn-danger btn-sm" onClick={deleteAll}>Move All to History</button>
          </div>
        </div>
      )}

      {/* Categories modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCatModal(false) }}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="modal-title" style={{ margin: 0 }}>Manage Categories</div>
              <button className="btn-icon" onClick={() => setShowCatModal(false)}>✕</button>
            </div>
            <form onSubmit={addCat} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input placeholder="New category" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
              <input type="number" placeholder="Budget ₹" value={newCatBudget} onChange={e=>setNewCatBudget(e.target.value)} style={{width:90}}/>
              <button className="btn-primary btn-sm" style={{ flexShrink: 0 }}>+ Add</button>
            </form>
            {categories.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                {editCatId === c.id ? (
                  <><input value={editCatName} onChange={e => setEditCatName(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn-success btn-sm" onClick={() => saveCat(c.id)}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={() => setEditCatId(null)}>✕</button></>
                ) : (
                  <><span style={{ flex: 1 }}>{c.name}</span>
                  <button className="btn-icon btn-sm" onClick={() => { setEditCatId(c.id); setEditCatName(c.name) }}>✏️</button>
                  <button className="btn-icon btn-sm" onClick={() => deleteCat(c.id)}>🗑️</button></>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History modal */}
      {showHistory && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowHistory(false) }}>
          <div className="modal" style={{ maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
              <div className="modal-title" style={{ margin: 0 }}>🗑️ Deleted Transactions (30 days)</div>
              <button className="btn-icon" onClick={() => setShowHistory(false)}>✕</button>
            </div>
            {historyLoading ? <div className="spinner" style={{ margin: '20px auto' }} /> :
              history.length === 0 ? <div className="empty">No deleted transactions.</div> : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {history.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{t.title}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                        <span className={t.transaction_type === 'income' ? 'income-amount' : 'expense-amount'} style={{ fontSize: 13 }}>
                          {t.transaction_type === 'income' ? '+' : '-'}{fmt(t.amount)}
                        </span>
                        {t.category_name && <span className="tag" style={{ fontSize: 11 }}>{t.category_name}</span>}
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>Deleted {fmtDate(t.deleted_at)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button className="btn-success btn-sm" title="Restore" onClick={() => restoreTx(t.id)}>↩ Restore</button>
                      <button className="btn-danger btn-sm" title="Delete forever" onClick={() => permanentDelete(t.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts Modal */}
      {showCharts && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowCharts(false)}}>
          <div className="modal" style={{maxWidth:560,maxHeight:'85vh',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,flexShrink:0}}>
              <div className="modal-title" style={{margin:0}}>📊 Spending Charts</div>
              <button className="btn-icon" onClick={()=>setShowCharts(false)}>✕</button>
            </div>
            {!charts ? <div className="spinner" style={{margin:'20px auto'}}/> : (
              <div style={{overflowY:'auto',flex:1}}>
                {/* 30-day spending bar chart */}
                <div style={{marginBottom:20}}>
                  <div style={{fontWeight:600,marginBottom:10,fontSize:14}}>Last 30 Days</div>
                  <div style={{display:'flex',alignItems:'flex-end',gap:2,height:80}}>
                    {charts.daily.map((d,i)=>{
                      const maxVal = Math.max(...charts.daily.map(x=>x.expense+x.income),1)
                      const expH = (d.expense/maxVal)*76
                      const incH = (d.income/maxVal)*76
                      return (
                        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:1}} title={`${d.date}
Income: ₹${d.income}
Expense: ₹${d.expense}`}>
                          {d.income>0 && <div style={{width:'100%',background:'var(--green)',borderRadius:'2px 2px 0 0',height:incH,opacity:.8}}/>}
                          {d.expense>0 && <div style={{width:'100%',background:'var(--red)',borderRadius:d.income?'0':'2px 2px 0 0',height:expH,opacity:.8}}/>}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{display:'flex',gap:12,marginTop:8,fontSize:11}}>
                    <span style={{color:'var(--green)'}}>▮ Income</span>
                    <span style={{color:'var(--red)'}}>▮ Expense</span>
                  </div>
                </div>
                {/* Category breakdown */}
                {charts.by_category.length > 0 && (
                  <div>
                    <div style={{fontWeight:600,marginBottom:10,fontSize:14}}>This Month by Category</div>
                    {charts.by_category.map((c,i)=>{
                      const maxVal = charts.by_category[0].total
                      const pct = Math.round((c.total/maxVal)*100)
                      const colors=['#7c6af7','#5b8ef8','#10d9a0','#fbbf24','#f97316','#ec4899']
                      return (
                        <div key={i} style={{marginBottom:10}}>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}>
                            <span>{c.category__name||'Uncategorized'}</span>
                            <span style={{color:'var(--red)',fontWeight:600}}>₹{Number(c.total).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{width:`${pct}%`,background:colors[i%colors.length]}}/>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calculator keyboard */}
      {showCalc && (
        <CalcKeyboard
          value={form.amount}
          onChange={v => setForm(p => ({ ...p, amount: v }))}
          onClose={() => setShowCalc(false)}
        />
      )}
    </div>
  )
}