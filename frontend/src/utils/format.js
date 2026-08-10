export const formatDate = (value) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export const currency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0))

export const statusClass = (status) => {
  const normalized = String(status || '').toUpperCase()
  if (['ACTIVE', 'CONFIRMED'].includes(normalized)) return 'status success'
  if (['DRAFT', 'LEAD'].includes(normalized)) return 'status warning'
  if (['INACTIVE', 'CANCELLED'].includes(normalized)) return 'status danger'
  return 'status neutral'
}
