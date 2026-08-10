import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import Table from '../components/Table'
import { formatDate, statusClass } from '../utils/format'

export default function CustomersPage() {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ next: null, previous: null })

  const load = async () => {
    const params = new URLSearchParams()
    if (query) params.set('search', query)
    if (status) params.set('status', status)
    if (type) params.set('customer_type', type)
    params.set('page', String(page))
    const response = await api.get(`/customers/?${params.toString()}`)
    setItems(response.data.results || response.data.data || response.data)
    setMeta({ next: response.data.next, previous: response.data.previous })
  }

  useEffect(() => { load() }, [page])

  return (
    <div className="page-stack">
      <div className="panel header-row">
        <div>
          <h2>Customers</h2>
          <p>CRM records with search and filters.</p>
        </div>
        <Link className="primary-button" to="/customers/new">New Customer</Link>
      </div>

      <div className="filters-row panel">
        <input placeholder="Search name, mobile, email, business, GST" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All Types</option>
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="DISTRIBUTOR">Distributor</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button className="secondary-button" onClick={load}>Apply</button>
      </div>

      <div className="panel">
        <Table
          columns={[
            { key: 'name', title: 'Customer' },
            { key: 'mobile_number', title: 'Mobile' },
            { key: 'business_name', title: 'Business' },
            { key: 'status', title: 'Status', render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
            { key: 'created_at', title: 'Created', render: (row) => formatDate(row.created_at) },
            { key: 'actions', title: 'Actions', render: (row) => <Link to={`/customers/${row.id}`}>View</Link> },
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
