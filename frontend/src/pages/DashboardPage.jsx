import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import StatCard from '../components/StatCard'
import Table from '../components/Table'
import { currency, formatDate, statusClass } from '../utils/format'

export default function DashboardPage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/dashboard/').then((response) => setData(response.data.data))
  }, [])

  if (!data) {
    return <div className="panel">Loading dashboard...</div>
  }

  const stats = data.stats

  return (
    <div className="page-stack">
      <div className="stats-grid">
        <StatCard label="Total Customers" value={stats.total_customers} />
        <StatCard label="Active Customers" value={stats.active_customers} />
        <StatCard label="Total Products" value={stats.total_products} />
        <StatCard label="Low Stock Products" value={stats.low_stock_products} accent="var(--danger)" />
        <StatCard label="Draft Challans" value={stats.draft_challans} accent="var(--warning)" />
        <StatCard label="Confirmed Challans" value={stats.confirmed_challans} accent="var(--success)" />
      </div>

      <div className="grid-two">
        <section className="panel">
          <div className="section-header">
            <h2>Recent Customers</h2>
            <Link to="/customers">View all</Link>
          </div>
          <Table
            columns={[
              { key: 'name', title: 'Name' },
              { key: 'mobile_number', title: 'Mobile' },
              { key: 'status', title: 'Status', render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
              { key: 'created_at', title: 'Created', render: (row) => formatDate(row.created_at) },
            ]}
            rows={data.recent_customers}
          />
        </section>

        <section className="panel">
          <div className="section-header">
            <h2>Recent Challans</h2>
            <Link to="/challans">View all</Link>
          </div>
          <Table
            columns={[
              { key: 'challan_number', title: 'Challan' },
              { key: 'customer__name', title: 'Customer' },
              { key: 'total_quantity', title: 'Qty' },
              { key: 'status', title: 'Status', render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
            ]}
            rows={data.recent_challans}
          />
        </section>
      </div>

      <div className="grid-two">
        <section className="panel">
          <h2>Low Stock Products</h2>
          <Table
            columns={[
              { key: 'name', title: 'Product' },
              { key: 'sku', title: 'SKU' },
              { key: 'current_stock', title: 'Stock' },
              { key: 'minimum_stock_alert_quantity', title: 'Min' },
            ]}
            rows={data.low_stock_products}
          />
        </section>

        <section className="panel">
          <h2>Recent Stock Movements</h2>
          <Table
            columns={[
              { key: 'product__name', title: 'Product' },
              { key: 'quantity_changed', title: 'Qty' },
              { key: 'movement_type', title: 'Type' },
              { key: 'created_at', title: 'Time', render: (row) => formatDate(row.created_at) },
            ]}
            rows={data.recent_stock_movements}
          />
        </section>
      </div>
    </div>
  )
}
