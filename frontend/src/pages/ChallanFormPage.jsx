import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

const emptyItem = { product: '', quantity: '' }

export default function ChallanFormPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [customer, setCustomer] = useState('')
  const [items, setItems] = useState([{ ...emptyItem }])
  const [status, setStatus] = useState('DRAFT')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.get('/customers/'), api.get('/products/')]).then(([customerResponse, productResponse]) => {
      setCustomers(customerResponse.data.results || customerResponse.data.data || customerResponse.data)
      setProducts(productResponse.data.results || productResponse.data.data || productResponse.data)
    })
  }, [])

  const updateItem = (index, key, value) => {
    const next = items.slice()
    next[index] = { ...next[index], [key]: value }
    setItems(next)
  }

  const addItem = () => setItems([...items, { ...emptyItem }])

  const removeItem = (index) => setItems(items.filter((_, current) => current !== index))

  const submit = async (nextStatus) => {
    setError('')
    try {
      const payload = {
        customer: Number(customer),
        status: nextStatus,
        items: items.map((item) => ({ product: Number(item.product), quantity: Number(item.quantity) })),
      }
      await api.post('/challans/', payload)
      navigate('/challans')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save challan.')
    }
  }

  return (
    <div className="panel form-panel">
      <h2>New Challan</h2>
      <div className="form-grid">
        <label className="form-field"><span>Customer</span><select value={customer} onChange={(e) => setCustomer(e.target.value)}><option value="">Select customer</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      <div className="stack-form">
        {items.map((item, index) => (
          <div className="challan-item-row" key={index}>
            <select value={item.product} onChange={(e) => updateItem(index, 'product', e.target.value)}>
              <option value="">Product</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.current_stock})</option>)}
            </select>
            <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} placeholder="Qty" />
            <button type="button" className="secondary-button" onClick={() => removeItem(index)} disabled={items.length === 1}>Remove</button>
          </div>
        ))}
      </div>
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={addItem}>Add Product</button>
        <button type="button" className="primary-button" onClick={() => submit('DRAFT')}>Save Draft</button>
        <button type="button" className="primary-button accent" onClick={() => submit('CONFIRMED')}>Save & Confirm</button>
      </div>
      {error ? <div className="error-banner">{error}</div> : null}
    </div>
  )
}
