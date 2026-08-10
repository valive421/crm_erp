import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'

const initial = {
  name: '', sku: '', category: '', unit_price: '', minimum_stock_alert_quantity: '', warehouse: '',
}

export default function ProductFormPage({ mode }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [categories, setCategories] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/products/meta/categories').then((r) => setCategories(r.data.results || r.data.data || r.data))
    api.get('/products/meta/warehouses').then((r) => setWarehouses(r.data.results || r.data.data || r.data))
    if (mode === 'edit' && id) {
      api.get(`/products/${id}/`).then((response) => setForm({ ...initial, ...response.data.data || response.data }))
    }
  }, [mode, id])

  const onChange = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const payload = {
        ...form,
        category: Number(form.category),
        warehouse: Number(form.warehouse),
        unit_price: Number(form.unit_price),
        minimum_stock_alert_quantity: Number(form.minimum_stock_alert_quantity),
      }
      if (mode === 'create') {
        await api.post('/products/', payload)
      } else {
        await api.put(`/products/${id}/`, payload)
      }
      navigate('/products')
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.')
    }
  }

  return (
    <div className="panel form-panel">
      <h2>{mode === 'create' ? 'New Product' : 'Edit Product'}</h2>
      <form className="form-grid" onSubmit={submit}>
        <label className="form-field"><span>Name</span><input value={form.name} onChange={onChange('name')} /></label>
        <label className="form-field"><span>SKU</span><input value={form.sku} onChange={onChange('sku')} /></label>
        <label className="form-field"><span>Category</span><select value={form.category} onChange={onChange('category')}><option value="">Select</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="form-field"><span>Warehouse</span><select value={form.warehouse} onChange={onChange('warehouse')}><option value="">Select</option>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="form-field"><span>Unit Price</span><input type="number" value={form.unit_price} onChange={onChange('unit_price')} /></label>
        <label className="form-field"><span>Minimum Stock Alert</span><input type="number" value={form.minimum_stock_alert_quantity} onChange={onChange('minimum_stock_alert_quantity')} /></label>
        {error ? <div className="error-banner">{error}</div> : null}
        <button className="primary-button">{mode === 'create' ? 'Create' : 'Update'}</button>
      </form>
    </div>
  )
}
