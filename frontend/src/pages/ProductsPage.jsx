import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import Table from '../components/Table'
import { currency, statusClass } from '../utils/format'

export default function ProductsPage() {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ next: null, previous: null })

  const load = async () => {
    const params = new URLSearchParams()
    if (query) params.set('search', query)
    if (lowStock) params.set('low_stock', 'true')
    params.set('page', String(page))
    const response = await api.get(`/products/?${params.toString()}`)
    setItems(response.data.results || response.data.data || response.data)
    setMeta({ next: response.data.next, previous: response.data.previous })
  }

  useEffect(() => { load() }, [page])

  return (
    <div className="page-stack">
      <div className="panel header-row">
        <div>
          <h2>Products</h2>
          <p>Catalog, stock and warehouse location.</p>
        </div>
        <Link className="primary-button" to="/products/new">New Product</Link>
      </div>
      <div className="filters-row panel">
        <input placeholder="Search product name or SKU" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="checkbox-row"><input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} /> Low stock only</label>
        <button className="secondary-button" onClick={load}>Apply</button>
      </div>
      <div className="panel">
        <Table
          columns={[
            { key: 'name', title: 'Product' },
            { key: 'sku', title: 'SKU' },
            { key: 'unit_price', title: 'Price', render: (row) => currency(row.unit_price) },
            { key: 'current_stock', title: 'Stock' },
            { key: 'minimum_stock_alert_quantity', title: 'Min' },
            { key: 'low_stock', title: 'Alert', render: (row) => <span className={statusClass(row.low_stock ? 'DRAFT' : 'CONFIRMED')}>{row.low_stock ? 'Low' : 'OK'}</span> },
            { key: 'actions', title: 'Actions', render: (row) => <Link to={`/products/${row.id}`}>View</Link> },
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
