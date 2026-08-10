import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import Table from '../components/Table'
import { formatDate, statusClass } from '../utils/format'

export default function ChallansPage() {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ next: null, previous: null })

  const load = async () => {
    const params = new URLSearchParams()
    if (query) params.set('search', query)
    if (status) params.set('status', status)
    params.set('page', String(page))
    const response = await api.get(`/challans/?${params.toString()}`)
    setItems(response.data.results || response.data.data || response.data)
    setMeta({ next: response.data.next, previous: response.data.previous })
  }

  useEffect(() => {
    load()
  }, [page])

  return (
    <div className="page-stack">
      <div className="panel header-row">
        <div>
          <h2>Sales Challans</h2>
          <p>Draft and confirmed sales documents.</p>
        </div>
        <Link className="primary-button" to="/challans/new">New Challan</Link>
      </div>
      <div className="filters-row panel">
        <input placeholder="Search challan number or customer" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button className="secondary-button" onClick={load}>Apply</button>
      </div>
      <div className="panel">
        <Table
          columns={[
            { key: 'challan_number', title: 'Challan #' },
            { key: 'customer_name', title: 'Customer', render: (row) => row.customer_name || row.customer?.name },
            { key: 'total_quantity', title: 'Qty' },
            { key: 'status', title: 'Status', render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
            { key: 'created_at', title: 'Created', render: (row) => formatDate(row.created_at) },
            { key: 'actions', title: 'Actions', render: (row) => <Link to={`/challans/${row.id}`}>Open</Link> },
          ]}
          rows={items}
        />
        <div className="button-row" style={{ marginTop: '1rem' }}>
          <button className="secondary-button" disabled={!meta.previous} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <button className="secondary-button" disabled={!meta.next} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}
