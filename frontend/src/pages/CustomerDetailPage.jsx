import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../services/api'
import Table from '../components/Table'
import { formatDate, statusClass } from '../utils/format'

export default function CustomerDetailPage() {
  const { id } = useParams()
  const [customer, setCustomer] = useState(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const response = await api.get(`/customers/${id}/`)
    setCustomer(response.data.data || response.data)
  }

  useEffect(() => { load() }, [id])

  const addFollowUp = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post(`/customers/${id}/follow-ups/`, { note })
      setNote('')
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add follow-up.')
    }
  }

  if (!customer) return <div className="panel">Loading customer...</div>

  return (
    <div className="page-stack">
      <div className="panel header-row">
        <div>
          <h2>{customer.name}</h2>
          <p>{customer.business_name}</p>
        </div>
        <Link className="secondary-button" to={`/customers/${id}/edit`}>Edit</Link>
      </div>

      <div className="panel detail-grid">
        <div><strong>Status</strong><span className={statusClass(customer.status)}>{customer.status}</span></div>
        <div><strong>Mobile</strong><span>{customer.mobile_number}</span></div>
        <div><strong>Email</strong><span>{customer.email || '-'}</span></div>
        <div><strong>GST</strong><span>{customer.gst_number || '-'}</span></div>
        <div><strong>Type</strong><span>{customer.customer_type}</span></div>
        <div><strong>Follow-up</strong><span>{customer.follow_up_date || '-'}</span></div>
      </div>

      <form className="panel" onSubmit={addFollowUp}>
        <h3>Add Follow-up</h3>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
        {error ? <div className="error-banner">{error}</div> : null}
        <button className="primary-button">Save Note</button>
      </form>

      <div className="panel">
        <h3>Follow-up Notes</h3>
        <Table
          columns={[
            { key: 'note', title: 'Note' },
            { key: 'created_at', title: 'Time', render: (row) => formatDate(row.created_at) },
          ]}
          rows={customer.follow_ups || []}
        />
      </div>
    </div>
  )
}
