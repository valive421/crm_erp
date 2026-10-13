import { query } from '../config/db.js'

function matches(message, terms) {
  return terms.some((term) => message.includes(term))
}

export async function getOperationsContext(message) {
  const normalized = message.toLowerCase()

  if (matches(normalized, ['low stock', 'low-stock', 'low on stock', 'stock alert', 'running out'])) {
    const result = await query(`
      SELECT name, sku, current_stock, minimum_stock_alert_quantity
      FROM products_product
      WHERE current_stock <= minimum_stock_alert_quantity
      ORDER BY current_stock ASC, name ASC
      LIMIT 20
    `)
    return { label: 'Low-stock products', rows: result.rows }
  }

  if (matches(normalized, ['active customer', 'active customers', 'customer count', 'customers'])) {
    const result = await query(`
      SELECT status, COUNT(*)::int AS count
      FROM customers_customer
      GROUP BY status
      ORDER BY status ASC
    `)
    return { label: 'Customer counts by status', rows: result.rows }
  }

  if (matches(normalized, ['latest challan', 'latest challans', 'recent challan', 'recent challans', 'confirmed challan', 'confirmed challans'])) {
    const result = await query(`
      SELECT sc.challan_number, c.name AS customer_name, sc.total_quantity, sc.status, sc.created_at
      FROM challans_saleschallan sc
      JOIN customers_customer c ON c.id = sc.customer_id
      ORDER BY sc.created_at DESC
      LIMIT 10
    `)
    return { label: 'Latest challans', rows: result.rows }
  }

  if (matches(normalized, ['highest stock', 'most stock', 'stock levels', 'current stock'])) {
    const result = await query(`
      SELECT name, sku, current_stock, minimum_stock_alert_quantity
      FROM products_product
      ORDER BY current_stock DESC, name ASC
      LIMIT 10
    `)
    return { label: 'Products with highest stock', rows: result.rows }
  }

  if (matches(normalized, ['inventory movement', 'inventory movements', 'stock movement', 'stock movements', 'today'])) {
    const result = await query(`
      SELECT p.name AS product_name, sm.movement_type, sm.quantity_changed, sm.reason, sm.created_at
      FROM inventory_stockmovement sm
      JOIN products_product p ON p.id = sm.product_id
      WHERE sm.created_at >= CURRENT_DATE
      ORDER BY sm.created_at DESC
      LIMIT 20
    `)
    return { label: 'Today\'s inventory movements', rows: result.rows }
  }

  return null
}
