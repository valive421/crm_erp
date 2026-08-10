import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { currency, statusClass } from '../utils/format'

export default function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)

  useEffect(() => {
    api.get(`/products/${id}/`).then((response) => setProduct(response.data.data || response.data))
  }, [id])

  if (!product) return <div className="panel">Loading product...</div>

  return (
    <div className="page-stack">
      <div className="panel header-row">
        <div>
          <h2>{product.name}</h2>
          <p>{product.sku}</p>
        </div>
        <Link className="secondary-button" to={`/products/${id}/edit`}>Edit</Link>
      </div>
      <div className="panel detail-grid">
        <div><strong>Price</strong><span>{currency(product.unit_price)}</span></div>
        <div><strong>Stock</strong><span>{product.current_stock}</span></div>
        <div><strong>Min Alert</strong><span>{product.minimum_stock_alert_quantity}</span></div>
        <div><strong>Category</strong><span>{product.category}</span></div>
        <div><strong>Warehouse</strong><span>{product.warehouse}</span></div>
        <div><strong>Low Stock</strong><span className={statusClass(product.low_stock ? 'DRAFT' : 'CONFIRMED')}>{product.low_stock ? 'Yes' : 'No'}</span></div>
      </div>
    </div>
  )
}
