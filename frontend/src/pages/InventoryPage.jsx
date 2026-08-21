import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Table from '../components/Table'

const initialAdjustment = { inventory_id: '', direction: 'IN', quantity: '' }

function formatQuantity(value) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value || 0))
}

function newIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() || `adjustment-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default function InventoryPage() {
  const { user } = useAuth()
  const [inventory, setInventory] = useState([])
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [filters, setFilters] = useState({ category_id: '', location_id: '' })
  const [form, setForm] = useState(initialAdjustment)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canAdjust = ['ADMIN', 'OPERATIONS'].includes(user?.role)

  const load = async (activeFilters = filters) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (activeFilters.category_id) params.set('category_id', activeFilters.category_id)
      if (activeFilters.location_id) params.set('location_id', activeFilters.location_id)
      const suffix = params.toString() ? `?${params.toString()}` : ''
      const [inventoryResponse, transactionResponse] = await Promise.all([
        api.get(`/inventory/${suffix}`),
        api.get('/inventory/transactions'),
      ])
      setInventory(inventoryResponse.data.results || [])
      setTransactions(transactionResponse.data.results || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load inventory.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([api.get('/meta/categories'), api.get('/meta/locations')])
      .then(([categoryResponse, locationResponse]) => {
        setCategories(categoryResponse.data.results || [])
        setLocations(locationResponse.data.results || [])
      })
      .catch(() => setError('Could not load inventory filters.'))
    load()
  }, [])

  const selectedInventory = useMemo(
    () => inventory.find((row) => String(row.id) === String(form.inventory_id)),
    [inventory, form.inventory_id],
  )

  const submitAdjustment = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.post('/inventory/adjustments', {
        inventory_id: Number(form.inventory_id),
        direction: form.direction,
        quantity: Number(form.quantity),
        idempotency_key: newIdempotencyKey(),
      })
      setForm(initialAdjustment)
      setSuccess('Inventory adjustment recorded.')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Inventory adjustment failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="panel header-row">
        <div>
          <h2>Inventory</h2>
          <p>Track physical, reserved, and available quantity for every location and batch.</p>
        </div>
      </div>

      <div className="filters-row panel inventory-filters">
        <select value={filters.category_id} onChange={(event) => setFilters({ ...filters, category_id: event.target.value })}>
          <option value="">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select value={filters.location_id} onChange={(event) => setFilters({ ...filters, location_id: event.target.value })}>
          <option value="">All locations</option>
          {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
        <button className="secondary-button" onClick={() => load()}>Apply filters</button>
      </div>

      {canAdjust ? (
        <form className="panel form-grid" onSubmit={submitAdjustment}>
          <div className="section-header"><h3>Stock Adjustment</h3><span className="status neutral">Operations only</span></div>
          <label className="form-field">
            <span>Inventory record</span>
            <select required value={form.inventory_id} onChange={(event) => setForm({ ...form, inventory_id: event.target.value })}>
              <option value="">Select item, location, and batch</option>
              {inventory.map((row) => <option key={row.id} value={row.id}>{row.item_name} - {row.location_name} - {row.batch_code} (available: {formatQuantity(row.available_quantity)})</option>)}
            </select>
          </label>
          <label className="form-field">
            <span>Direction</span>
            <select value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value })}>
              <option value="IN">Stock in</option>
              <option value="OUT">Stock out</option>
            </select>
          </label>
          <label className="form-field">
            <span>Quantity</span>
            <input type="number" min="0.01" step="0.01" required value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
          </label>
          {selectedInventory ? <p>Available before adjustment: <strong>{formatQuantity(selectedInventory.available_quantity)}</strong></p> : null}
          <button className="primary-button" disabled={saving}>{saving ? 'Saving...' : 'Save adjustment'}</button>
        </form>
      ) : null}

      {error ? <div className="error-banner">{error}</div> : null}
      {success ? <div className="success-banner">{success}</div> : null}

      <section className="panel">
        <div className="section-header"><h3>Inventory by Location and Batch</h3><span>{loading ? 'Loading...' : `${inventory.length} records`}</span></div>
        <Table
          columns={[
            { key: 'item_name', title: 'Item', render: (row) => <><strong>{row.item_name}</strong><br /><small>{row.sku} · {row.category_name}</small></> },
            { key: 'location_name', title: 'Location' },
            { key: 'batch_code', title: 'Batch' },
            { key: 'physical_quantity', title: 'Physical', render: (row) => formatQuantity(row.physical_quantity) },
            { key: 'reserved_quantity', title: 'Reserved', render: (row) => formatQuantity(row.reserved_quantity) },
            { key: 'available_quantity', title: 'Available', render: (row) => <strong>{formatQuantity(row.available_quantity)}</strong> },
          ]}
          rows={inventory}
          emptyText={loading ? 'Loading inventory...' : 'No inventory records match these filters.'}
        />
      </section>

      <section className="panel">
        <h3>Recent Inventory Transactions</h3>
        <Table
          columns={[
            { key: 'created_at', title: 'Time', render: (row) => new Date(row.created_at).toLocaleString() },
            { key: 'item_name', title: 'Item', render: (row) => `${row.item_name} (${row.batch_code})` },
            { key: 'location_name', title: 'Location' },
            { key: 'transaction_type', title: 'Type' },
            { key: 'quantity', title: 'Quantity', render: (row) => formatQuantity(row.quantity) },
            { key: 'created_by_username', title: 'By' },
          ]}
          rows={transactions}
          emptyText="No inventory transactions recorded yet."
        />
      </section>
    </div>
  )
}
