import { useEffect, useState } from 'react'
import { api } from '../services/api'
import Table from '../components/Table'

const initial = { product: '', quantity_changed: '', movement_type: 'IN', reason: '' }

export default function InventoryPage() {
  const [movements, setMovements] = useState([])
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')

  const load = async () => {
    const [movementResponse, productResponse] = await Promise.all([api.get('/inventory/'), api.get('/products/')])
    setMovements(movementResponse.data.results || movementResponse.data.data || movementResponse.data)
    setProducts(productResponse.data.results || productResponse.data.data || productResponse.data)
  }

  useEffect(() => { load() }, [])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await api.post('/inventory/movements', { ...form, product: Number(form.product), quantity_changed: Number(form.quantity_changed) })
      setForm(initial)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Movement failed.')
    }
  }

  return (
    <div className="page-stack">
      <div className="panel header-row">
        <div>
          <h2>Inventory</h2>
          <p>Stock movements and warehouse adjustments.</p>
        </div>
      </div>
      <form className="panel form-grid" onSubmit={submit}>
        <label className="form-field"><span>Product</span><select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}><option value="">Select</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="form-field"><span>Quantity</span><input type="number" value={form.quantity_changed} onChange={(e) => setForm({ ...form, quantity_changed: e.target.value })} /></label>
        <label className="form-field"><span>Type</span><select value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value })}><option value="IN">IN</option><option value="OUT">OUT</option></select></label>
        <label className="form-field"><span>Reason</span><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label>
        {error ? <div className="error-banner">{error}</div> : null}
        <button className="primary-button">Save Movement</button>
      </form>
      <div className="panel">
        <h3>Recent Movements</h3>
        <Table
          columns={[
            { key: 'product', title: 'Product', render: (row) => row.product_name || row.product__name || row.product },
            { key: 'quantity_changed', title: 'Qty' },
            { key: 'movement_type', title: 'Type' },
            { key: 'reason', title: 'Reason' },
          ]}
          rows={movements}
        />
      </div>
    </div>
  )
}
