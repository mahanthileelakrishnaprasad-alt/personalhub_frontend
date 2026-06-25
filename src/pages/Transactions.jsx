import React, { useState, useEffect } from 'react'
import api from '../api/client'

export default function Transactions() {
  const [data, setData] = useState({ transactions: [], total_income: 0, total_expense: 0, balance: 0 })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('')

  // Add form
  const emptyForm = { title: '', amount: '', transaction_type: 'expense', note: '', category: '', new_category: '' }
  const [form, setForm] = useState(emptyForm)

  // Edit
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})

  // Category management modal
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [editCatId, setEditCatId] = useState(null)
  const [editCatName, setEditCatName] = useState('')

  // Calculator
  const [calcOpen, setCalcOpen] = useState(null) // 'add' | 'edit'
  const [calcOp, setCalcOp] = useState('add')
  const [calcVal, setCalcVal] = useState('')

  const load = async (filter = catFilter) => {
    const params = filter ? `?category=${filter}` : ''
    const [t, c] = await Promise.all([
      api.get(`transactions/${params}`),
      api.get('transactions/categories/'),
    ])
    setData(t.data)
    setCategories(c.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const applyFilter = (v) => { setCatFilter(v); load(v) }

  const addTx = async (e) => {
    e.preventDefault()
    const payload = { ...form }
    if (form.category === '__new__' && form.new_category) {
      // Create category first
      const r = await api.post('transactions/categories/', { name: form.new_category })
      payload.category = r.data.id
    } else if (!form.category) {
      payload.category = null
    }
    delete payload.new_category
    await api.post('transactions/', payload)
    setForm(emptyForm)
    load()
  }

  const saveTx = async (id) => {
    const payload = { ...editForm }
    if (editForm.category === '__new__' && editForm.new_category) {
      const r = await api.post('transactions/categories/', { name: editForm.new_category })
      payload.category = r.data.id
    } else if (!editForm.category) {
      payload.category = null
    }
    delete payload.new_category
    await api.patch(`transactions/${id}/`, payload)
    setEditId(null)
    load()
  }

  const deleteTx = async (id) => {
    if (!confirm('Delete this transaction?')) return
    await api.delete(`transactions/${id}/`)
    load()
  }

  const deleteAll = async () => {
    if (!confirm('Delete ALL transactions? This cannot be undone.')) return
    await api.delete('transactions/delete-all/')
    load()
  }

  const addCat = async (e) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    await api.post('transactions/categories/', { name: newCatName })
    setNewCatName('')
    load()
  }

  const saveCat = async (id) => {
    await api.patch(`transactions/categories/${id}/`, { name: editCatName })
    setEditCatId(null)
    load()
  }

  const deleteCat = async (id) => {
    if (!confirm('Delete category? Transactions become Uncategorized.')) return
    await api.delete(`transactions/categories/${id}/`)
    load()
  }

  // Calculator logic
  const applyCalc = (target) => {
    const current = parseFloat(target === 'add' ? form.amount : editForm.amount) || 0
    const operand = parseFloat(calcVal) || 0
    let result = current
    if (calcOp === 'add') result = current + operand
    if (calcOp === 'sub') result = current - operand
    if (calcOp === 'mul') result = current * operand
    if (calcOp === 'div' && operand !== 0) result = current / operand
    const rounded = Math.round(result * 100) / 100
    if (target === 'add') setForm(f => ({ ...f, amount: String(rounded) }))
    else setEditForm(f => ({ ...f, amount: String(rounded) }))
    setCalcOpen(null); setCalcVal('')
  }

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })

  if (loading) return <div className="spinner" />

  const CatSelect = ({ value, onChange, name }) => (
    <select value={value} onChange={e => onChange(e.target.value)} name={name}>
      <option value="">Uncategorized</option>
      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      <option value="__new__">+ New category…</option>
    </select>
  )

  const CalcPopover = ({ target }) => (
    <div className="card" style={{ position: 'absolute', zIndex: 10, top: 40, right: 0, width: 220, boxShadow: '0 4px 20px rgba(0,0,0,.5)' }}>
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Calculator</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {['add', 'sub', 'mul', 'div'].map(op => (
          <button key={op} className={calcOp === op ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'} onClick={() => setCalcOp(op)}>
            {op === 'add' ? '+' : op === 'sub' ? '−' : op === 'mul' ? '×' : '÷'}
          </button>
        ))}
      </div>
      <input
        type="number"
        placeholder="Operand"
        value={calcVal}
        onChange={e => setCalcVal(e.target.value)}
        autoFocus
        style={{ marginBottom: 8 }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-success btn-sm" style={{ flex: 1 }} onClick={() => applyCalc(target)}>Apply</button>
        <button className="btn-secondary btn-sm" onClick={() => setCalcOpen(null)}>✕</button>
      </div>
    </div>
  )

  return (
    <div className="page">
      <h1 className="page-title">💰 Transactions</h1>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Income</div>
          <div className="income-amount" style={{ fontSize: 18 }}>{fmt(data.total_income)}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Expenses</div>
          <div className="expense-amount" style={{ fontSize: 18 }}>{fmt(data.total_expense)}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Balance</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: data.balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {fmt(data.balance)}
          </div>
        </div>
      </div>

      {/* Add transaction */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Add Transaction</div>
        <form onSubmit={addTx}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="form-row">
              <div style={{ flex: 2 }}>
                <label>Title</label>
                <input placeholder="e.g. Grocery shopping" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <label>Amount (₹)</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                  <button type="button" className="btn-secondary btn-sm" style={{ flexShrink: 0 }} onClick={() => setCalcOpen(calcOpen === 'add' ? null : 'add')}>÷×</button>
                </div>
                {calcOpen === 'add' && <CalcPopover target="add" />}
              </div>
            </div>
            <div className="form-row">
              <div style={{ flex: 1 }}>
                <label>Type</label>
                <select value={form.transaction_type} onChange={e => setForm({ ...form, transaction_type: e.target.value })}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label>Category</label>
                <CatSelect value={form.category} onChange={v => setForm({ ...form, category: v, new_category: '' })} />
              </div>
            </div>
            {form.category === '__new__' && (
              <input placeholder="New category name" value={form.new_category} onChange={e => setForm({ ...form, new_category: e.target.value })} />
            )}
            <input placeholder="Note (optional)" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            <button className="btn-primary" style={{ alignSelf: 'flex-start' }}>+ Add</button>
          </div>
        </form>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 14, color: 'var(--text2)' }}>Filter:</span>
        <button className={`btn-sm ${catFilter === '' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => applyFilter('')}>All</button>
        <button className={`btn-sm ${catFilter === 'none' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => applyFilter('none')}>Uncategorized</button>
        {categories.map(c => (
          <button key={c.id} className={`btn-sm ${catFilter === String(c.id) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => applyFilter(String(c.id))}>
            {c.name}
          </button>
        ))}
        <button className="btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowCatModal(true)}>Manage Categories</button>
      </div>

      {/* Transaction list */}
      {data.transactions.length === 0 ? (
        <div className="empty">No transactions yet.</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Note</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map(t => (
                <tr key={t.id}>
                  {editId === t.id ? (
                    <td colSpan={6}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
                        <div className="form-row">
                          <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" />
                          <div style={{ position: 'relative', display: 'flex', gap: 4 }}>
                            <input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} placeholder="Amount" />
                            <button type="button" className="btn-secondary btn-sm" onClick={() => setCalcOpen(calcOpen === 'edit' ? null : 'edit')}>÷×</button>
                            {calcOpen === 'edit' && <CalcPopover target="edit" />}
                          </div>
                        </div>
                        <div className="form-row">
                          <select value={editForm.transaction_type} onChange={e => setEditForm({ ...editForm, transaction_type: e.target.value })}>
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>
                          <CatSelect value={editForm.category || ''} onChange={v => setEditForm({ ...editForm, category: v, new_category: '' })} />
                        </div>
                        {editForm.category === '__new__' && (
                          <input placeholder="New category name" value={editForm.new_category || ''} onChange={e => setEditForm({ ...editForm, new_category: e.target.value })} />
                        )}
                        <input value={editForm.note || ''} onChange={e => setEditForm({ ...editForm, note: e.target.value })} placeholder="Note" />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-success btn-sm" onClick={() => saveTx(t.id)}>Save</button>
                          <button className="btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td>{t.title}</td>
                      <td>
                        <span className={t.transaction_type === 'income' ? 'income-amount' : 'expense-amount'}>
                          {t.transaction_type === 'income' ? '+' : '-'}{fmt(t.amount)}
                        </span>
                      </td>
                      <td><span className="tag">{t.category_name || 'Uncategorized'}</span></td>
                      <td style={{ color: 'var(--text2)', fontSize: 12 }}>{t.note}</td>
                      <td style={{ color: 'var(--text2)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(t.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon btn-sm" onClick={() => { setEditId(t.id); setEditForm({ title: t.title, amount: t.amount, transaction_type: t.transaction_type, note: t.note, category: t.category || '' }) }}>✏️</button>
                          <button className="btn-icon btn-sm" onClick={() => deleteTx(t.id)}>🗑️</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <button className="btn-danger btn-sm" onClick={deleteAll}>Delete All</button>
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
            <form onSubmit={addCat} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input placeholder="New category name" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
              <button className="btn-primary btn-sm" style={{ flexShrink: 0 }}>+ Add</button>
            </form>
            {categories.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                {editCatId === c.id ? (
                  <>
                    <input value={editCatName} onChange={e => setEditCatName(e.target.value)} style={{ flex: 1 }} />
                    <button className="btn-success btn-sm" onClick={() => saveCat(c.id)}>Save</button>
                    <button className="btn-secondary btn-sm" onClick={() => setEditCatId(null)}>✕</button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1 }}>{c.name}</span>
                    <button className="btn-icon btn-sm" onClick={() => { setEditCatId(c.id); setEditCatName(c.name) }}>✏️</button>
                    <button className="btn-icon btn-sm" onClick={() => deleteCat(c.id)}>🗑️</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
