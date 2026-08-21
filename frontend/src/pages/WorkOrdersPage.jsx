import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Table from '../components/Table'
import { statusClass } from '../utils/format'

const initialForm = { location_id: '', item_id: '', required_quantity: '', assigned_user_id: '' }

const formatQuantity = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value || 0))

export default function WorkOrdersPage() {
  const { user } = useAuth()
  const [workOrders, setWorkOrders] = useState([])
  const [locations, setLocations] = useState([])
  const [items, setItems] = useState([])
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isAdmin = user?.role === 'ADMIN'

  const load = async (statusFilter = status) => {
    setError('')
    try {
      const suffix = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''
      const response = await api.get(`/work-orders/${suffix}`)
      setWorkOrders(response.data.results || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load work orders.')
    }
  }

  useEffect(() => {
    Promise.all([
      api.get('/meta/locations'),
      api.get('/meta/items'),
      api.get('/meta/assignable-users'),
    ])
      .then(([locationResponse, itemResponse, userResponse]) => {
        setLocations(locationResponse.data.results || [])
        setItems(itemResponse.data.results || [])
        setUsers(userResponse.data.results || [])
      })
      .catch(() => setError('Could not load work order form data.'))
    load()
  }, [])

  const createWorkOrder = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      await api.post('/work-orders', {
        location_id: Number(form.location_id),
        item_id: Number(form.item_id),
        required_quantity: Number(form.required_quantity),
        assigned_user_id: Number(form.assigned_user_id),
      })
      setForm(initialForm)
      setSuccess('Work order created and shortage calculated.')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not create work order.')
    }
  }

  const updateStatus = async (workOrder, nextStatus) => {
    setError('')
    try {
      await api.patch(`/work-orders/${workOrder.id}/status`, { status: nextStatus })
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update work order status.')
    }
  }

  return (
    <div className="page-stack">
      <div className="panel header-row"><div><h2>Work Orders</h2><p>Check whether a required item is available at the assigned location.</p></div></div>

      {isAdmin ? (
        <form className="panel form-grid" onSubmit={createWorkOrder}>
          <h3>Create Work Order</h3>
          <label className="form-field"><span>Location</span><select required value={form.location_id} onChange={(event) => setForm({ ...form, location_id: event.target.value })}><option value="">Select location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label className="form-field"><span>Item</span><select required value={form.item_id} onChange={(event) => setForm({ ...form, item_id: event.target.value })}><option value="">Select item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>)}</select></label>
          <label className="form-field"><span>Required quantity</span><input required type="number" min="0.01" step="0.01" value={form.required_quantity} onChange={(event) => setForm({ ...form, required_quantity: event.target.value })} /></label>
          <label className="form-field"><span>Assigned user</span><select required value={form.assigned_user_id} onChange={(event) => setForm({ ...form, assigned_user_id: event.target.value })}><option value="">Select user</option>{users.map((assignableUser) => <option key={assignableUser.id} value={assignableUser.id}>{assignableUser.username} ({assignableUser.role})</option>)}</select></label>
          <button className="primary-button">Create work order</button>
        </form>
      ) : null}

      <div className="panel filters-row work-order-filters"><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="ASSIGNED">Assigned</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option></select><button className="secondary-button" onClick={() => load()}>Apply filter</button></div>
      {error ? <div className="error-banner">{error}</div> : null}
      {success ? <div className="success-banner">{success}</div> : null}

      <section className="panel">
        <Table
          columns={[
            { key: 'work_order_number', title: 'Work Order' },
            { key: 'item_name', title: 'Item', render: (row) => <><strong>{row.item_name}</strong><br /><small>{row.sku}</small></> },
            { key: 'location_name', title: 'Location' },
            { key: 'required_quantity', title: 'Required', render: (row) => formatQuantity(row.required_quantity) },
            { key: 'available_quantity', title: 'Available', render: (row) => formatQuantity(row.available_quantity) },
            { key: 'shortage_quantity', title: 'Shortage', render: (row) => <strong className={Number(row.shortage_quantity) > 0 ? 'error-text' : ''}>{formatQuantity(row.shortage_quantity)}</strong> },
            { key: 'assigned_username', title: 'Assigned to' },
            { key: 'status', title: 'Status', render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
            { key: 'actions', title: 'Actions', render: (row) => row.status !== 'COMPLETED' ? <div className="compact-actions"><button className="secondary-button" onClick={() => updateStatus(row, row.status === 'ASSIGNED' ? 'IN_PROGRESS' : 'COMPLETED')}>{row.status === 'ASSIGNED' ? 'Start' : 'Complete'}</button></div> : '-' },
          ]}
          rows={workOrders}
          emptyText="No work orders found."
        />
      </section>
    </div>
  )
}
