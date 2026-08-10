import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../services/api'
import Table from '../components/Table'
import { currency, formatDate, statusClass } from '../utils/format'

export default function ChallanDetailPage() {
  const { id } = useParams()
  const [challan, setChallan] = useState(null)
  const load = async () => {
    const response = await api.get(`/challans/${id}/`)
    setChallan(response.data.data || response.data)
  }

  useEffect(() => { load() }, [id])

  const confirm = async () => { await api.post(`/challans/${id}/confirm/`); await load() }
  const cancel = async () => { await api.post(`/challans/${id}/cancel/`); await load() }

  if (!challan) return <div className="panel">Loading challan...</div>

  return (
    <div className="page-stack">
      <div className="panel header-row">
        <div>
          <h2>{challan.challan_number}</h2>
          <p>{challan.customer_name}</p>
        </div>
        <div className={statusClass(challan.status)}>{challan.status}</div>
      </div>
      <div className="panel detail-grid">
        <div><strong>Total Qty</strong><span>{challan.total_quantity}</span></div>
        <div><strong>Created By</strong><span>{challan.created_by_username}</span></div>
        <div><strong>Created</strong><span>{formatDate(challan.created_at)}</span></div>
      </div>
      <div className="panel">
        <h3>Items</h3>
        <Table
          columns={[
            { key: 'product_name_snapshot', title: 'Product' },
            { key: 'sku_snapshot', title: 'SKU' },
            { key: 'quantity', title: 'Qty' },
            { key: 'unit_price_snapshot', title: 'Unit Price', render: (row) => currency(row.unit_price_snapshot) },
          ]}
          rows={challan.items || []}
        />
      </div>
      <div className="button-row">
        <button className="secondary-button" onClick={confirm}>Confirm</button>
        <button className="secondary-button" onClick={cancel}>Cancel</button>
      </div>
    </div>
  )
}
