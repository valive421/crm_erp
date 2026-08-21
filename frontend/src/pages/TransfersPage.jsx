import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Table from '../components/Table'
import { statusClass } from '../utils/format'

const initialForm = { source_location_id: '', destination_location_id: '', item_id: '', batch_id: '', quantity: '' }
const formatQuantity = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value || 0))

export default function TransfersPage() {
  const { user } = useAuth()
  const [transfers, setTransfers] = useState([])
  const [locations, setLocations] = useState([])
  const [items, setItems] = useState([])
  const [batches, setBatches] = useState([])
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const canManage = ['ADMIN', 'OPERATIONS'].includes(user?.role)

  const load = async () => {
    setError('')
    try {
      const response = await api.get('/transfers')
      setTransfers(response.data.results || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load transfers.')
    }
  }

  useEffect(() => {
    Promise.all([api.get('/meta/locations'), api.get('/meta/items')])
      .then(([locationResponse, itemResponse]) => {
        setLocations(locationResponse.data.results || [])
        setItems(itemResponse.data.results || [])
      })
      .catch(() => setError('Could not load transfer form data.'))
    load()
  }, [])

  useEffect(() => {
    if (!form.item_id) {
      setBatches([])
      return
    }
    api.get(`/meta/batches?item_id=${form.item_id}`)
      .then((response) => setBatches(response.data.results || []))
      .catch(() => setError('Could not load item batches.'))
  }, [form.item_id])

  const createTransfer = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      await api.post('/transfers', {
        source_location_id: Number(form.source_location_id),
        destination_location_id: Number(form.destination_location_id),
        item_id: Number(form.item_id),
        batch_id: Number(form.batch_id),
        quantity: Number(form.quantity),
      })
      setForm(initialForm)
      setSuccess('Transfer request created.')
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not create transfer.')
    }
  }

  const transition = async (transfer, action) => {
    setError('')
    setSuccess('')
    try {
      await api.post(`/transfers/${transfer.id}/${action}`)
      setSuccess(`Transfer ${action === 'dispatch' ? 'dispatched' : 'received'} successfully.`)
      await load()
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Could not ${action} transfer.`)
    }
  }

  return (
    <div className="page-stack">
      <div className="panel header-row"><div><h2>Internal Transfers</h2><p>Move material between locations only through requested, dispatched, and received states.</p></div></div>
      {canManage ? (
        <form className="panel form-grid" onSubmit={createTransfer}>
          <h3>Request Transfer</h3>
          <label className="form-field"><span>Source location</span><select required value={form.source_location_id} onChange={(event) => setForm({ ...form, source_location_id: event.target.value })}><option value="">Select source</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label className="form-field"><span>Destination location</span><select required value={form.destination_location_id} onChange={(event) => setForm({ ...form, destination_location_id: event.target.value })}><option value="">Select destination</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label className="form-field"><span>Item</span><select required value={form.item_id} onChange={(event) => setForm({ ...form, item_id: event.target.value, batch_id: '' })}><option value="">Select item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>)}</select></label>
          <label className="form-field"><span>Batch</span><select required value={form.batch_id} onChange={(event) => setForm({ ...form, batch_id: event.target.value })}><option value="">Select batch</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batch_code}</option>)}</select></label>
          <label className="form-field"><span>Quantity</span><input required type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
          <button className="primary-button">Request transfer</button>
        </form>
      ) : null}
      {error ? <div className="error-banner">{error}</div> : null}
      {success ? <div className="success-banner">{success}</div> : null}
      <section className="panel">
        <Table
          columns={[
            { key: 'transfer_number', title: 'Transfer' },
            { key: 'item_name', title: 'Item', render: (row) => `${row.item_name} (${row.batch_code})` },
            { key: 'source_location_name', title: 'Source' },
            { key: 'destination_location_name', title: 'Destination' },
            { key: 'quantity', title: 'Qty', render: (row) => formatQuantity(row.quantity) },
            { key: 'status', title: 'Status', render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
            { key: 'actions', title: 'Actions', render: (row) => canManage && row.status !== 'RECEIVED' ? <div className="compact-actions">{row.status === 'REQUESTED' ? <button className="secondary-button" onClick={() => transition(row, 'dispatch')}>Dispatch</button> : <button className="primary-button" onClick={() => transition(row, 'receive')}>Receive</button>}</div> : '-' },
          ]}
          rows={transfers}
          emptyText="No transfers found."
        />
      </section>
    </div>
  )
}
