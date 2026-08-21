import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Table from '../components/Table'
import { statusClass } from '../utils/format'

const emptyItem = { inventory_id: '', quantity: '' }
const formatQuantity = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value || 0))
const newIdempotencyKey = () => globalThis.crypto?.randomUUID?.() || `order-${Date.now()}-${Math.random().toString(16).slice(2)}`

export default function CustomerOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [inventory, setInventory] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [items, setItems] = useState([{ ...emptyItem }])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const canReserve = ['ADMIN', 'SALES'].includes(user?.role)

  const load = async () => {
    setError('')
    try {
      const [orderResponse, inventoryResponse] = await Promise.all([api.get('/orders'), api.get('/inventory')])
      setOrders(orderResponse.data.results || [])
      setInventory(inventoryResponse.data.results || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load customer orders.')
    }
  }

  useEffect(() => { load() }, [])

  const updateItem = (index, field, value) => {
    const next = [...items]
    next[index] = { ...next[index], [field]: value }
    setItems(next)
  }

  const reserveOrder = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.post('/orders', {
        customer_name: customerName,
        idempotency_key: newIdempotencyKey(),
        items: items.map((item) => ({ inventory_id: Number(item.inventory_id), quantity: Number(item.quantity) })),
      })
      setCustomerName('')
      setItems([{ ...emptyItem }])
      setSuccess('Customer order created and inventory reserved.')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not reserve inventory.')
    } finally {
      setSaving(false)
    }
  }

  const cancelOrder = async (order) => {
    setError('')
    setSuccess('')
    try {
      await api.post(`/orders/${order.id}/cancel`)
      setSuccess('Order cancelled and reserved inventory released.')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not cancel order.')
    }
  }

  return (
    <div className="page-stack">
      <div className="panel header-row"><div><h2>Customer Orders</h2><p>Reserve available inventory for customers without exceeding physical stock.</p></div></div>
      {canReserve ? (
        <form className="panel form-grid" onSubmit={reserveOrder}>
          <h3>Create Customer Order</h3>
          <label className="form-field"><span>Customer name</span><input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
          {items.map((item, index) => (
            <div className="order-item-row" key={index}>
              <select required value={item.inventory_id} onChange={(event) => updateItem(index, 'inventory_id', event.target.value)}>
                <option value="">Select inventory record</option>
                {inventory.map((record) => <option key={record.id} value={record.id}>{record.item_name} - {record.location_name} - {record.batch_code} (available: {formatQuantity(record.available_quantity)})</option>)}
              </select>
              <input required type="number" min="0.01" step="0.01" placeholder="Quantity" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} />
              <button type="button" className="secondary-button" disabled={items.length === 1} onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
            </div>
          ))}
          <div className="button-row"><button type="button" className="secondary-button" onClick={() => setItems([...items, { ...emptyItem }])}>Add item</button><button className="primary-button" disabled={saving}>{saving ? 'Reserving...' : 'Reserve inventory'}</button></div>
        </form>
      ) : null}
      {error ? <div className="error-banner">{error}</div> : null}
      {success ? <div className="success-banner">{success}</div> : null}
      <section className="panel">
        <Table
          columns={[
            { key: 'order_number', title: 'Order' },
            { key: 'customer_name', title: 'Customer' },
            { key: 'total_reserved_quantity', title: 'Reserved', render: (row) => formatQuantity(row.total_reserved_quantity) },
            { key: 'created_by_username', title: 'Created by' },
            { key: 'status', title: 'Status', render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
            { key: 'actions', title: 'Actions', render: (row) => canReserve && row.status === 'RESERVED' ? <button className="secondary-button" onClick={() => cancelOrder(row)}>Cancel & release</button> : '-' },
          ]}
          rows={orders}
          emptyText="No customer orders found."
        />
      </section>
    </div>
  )
}
