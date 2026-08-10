import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'

const initial = {
  name: '', mobile_number: '', email: '', business_name: '', gst_number: '',
  customer_type: 'RETAIL', address: '', status: 'LEAD', follow_up_date: '', notes: '',
}

export default function CustomerFormPage({ mode }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')

  useEffect(() => {
    if (mode === 'edit' && id) {
      api.get(`/customers/${id}/`).then((response) => setForm({ ...initial, ...response.data.data || response.data }))
    }
  }, [mode, id])

  const onChange = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const payload = { ...form }
      if (mode === 'create') {
        await api.post('/customers/', payload)
      } else {
        await api.put(`/customers/${id}/`, payload)
      }
      navigate('/customers')
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.')
    }
  }

  return (
    <div className="panel form-panel">
      <h2>{mode === 'create' ? 'New Customer' : 'Edit Customer'}</h2>
      <form className="form-grid" onSubmit={submit}>
        {Object.entries(initial).map(([key]) => (
          <label key={key} className="form-field">
            <span>{key.replaceAll('_', ' ')}</span>
            {key === 'address' || key === 'notes' ? (
              <textarea value={form[key]} onChange={onChange(key)} rows={4} />
            ) : key === 'status' ? (
              <select value={form[key]} onChange={onChange(key)}>
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            ) : key === 'customer_type' ? (
              <select value={form[key]} onChange={onChange(key)}>
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </select>
            ) : (
              <input value={form[key]} onChange={onChange(key)} />
            )}
          </label>
        ))}
        {error ? <div className="error-banner">{error}</div> : null}
        <button className="primary-button">{mode === 'create' ? 'Create' : 'Update'}</button>
      </form>
    </div>
  )
}
